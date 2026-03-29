import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const updateDeviceSchema = z.object({
  deviceOwnership: z.enum(["BUSINESS", "CONTRACTOR", "BYOD"]).optional(),
});

// PATCH - Update device settings (ownership, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user.role, "security:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const orgId = session.user.organizationId;

  try {
    const existing = await prisma.agentDevice.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateDeviceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const device = await prisma.agentDevice.update({
      where: { id },
      data: parsed.data,
      select: {
        id: true,
        hostname: true,
        platform: true,
        status: true,
        deviceOwnership: true,
        userId: true,
        lastSeenAt: true,
      },
    });

    // Log ownership change
    if (parsed.data.deviceOwnership && parsed.data.deviceOwnership !== existing.deviceOwnership) {
      await prisma.monitoringChangeLog.create({
        data: {
          organizationId: orgId,
          userId: existing.userId,
          changedById: session.user.id,
          field: "deviceOwnership",
          oldValue: existing.deviceOwnership,
          newValue: parsed.data.deviceOwnership,
        },
      });
    }

    return NextResponse.json({ device });
  } catch (error) {
    console.error("Error updating device:", error);
    return NextResponse.json({ error: "Failed to update device" }, { status: 500 });
  }
}
