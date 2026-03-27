import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, hasMinRole } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user.role, "security:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgId = session.user.organizationId;

  try {
    const searchParams = request.nextUrl.searchParams;
    const severity = searchParams.get("severity");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {
      organizationId: orgId,
    };

    if (
      severity &&
      ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(severity)
    ) {
      where.severity = severity;
    }

    if (
      status &&
      ["OPEN", "INVESTIGATING", "RESOLVED", "DISMISSED"].includes(status)
    ) {
      where.status = status;
    }

    const alerts = await prisma.securityAlert.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ alerts });
  } catch (error) {
    console.error("Error fetching alerts:", error);
    return NextResponse.json(
      { error: "Failed to fetch alerts" },
      { status: 500 }
    );
  }
}

const patchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["INVESTIGATING", "RESOLVED", "DISMISSED"]),
});

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only managers and admins can update alert status
  if (!hasMinRole(session.user.role, "MANAGER")) {
    return NextResponse.json(
      { error: "Forbidden: requires MANAGER role or above" },
      { status: 403 }
    );
  }

  if (!hasPermission(session.user.role, "security:read")) {
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

    const { id, status } = parsed.data;

    // Verify alert belongs to the same org
    const existing = await prisma.securityAlert.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = { status };

    if (status === "RESOLVED") {
      updateData.resolvedBy = session.user.id;
      updateData.resolvedAt = new Date();
    }

    const alert = await prisma.securityAlert.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({ alert });
  } catch (error) {
    console.error("Error updating alert:", error);
    return NextResponse.json(
      { error: "Failed to update alert" },
      { status: 500 }
    );
  }
}
