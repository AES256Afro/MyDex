import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import type { Role } from "@/generated/prisma";
import { isEmailAllowed } from "@/lib/allowlist";
import { isMfaEnabled } from "@/lib/mfa";
import { recordLoginAttempt, isLoginAllowed, isAccountLocked } from "@/lib/login-audit";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
    // Microsoft Entra ID (Azure AD) — enabled via env vars or SSO config
    ...(process.env.AZURE_AD_CLIENT_ID
      ? [
          MicrosoftEntraID({
            clientId: process.env.AZURE_AD_CLIENT_ID!,
            clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
            issuer: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID || "common"}/v2.0`,
          }),
        ]
      : []),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email as string;
        const ip =
          (request?.headers as Headers)?.get?.("x-forwarded-for")?.split(",")[0]?.trim() ||
          "unknown";
        const userAgent = (request?.headers as Headers)?.get?.("user-agent") || "";

        // Rate limiting
        const rateCheck = isLoginAllowed(email, ip);
        if (!rateCheck.allowed) {
          await recordLoginAttempt({
            email,
            ipAddress: ip,
            userAgent,
            success: false,
            failureReason: "rate_limited",
          });
          return null;
        }

        // Account lockout check
        const locked = await isAccountLocked(email);
        if (locked) {
          await recordLoginAttempt({
            email,
            ipAddress: ip,
            userAgent,
            success: false,
            failureReason: "account_locked",
          });
          return null;
        }

        // Check allowlist before authenticating
        const { allowed } = await isEmailAllowed(email);
        if (!allowed) {
          await recordLoginAttempt({
            email,
            ipAddress: ip,
            userAgent,
            success: false,
            failureReason: "not_allowed",
          });
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email },
          include: { organization: true },
        });

        if (!user || !user.passwordHash) {
          await recordLoginAttempt({
            email,
            ipAddress: ip,
            userAgent,
            success: false,
            failureReason: "user_not_found",
          });
          return null;
        }
        if (user.status !== "ACTIVE") {
          await recordLoginAttempt({
            email,
            ipAddress: ip,
            userAgent,
            success: false,
            failureReason: "user_inactive",
          });
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!isValid) {
          await recordLoginAttempt({
            email,
            ipAddress: ip,
            userAgent,
            success: false,
            failureReason: "invalid_password",
          });
          return null;
        }

        // Check if MFA is enabled
        const mfaRequired = await isMfaEnabled(user.id);

        // Record successful auth (MFA may still be pending)
        await recordLoginAttempt({
          email,
          ipAddress: ip,
          userAgent,
          success: true,
          mfaRequired,
          mfaPassed: !mfaRequired, // Not yet passed if required
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          mfaRequired,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;

      // Check allowlist for all sign-in methods
      const { allowed } = await isEmailAllowed(user.email);
      if (!allowed) return false;

      // For OAuth sign-ins, auto-create org if user doesn't exist yet
      if (account?.provider === "github" || account?.provider === "microsoft-entra-id") {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
        });
        if (!existingUser) {
          // Check for SSO auto-provisioning
          const ssoConfig = await prisma.ssoProvider.findFirst({
            where: {
              isActive: true,
              autoProvision: true,
              providerType: account.provider === "github" ? "GITHUB" : "MICROSOFT_ENTRA",
            },
          });

          if (ssoConfig) {
            // JIT provisioning into the SSO provider's org
            await prisma.user.create({
              data: {
                email: user.email,
                name: user.name || user.email.split("@")[0],
                image: user.image,
                role: ssoConfig.defaultRole,
                organizationId: ssoConfig.organizationId,
              },
            });
          } else {
            // Create a new organization for OAuth users
            const slug = (user.name || user.email.split("@")[0])
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "");
            const uniqueSlug = `${slug}-${Date.now().toString(36)}`;
            await prisma.organization.create({
              data: {
                name: `${user.name || "My"}'s Organization`,
                slug: uniqueSlug,
                users: {
                  create: {
                    email: user.email,
                    name: user.name || user.email.split("@")[0],
                    image: user.image,
                    role: "ADMIN",
                  },
                },
              },
            });
          }
        } else {
          // Existing user — check if active
          if (existingUser.status !== "ACTIVE") return false;
        }
      }

      // For credentials, also verify the user is active
      if (account?.provider === "credentials") {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
        });
        if (dbUser && dbUser.status !== "ACTIVE") return false;
      }

      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        // For OAuth users, look up by email since adapter may create a separate user record
        const dbUser = await prisma.user.findFirst({
          where:
            account?.provider === "github" || account?.provider === "microsoft-entra-id"
              ? { email: user.email! }
              : { id: user.id },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.organizationId = dbUser.organizationId;
          token.userId = dbUser.id;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token.mfaRequired = (user as any).mfaRequired || false;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.userId as string;
        session.user.role = token.role as Role;
        session.user.organizationId = token.organizationId as string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as any).mfaRequired = token.mfaRequired || false;
      }
      return session;
    },
  },
});
