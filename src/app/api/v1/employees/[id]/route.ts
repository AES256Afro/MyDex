import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const updateEmployeeSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  role: z.enum(["EMPLOYEE", "MANAGER", "ADMIN"]).optional(),
  department: z.string().max(100).nullable().optional(),
  jobTitle: z.string().max(100).nullable().optional(),
  managerId: z.string().nullable().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
  monitoringMode: z.enum(["ALWAYS", "CLOCKED_IN_ONLY", "USER_CONTROLLED"]).optional(),
  canToggleMonitoring: z.boolean().optional(),
  monitoringPaused: z.boolean().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user.role, "employees:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const orgId = session.user.organizationId;

  try {
    const employee = await prisma.user.findFirst({
      where: { id, organizationId: orgId },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        status: true,
        department: true,
        jobTitle: true,
        managerId: true,
        monitoringMode: true,
        monitoringPaused: true,
        monitoringPausedAt: true,
        canToggleMonitoring: true,
        createdAt: true,
        updatedAt: true,
        manager: { select: { id: true, name: true } },
        agentDevices: {
          select: { id: true, hostname: true, status: true, deviceOwnership: true, lastSeenAt: true },
        },
        directReports: {
          select: { id: true, name: true, role: true, status: true },
        },
        _count: {
          select: {
            timeEntries: true,
            attendanceRecords: true,
            leaveRequests: true,
          },
        },
      },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ employee });
  } catch (error) {
    console.error("Error fetching employee:", error);
    return NextResponse.json(
      { error: "Failed to fetch employee" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user.role, "employees:write")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const orgId = session.user.organizationId;

  try {
    // Verify employee exists in the org
    const existing = await prisma.user.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    // Prevent modifying SUPER_ADMIN users unless caller is also SUPER_ADMIN
    if (
      existing.role === "SUPER_ADMIN" &&
      session.user.role !== "SUPER_ADMIN"
    ) {
      return NextResponse.json(
        { error: "Cannot modify a Super Admin" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = updateEmployeeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updates = parsed.data;

    // Validate managerId if provided
    if (updates.managerId) {
      if (updates.managerId === id) {
        return NextResponse.json(
          { error: "Employee cannot be their own manager" },
          { status: 400 }
        );
      }
      const manager = await prisma.user.findFirst({
        where: { id: updates.managerId, organizationId: orgId },
      });
      if (!manager) {
        return NextResponse.json(
          { error: "Manager not found in organization" },
          { status: 400 }
        );
      }
    }

    // Track monitoring field changes for change log
    const monitoringFields = ["monitoringMode", "canToggleMonitoring", "monitoringPaused"] as const;
    const changeLogs: { field: string; oldValue: string | null; newValue: string }[] = [];

    for (const field of monitoringFields) {
      if (updates[field] !== undefined) {
        changeLogs.push({
          field,
          oldValue: String(existing[field]),
          newValue: String(updates[field]),
        });
      }
    }

    // Handle monitoringPausedAt
    const data: Record<string, unknown> = { ...updates };
    if (updates.monitoringPaused === true) {
      data.monitoringPausedAt = new Date();
    } else if (updates.monitoringPaused === false) {
      data.monitoringPausedAt = null;
    }

    const employee = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        status: true,
        department: true,
        jobTitle: true,
        managerId: true,
        monitoringMode: true,
        monitoringPaused: true,
        canToggleMonitoring: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Write monitoring change logs
    if (changeLogs.length > 0) {
      await prisma.monitoringChangeLog.createMany({
        data: changeLogs.map((log) => ({
          organizationId: orgId,
          userId: id,
          changedById: session.user.id,
          field: log.field,
          oldValue: log.oldValue,
          newValue: log.newValue,
        })),
      });
    }

    return NextResponse.json({ employee });
  } catch (error) {
    console.error("Error updating employee:", error);
    return NextResponse.json(
      { error: "Failed to update employee" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user.role, "employees:write")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const orgId = session.user.organizationId;

  try {
    const existing = await prisma.user.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    // Prevent deactivating yourself
    if (id === session.user.id) {
      return NextResponse.json(
        { error: "Cannot deactivate your own account" },
        { status: 400 }
      );
    }

    // Prevent deactivating SUPER_ADMIN unless caller is SUPER_ADMIN
    if (
      existing.role === "SUPER_ADMIN" &&
      session.user.role !== "SUPER_ADMIN"
    ) {
      return NextResponse.json(
        { error: "Cannot deactivate a Super Admin" },
        { status: 403 }
      );
    }

    // Soft-delete: deactivate instead of hard delete
    const employee = await prisma.user.update({
      where: { id },
      data: { status: "INACTIVE" },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
      },
    });

    return NextResponse.json({
      message: "Employee deactivated",
      employee,
    });
  } catch (error) {
    console.error("Error deactivating employee:", error);
    return NextResponse.json(
      { error: "Failed to deactivate employee" },
      { status: 500 }
    );
  }
}
