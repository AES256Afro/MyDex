import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { registerSchema } from "@/lib/validators/auth";
import { isEmailAllowed, needsApproval } from "@/lib/allowlist";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { sendWelcomeEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  // Rate limit registration
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateCheck = checkRateLimit(`register:${ip}`, RATE_LIMITS.register);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Too many registration attempts. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const validated = registerSchema.parse(body);

    // Check allowlist before anything else
    const { allowed, reason } = await isEmailAllowed(validated.email);
    if (!allowed) {
      return NextResponse.json(
        { error: reason || "Registration not allowed for this email" },
        { status: 403 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: validated.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    const slug = validated.orgName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const existingOrg = await prisma.organization.findUnique({
      where: { slug },
    });

    if (existingOrg) {
      return NextResponse.json(
        { error: "Organization name already taken" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(validated.password, 12);

    // If approval is required, create user as INACTIVE
    const requiresApproval = await needsApproval();

    const org = await prisma.organization.create({
      data: {
        name: validated.orgName,
        slug,
        users: {
          create: {
            email: validated.email,
            name: validated.name,
            passwordHash,
            role: "ADMIN",
            status: requiresApproval ? "INACTIVE" : "ACTIVE",
          },
        },
      },
      include: { users: true },
    });

    if (requiresApproval) {
      return NextResponse.json(
        { message: "Registration submitted. Awaiting admin approval.", organizationId: org.id, pendingApproval: true },
        { status: 201 }
      );
    }

    // Send welcome email (fire and forget - don't block registration)
    const user = org.users[0];
    const loginUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/login`;
    sendWelcomeEmail({
      to: user.email,
      name: user.name || user.email,
      organizationName: org.name,
      loginUrl,
    }).catch((err) => console.error("[register] Welcome email failed:", err));

    return NextResponse.json(
      { message: "Organization created", organizationId: org.id },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
