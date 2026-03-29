import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const updateSchema = z.object({
  requireAgentForClock: z.boolean().optional(),
  defaultMonitoringMode: z.enum(["ALWAYS", "CLOCKED_IN_ONLY", "USER_CONTROLLED"]).optional(),
});

// GET - Fetch org monitoring settings
export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user.role, "settings:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const org = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      select: {
        requireAgentForClock: true,
        defaultMonitoringMode: true,
      },
    });

    return NextResponse.json({ settings: org });
  } catch (error) {
    console.error("Error fetching monitoring settings:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

// PATCH - Update org monitoring settings
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user.role, "settings:write")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const org = await prisma.organization.update({
      where: { id: session.user.organizationId },
      data: parsed.data,
      select: {
        requireAgentForClock: true,
        defaultMonitoringMode: true,
      },
    });

    // Log the change
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        organizationId: session.user.organizationId,
        action: "monitoring_settings_update",
        resource: "organization",
        resourceId: session.user.organizationId,
        details: parsed.data,
      },
    });

    return NextResponse.json({ settings: org });
  } catch (error) {
    console.error("Error updating monitoring settings:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
