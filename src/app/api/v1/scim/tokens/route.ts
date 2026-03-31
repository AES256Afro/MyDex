import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasMinRole } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";

// GET - list SCIM tokens (masked)
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasMinRole(session.user.role, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgId = session.user.organizationId;
  const tokens = await prisma.scimToken.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    tokens: tokens.map((t) => ({
      id: t.id,
      provider: t.provider,
      description: t.description,
      isActive: t.isActive,
      lastUsedAt: t.lastUsedAt,
      createdAt: t.createdAt,
      tokenPreview: `scim_${t.token.slice(-8)}`,
    })),
  });
}

const createSchema = z.object({
  provider: z.enum(["slack", "teams"]),
  description: z.string().max(200).optional(),
});

// POST - create a new SCIM token
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasMinRole(session.user.role, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgId = session.user.organizationId;
  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 });
  }

  const { provider, description } = parsed.data;
  const token = `scim_${randomBytes(32).toString("hex")}`;

  // Upsert — one token per org+provider
  const scimToken = await prisma.scimToken.upsert({
    where: { organizationId_provider: { organizationId: orgId, provider } },
    create: {
      organizationId: orgId,
      provider,
      token,
      description: description || `${provider.charAt(0).toUpperCase() + provider.slice(1)} SCIM Token`,
    },
    update: {
      token,
      description: description || undefined,
      isActive: true,
    },
  });

  return NextResponse.json({
    id: scimToken.id,
    provider: scimToken.provider,
    token, // Only shown once on creation
    description: scimToken.description,
    message: "Save this token — it will not be shown again.",
  }, { status: 201 });
}

const deleteSchema = z.object({ id: z.string() });

// DELETE - revoke a SCIM token
export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasMinRole(session.user.role, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgId = session.user.organizationId;
  const body = await request.json();
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const existing = await prisma.scimToken.findFirst({
    where: { id: parsed.data.id, organizationId: orgId },
  });
  if (!existing) return NextResponse.json({ error: "Token not found" }, { status: 404 });

  await prisma.scimToken.delete({ where: { id: parsed.data.id } });
  return NextResponse.json({ success: true });
}
