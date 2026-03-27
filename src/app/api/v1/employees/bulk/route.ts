import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const bulkActionSchema = z.object({
  userIds: z.array(z.string()).min(1).max(500),
  action: z.enum([
    "assign_role",
    "assign_department",
    "change_status",
    "assign_host_group",
    "assign_policy",
  ]),
  value: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user.role, "employees:write")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgId = session.user.organizationId;

  try {
    const body = await request.json();
    const parsed = bulkActionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { userIds, action, value } = parsed.data;
    let updated = 0;
    const errors: string[] = [];

    // Verify all userIds belong to this organization
    const users = await prisma.user.findMany({
      where: { id: { in: userIds }, organizationId: orgId },
      select: { id: true, role: true },
    });

    const validUserIds = users.map((u) => u.id);
    const invalidCount = userIds.length - validUserIds.length;
    if (invalidCount > 0) {
      errors.push(`${invalidCount} user(s) not found in organization`);
    }

    if (validUserIds.length === 0) {
      return NextResponse.json(
        { error: "No valid users found", updated: 0, errors },
        { status: 400 }
      );
    }

    // Filter out SUPER_ADMIN users (cannot be modified unless caller is SUPER_ADMIN)
    const modifiableUserIds = users
      .filter(
        (u) =>
          u.role !== "SUPER_ADMIN" || session.user.role === "SUPER_ADMIN"
      )
      .map((u) => u.id);

    const skippedSuperAdmins = validUserIds.length - modifiableUserIds.length;
    if (skippedSuperAdmins > 0) {
      errors.push(
        `${skippedSuperAdmins} Super Admin user(s) skipped (insufficient permissions)`
      );
    }

    // Filter out the current user for status/role changes to prevent self-lockout
    const safeUserIds = modifiableUserIds.filter(
      (id) => id !== session.user.id
    );
    if (
      (action === "change_status" || action === "assign_role") &&
      modifiableUserIds.length !== safeUserIds.length
    ) {
      errors.push("Cannot modify your own role/status via bulk action");
    }

    switch (action) {
      case "assign_role": {
        const validRoles = ["EMPLOYEE", "MANAGER", "ADMIN"];
        if (!validRoles.includes(value)) {
          return NextResponse.json(
            { error: `Invalid role: ${value}` },
            { status: 400 }
          );
        }

        const result = await prisma.user.updateMany({
          where: { id: { in: safeUserIds } },
          data: { role: value as "EMPLOYEE" | "MANAGER" | "ADMIN" },
        });
        updated = result.count;
        break;
      }

      case "assign_department": {
        // value is a department ID — look up the department name
        const department = await prisma.department.findFirst({
          where: { id: value, organizationId: orgId },
        });

        if (!department) {
          return NextResponse.json(
            { error: "Department not found" },
            { status: 400 }
          );
        }

        const result = await prisma.user.updateMany({
          where: { id: { in: modifiableUserIds } },
          data: { department: department.name },
        });
        updated = result.count;
        break;
      }

      case "change_status": {
        const validStatuses = ["ACTIVE", "INACTIVE", "SUSPENDED"];
        if (!validStatuses.includes(value)) {
          return NextResponse.json(
            { error: `Invalid status: ${value}` },
            { status: 400 }
          );
        }

        const result = await prisma.user.updateMany({
          where: { id: { in: safeUserIds } },
          data: {
            status: value as "ACTIVE" | "INACTIVE" | "SUSPENDED",
          },
        });
        updated = result.count;
        break;
      }

      case "assign_host_group": {
        // value is a host group ID
        const hostGroup = await prisma.hostGroup.findFirst({
          where: { id: value, organizationId: orgId },
        });

        if (!hostGroup) {
          return NextResponse.json(
            { error: "Host group not found" },
            { status: 400 }
          );
        }

        // Find all devices belonging to these users
        const devices = await prisma.agentDevice.findMany({
          where: {
            userId: { in: modifiableUserIds },
            organizationId: orgId,
          },
          select: { id: true },
        });

        if (devices.length === 0) {
          errors.push("No devices found for selected users");
          break;
        }

        // Find existing memberships to avoid duplicates
        const existingMembers = await prisma.hostGroupMember.findMany({
          where: {
            hostGroupId: value,
            deviceId: { in: devices.map((d) => d.id) },
          },
          select: { deviceId: true },
        });

        const existingDeviceIds = new Set(
          existingMembers.map((m) => m.deviceId)
        );
        const newDevices = devices.filter(
          (d) => !existingDeviceIds.has(d.id)
        );

        if (newDevices.length > 0) {
          await prisma.hostGroupMember.createMany({
            data: newDevices.map((d) => ({
              hostGroupId: value,
              deviceId: d.id,
            })),
            skipDuplicates: true,
          });
        }

        updated = newDevices.length;
        if (existingDeviceIds.size > 0) {
          errors.push(
            `${existingDeviceIds.size} device(s) were already in this host group`
          );
        }
        break;
      }

      case "assign_policy": {
        // value is a blocklist ID — we need to apply it via host groups
        // For bulk policy assignment, find all host groups that have these users'
        // devices and create policies linking the blocklist to those groups
        const blocklist = await prisma.domainBlocklist.findFirst({
          where: { id: value, organizationId: orgId },
        });

        if (!blocklist) {
          return NextResponse.json(
            { error: "Blocklist not found" },
            { status: 400 }
          );
        }

        // Find devices for these users
        const userDevices = await prisma.agentDevice.findMany({
          where: {
            userId: { in: modifiableUserIds },
            organizationId: orgId,
          },
          select: { id: true },
        });

        if (userDevices.length === 0) {
          errors.push("No devices found for selected users");
          break;
        }

        // Find host groups these devices belong to
        const memberships = await prisma.hostGroupMember.findMany({
          where: {
            deviceId: { in: userDevices.map((d) => d.id) },
          },
          select: { hostGroupId: true },
        });

        const hostGroupIds = [
          ...new Set(memberships.map((m) => m.hostGroupId)),
        ];

        if (hostGroupIds.length === 0) {
          errors.push(
            "No host groups found for selected users' devices. Assign devices to host groups first."
          );
          break;
        }

        // Check existing policies to avoid duplicates
        const existingPolicies = await prisma.hostGroupPolicy.findMany({
          where: {
            hostGroupId: { in: hostGroupIds },
            blocklistId: value,
          },
          select: { hostGroupId: true },
        });

        const existingGroupIds = new Set(
          existingPolicies.map((p) => p.hostGroupId)
        );
        const newGroupIds = hostGroupIds.filter(
          (id) => !existingGroupIds.has(id)
        );

        if (newGroupIds.length > 0) {
          await prisma.hostGroupPolicy.createMany({
            data: newGroupIds.map((groupId) => ({
              hostGroupId: groupId,
              blocklistId: value,
              policyType: "DOMAIN_BLOCK" as const,
              action: "BLOCK" as const,
              isActive: true,
            })),
          });
        }

        updated = newGroupIds.length;
        if (existingGroupIds.size > 0) {
          errors.push(
            `${existingGroupIds.size} host group(s) already had this policy`
          );
        }
        break;
      }
    }

    return NextResponse.json({ updated, errors });
  } catch (error) {
    console.error("Error in bulk operation:", error);
    return NextResponse.json(
      { error: "Bulk operation failed" },
      { status: 500 }
    );
  }
}
