import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import type { Role } from "@/generated/prisma";
import { isEmailAllowed } from "@/lib/allowlist";

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
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email as string;

        // Check allowlist before authenticating
        const { allowed } = await isEmailAllowed(email);
        if (!allowed) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          include: { organization: true },
        });

        if (!user || !user.passwordHash) return null;
        if (user.status !== "ACTIVE") return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
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
      if (account?.provider === "github" && user.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
        });
        if (!existingUser) {
          // Create a new organization for GitHub OAuth users
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
          where: account?.provider === "github"
            ? { email: user.email! }
            : { id: user.id },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.organizationId = dbUser.organizationId;
          token.userId = dbUser.id;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.userId as string;
        session.user.role = token.role as Role;
        session.user.organizationId = token.organizationId as string;
      }
      return session;
    },
  },
});
