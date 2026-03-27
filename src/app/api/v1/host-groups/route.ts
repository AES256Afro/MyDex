import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  color: z.string().optional(),
  departmentId: z.string().optional(),
  deviceIds: z.array(z.string()).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "security:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgId = session.user.organizationId;

  try {
    const hostGroups = await prisma.hostGroup.findMany({
      where: { organizationId: orgId },
      include: {
        department: { select: { id: true, name: true } },
        members: {
          include: {
            device: { select: { id: true, hostname: true, status: true, ipAddress: true, platform: true } },
          },
        },
        policies: {
          include: {
            blocklist: { select: { id: true, name: true, category: true } },
          },
        },
        _count: { select: { members: true, policies: true } },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ hostGroups });
  } catch (error) {
    console.error("Error fetching host groups:", error);
    return NextResponse.json({ error: "Failed to fetch host groups" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "security:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgId = session.user.organizationId;

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 });
    }

    const { name, description, color, departmentId, deviceIds } = parsed.data;

    const hostGroup = await prisma.hostGroup.create({
      data: {
        organizationId: orgId,
        name,
        description,
        color: color || null,
        departmentId: departmentId || null,
        members: deviceIds && deviceIds.length > 0
          ? { create: deviceIds.map((deviceId) => ({ deviceId })) }
          : undefined,
      },
      include: {
        members: { include: { device: { select: { id: true, hostname: true } } } },
        _count: { select: { members: true, policies: true } },
      },
    });

    return NextResponse.json({ hostGroup }, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && (error as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "Host group name already exists" }, { status: 409 });
    }
    console.error("Error creating host group:", error);
    return NextResponse.json({ error: "Failed to create host group" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "security:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgId = session.user.organizationId;

  try {
    const body = await request.json();
    const { id, deviceIds, ...updates } = body;
    if (!id) return NextResponse.json({ error: "Host group ID required" }, { status: 400 });

    // Update the host group
    const hostGroup = await prisma.hostGroup.update({
      where: { id, organizationId: orgId },
      data: updates,
    });

    // If deviceIds provided, sync membership
    if (Array.isArray(deviceIds)) {
      // Remove all existing members
      await prisma.hostGroupMember.deleteMany({ where: { hostGroupId: id } });
      // Add new members
      if (deviceIds.length > 0) {
        await prisma.hostGroupMember.createMany({
          data: deviceIds.map((deviceId: string) => ({ hostGroupId: id, deviceId })),
        });
      }
    }

    return NextResponse.json({ hostGroup });
  } catch (error) {
    console.error("Error updating host group:", error);
    return NextResponse.json({ error: "Failed to update host group" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "security:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgId = session.user.organizationId;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Host group ID required" }, { status: 400 });

    await prisma.hostGroup.delete({
      where: { id, organizationId: orgId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting host group:", error);
    return NextResponse.json({ error: "Failed to delete host group" }, { status: 500 });
  }
}
