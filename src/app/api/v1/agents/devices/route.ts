import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { isDeviceAllowed } from "@/lib/allowlist";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const registerSchema = z.object({
  hostname: z.string(),
  platform: z.string(),
  agentVersion: z.string().optional(),
  osVersion: z.string().optional(),
  ipAddress: z.string().optional(),
  installedSoftware: z.array(z.object({
    name: z.string(),
    version: z.string(),
  })).optional(),
});

// GET - list all devices for the org (admin/manager)
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "security:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgId = session.user.organizationId;
  const status = request.nextUrl.searchParams.get("status");
  const deviceId = request.nextUrl.searchParams.get("id");

  const where: Record<string, unknown> = { organizationId: orgId };
  if (status) where.status = status;
  if (deviceId) where.id = deviceId;

  try {
    const devices = await prisma.agentDevice.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        _count: { select: { commands: true } },
      },
      orderBy: { lastSeenAt: "desc" },
    });

    // For each device, count open CVEs and IOC matches from the org
    const enrichedDevices = await Promise.all(
      devices.map(async (device) => {
        // Count open CVEs for the org
        const openCves = await prisma.cveEntry.count({
          where: { organizationId: orgId, status: "OPEN" },
        });

        // Count active IOC entries
        const activeIocs = await prisma.iocEntry.count({
          where: { organizationId: orgId, isBlocked: true },
        });

        // Get recent activity events for this user
        const recentActivity = await prisma.activityEvent.findMany({
          where: { userId: device.userId, organizationId: orgId },
          orderBy: { timestamp: "desc" },
          take: 10,
          select: {
            eventType: true,
            appName: true,
            windowTitle: true,
            timestamp: true,
            url: true,
          },
        });

        // Get file events for this user
        const fileEvents = await prisma.activityEvent.findMany({
          where: {
            userId: device.userId,
            organizationId: orgId,
            eventType: { in: ["FILE_CREATE", "FILE_DELETE", "FILE_MOVE", "FILE_COPY"] },
          },
          orderBy: { timestamp: "desc" },
          take: 20,
          select: {
            eventType: true,
            windowTitle: true,
            url: true,
            timestamp: true,
            metadata: true,
          },
        });

        return {
          ...device,
          openCves,
          activeIocs,
          recentActivity,
          fileEvents,
        };
      })
    );

    return NextResponse.json({ devices: enrichedDevices });
  } catch (error) {
    console.error("Error fetching devices:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Failed to fetch devices", detail: message }, { status: 500 });
  }
}

// POST - register/heartbeat a device (called by agent)
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const orgId = session.user.organizationId;
    const userId = session.user.id;

    // Check device allowlist
    const { allowed, reason } = await isDeviceAllowed(parsed.data.hostname);
    if (!allowed) {
      return NextResponse.json(
        { error: reason || "This device is not allowed to connect" },
        { status: 403 }
      );
    }

    const device = await prisma.agentDevice.upsert({
      where: {
        organizationId_userId_hostname: {
          organizationId: orgId,
          userId,
          hostname: parsed.data.hostname,
        },
      },
      update: {
        platform: parsed.data.platform,
        agentVersion: parsed.data.agentVersion || "0.2.0",
        osVersion: parsed.data.osVersion,
        ipAddress: parsed.data.ipAddress,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        installedSoftware: parsed.data.installedSoftware ? (parsed.data.installedSoftware as any) : undefined,
        status: "ONLINE",
        lastSeenAt: new Date(),
      },
      create: {
        organizationId: orgId,
        userId,
        hostname: parsed.data.hostname,
        platform: parsed.data.platform,
        agentVersion: parsed.data.agentVersion || "0.2.0",
        osVersion: parsed.data.osVersion,
        ipAddress: parsed.data.ipAddress,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        installedSoftware: parsed.data.installedSoftware ? (parsed.data.installedSoftware as any) : undefined,
        status: "ONLINE",
      },
    });

    return NextResponse.json({ device });
  } catch (error) {
    console.error("Error registering device:", error);
    return NextResponse.json({ error: "Failed to register device" }, { status: 500 });
  }
}

// PATCH - update device diagnostics (called by agent)
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const orgId = session.user.organizationId;
    const userId = session.user.id;

    // Find the device for this user
    const device = await prisma.agentDevice.findFirst({
      where: { organizationId: orgId, userId },
      orderBy: { lastSeenAt: "desc" },
    });

    if (!device) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    // Update device with diagnostics data using raw SQL
    // (Prisma client may be cached by dev server and not know new columns)
    const sets: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    function addField(col: string, val: unknown, cast?: string) {
      if (val === undefined || val === null) return;
      sets.push(`"${col}" = $${idx}${cast ? `::${cast}` : ""}`);
      values.push(val);
      idx++;
    }

    // Always update these
    sets.push(`"lastSeenAt" = NOW()`);
    sets.push(`"status" = 'ONLINE'`);
    sets.push(`"updatedAt" = NOW()`);

    addField("cpuName", body.cpuName);
    addField("cpuCores", body.cpuCores, "int");
    addField("ramTotalGb", body.ramTotalGb, "double precision");
    addField("ramAvailGb", body.ramAvailGb, "double precision");
    addField("gpuName", body.gpuName);
    addField("diskDrives", body.diskDrives ? JSON.stringify(body.diskDrives) : undefined, "jsonb");
    addField("uptimeSeconds", body.uptimeSeconds, "int");
    addField("antivirusName", body.antivirusName);
    addField("firewallStatus", body.firewallStatus ? JSON.stringify(body.firewallStatus) : undefined, "jsonb");
    addField("defenderStatus", body.defenderStatus);
    addField("lastUpdateDate", body.lastUpdateDate ? new Date(body.lastUpdateDate).toISOString() : undefined, "timestamp");
    addField("pendingUpdates", body.pendingUpdates ? JSON.stringify(body.pendingUpdates) : undefined, "jsonb");
    addField("updateServiceStatus", body.updateServiceStatus);
    addField("rebootPending", body.rebootPending !== undefined ? body.rebootPending : undefined, "boolean");
    addField("bsodEvents", body.bsodEvents ? JSON.stringify(body.bsodEvents) : undefined, "jsonb");
    addField("bsodCount", body.bsodCount !== undefined ? body.bsodCount : undefined, "int");
    addField("dnsServers", body.dnsServers);
    addField("networkAdapters", body.networkAdapters ? JSON.stringify(body.networkAdapters) : undefined, "jsonb");
    addField("wifiSignal", body.wifiSignal !== undefined ? body.wifiSignal : undefined, "int");
    addField("installedSoftware", body.installedSoftware ? JSON.stringify(body.installedSoftware) : undefined, "jsonb");
    addField("runningSoftware", body.runningSoftware ? JSON.stringify(body.runningSoftware) : undefined, "jsonb");
    addField("performanceIssues", body.performanceIssues ? JSON.stringify(body.performanceIssues) : undefined, "jsonb");

    const sql = `UPDATE "AgentDevice" SET ${sets.join(", ")} WHERE "id" = $${idx}`;
    values.push(device.id);

    await prisma.$executeRawUnsafe(sql, ...values);

    // Save a diagnostic snapshot using raw SQL too
    const snapId = `diag_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const issuesFound = (body.performanceIssues?.length || 0) + (body.pendingUpdates?.length || 0) + (body.bsodCount || 0);
    await prisma.$executeRawUnsafe(
      `INSERT INTO "DeviceDiagnostic" ("id", "deviceId", "scanType", "timestamp", "results", "issuesFound", "criticalCount", "highCount", "mediumCount", "lowCount")
       VALUES ($1, $2, $3, NOW(), $4::jsonb, $5, $6, $7, $8, $9)`,
      snapId, device.id, "full", JSON.stringify(body),
      issuesFound, body.bsodCount || 0, body.pendingUpdates?.length || 0, body.performanceIssues?.length || 0, 0
    );

    // Return the updated device
    const updated = await prisma.agentDevice.findUnique({ where: { id: device.id } });
    return NextResponse.json({ device: updated });
  } catch (error) {
    console.error("Error updating device diagnostics:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Failed to update diagnostics", detail: message }, { status: 500 });
  }
}
