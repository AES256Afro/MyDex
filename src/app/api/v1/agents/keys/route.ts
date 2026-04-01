import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const createKeySchema = z.object({
  name: z.string().min(1),
  deviceId: z.string().optional(),
  permissions: z.array(z.string()).optional(),
  expiresInDays: z.number().positive().optional(),
});

const deleteKeySchema = z.object({
  id: z.string().min(1),
});

// GET - List all agent API keys for the org
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "security:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgId = session.user.organizationId;

  try {
    const keys = await prisma.agentApiKey.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        deviceId: true,
        permissions: true,
        isActive: true,
        expiresAt: true,
        lastUsedAt: true,
        revokedAt: true,
        createdBy: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ keys });
  } catch (error) {
    console.error("Error fetching API keys:", error);
    return NextResponse.json(
      { error: "Failed to fetch API keys" },
      { status: 500 }
    );
  }
}

// POST - Generate a new API key
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "security:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = createKeySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const orgId = session.user.organizationId;

    // Generate random API key with mdx_ prefix
    const randomBytes = crypto.randomBytes(32).toString("hex");
    const plainTextKey = `mdx_${randomBytes}`;
    const keyPrefix = plainTextKey.slice(0, 8);

    // Hash the key for storage
    const keyHash = await bcrypt.hash(plainTextKey, 12);

    // Calculate expiration
    const expiresAt = parsed.data.expiresInDays
      ? new Date(Date.now() + parsed.data.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const key = await prisma.agentApiKey.create({
      data: {
        organizationId: orgId,
        name: parsed.data.name,
        deviceId: parsed.data.deviceId || null,
        keyHash,
        keyPrefix,
        permissions: parsed.data.permissions || [],
        isActive: true,
        expiresAt,
        createdBy: session.user.id,
      },
    });

    // Return the plaintext key ONCE — it cannot be retrieved again
    return NextResponse.json(
      {
        id: key.id,
        name: key.name,
        apiKey: plainTextKey,
        keyPrefix,
        permissions: key.permissions,
        expiresAt: key.expiresAt,
        createdAt: key.createdAt,
        warning: "Store this key securely. It cannot be retrieved again.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating API key:", error);
    return NextResponse.json(
      { error: "Failed to create API key" },
      { status: 500 }
    );
  }
}

// DELETE - Revoke an API key by id
export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "security:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = deleteKeySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const orgId = session.user.organizationId;

    const key = await prisma.agentApiKey.update({
      where: {
        id: parsed.data.id,
        organizationId: orgId,
      },
      data: {
        isActive: false,
        revokedAt: new Date(),
      },
    });

    return NextResponse.json({
      id: key.id,
      name: key.name,
      isActive: key.isActive,
      revokedAt: key.revokedAt,
    });
  } catch (error) {
    console.error("Error revoking API key:", error);
    return NextResponse.json(
      { error: "Failed to revoke API key" },
      { status: 500 }
    );
  }
}
