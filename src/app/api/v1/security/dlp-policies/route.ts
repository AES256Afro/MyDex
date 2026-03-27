import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, hasMinRole } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user.role, "security:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgId = session.user.organizationId;

  try {
    const policies = await prisma.dlpPolicy.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ policies });
  } catch (error) {
    console.error("Error fetching DLP policies:", error);
    return NextResponse.json(
      { error: "Failed to fetch policies" },
      { status: 500 }
    );
  }
}

const createSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  rules: z.unknown(),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Admins only
  if (!hasMinRole(session.user.role, "ADMIN")) {
    return NextResponse.json(
      { error: "Forbidden: requires ADMIN role" },
      { status: 403 }
    );
  }

  const orgId = session.user.organizationId;

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, description, rules } = parsed.data;

    const policy = await prisma.dlpPolicy.create({
      data: {
        organizationId: orgId,
        name,
        description,
        rules: rules as object,
      },
    });

    return NextResponse.json({ policy }, { status: 201 });
  } catch (error) {
    console.error("Error creating DLP policy:", error);
    return NextResponse.json(
      { error: "Failed to create policy" },
      { status: 500 }
    );
  }
}

const patchSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  rules: z.unknown().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user.role, "security:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgId = session.user.organizationId;

  try {
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { id, ...updateFields } = parsed.data;

    // Verify policy belongs to the same org
    const existing = await prisma.dlpPolicy.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Policy not found" },
        { status: 404 }
      );
    }

    const data: Record<string, unknown> = {};
    if (updateFields.name !== undefined) data.name = updateFields.name;
    if (updateFields.description !== undefined)
      data.description = updateFields.description;
    if (updateFields.rules !== undefined)
      data.rules = updateFields.rules as object;
    if (updateFields.isActive !== undefined)
      data.isActive = updateFields.isActive;

    const policy = await prisma.dlpPolicy.update({
      where: { id },
      data,
    });

    return NextResponse.json({ policy });
  } catch (error) {
    console.error("Error updating DLP policy:", error);
    return NextResponse.json(
      { error: "Failed to update policy" },
      { status: 500 }
    );
  }
}

const deleteSchema = z.object({
  id: z.string().min(1),
});

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user.role, "security:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgId = session.user.organizationId;

  try {
    const body = await request.json();
    const parsed = deleteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { id } = parsed.data;

    // Verify policy belongs to the same org
    const existing = await prisma.dlpPolicy.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Policy not found" },
        { status: 404 }
      );
    }

    await prisma.dlpPolicy.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting DLP policy:", error);
    return NextResponse.json(
      { error: "Failed to delete policy" },
      { status: 500 }
    );
  }
}
