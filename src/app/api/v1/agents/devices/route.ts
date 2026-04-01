import { auth } from "@/lib/auth";
import { authenticateAgent } from "@/lib/agent-auth";
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

// GET - list devices for the org (admin/manager) or own devices (employee with userId=me)
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = session.user.organizationId;
  const userIdParam = request.nextUrl.searchParams.get("userId");
  const status = request.nextUrl.searchParams.get("status");
  const deviceId = request.nextUrl.searchParams.get("id");

  // Allow employees to fetch their own devices with userId=me
  if (userIdParam === "me") {
    try {
      const devices = await prisma.agentDevice.findMany({
        where: { organizationId: orgId, userId: session.user.id },
        select: {
          id: true,
          hostname: true,
          platform: true,
          osVersion: true,
          status: true,
          securityGrade: true,
          lastSeenAt: true,
        },
        orderBy: { lastSeenAt: "desc" },
        take: 10,
      });
      return NextResponse.json({ devices });
    } catch (error) {
      console.error("Error fetching own devices:", error);
      return NextResponse.json({ error: "Failed to fetch devices" }, { status: 500 });
    }
  }

  if (!hasPermission(session.user.role, "security:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const where: Record<string, unknown> = { organizationId: orgId };
  if (status) where.status = status;
  if (deviceId) where.id = deviceId;

  try {
    const devices = await prisma.agentDevice.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        _count: { select: { commands: true } },
        mdmDevices: {
          select: {
            id: true,
            enrollmentStatus: true,
            complianceStatus: true,
            managementState: true,
            deviceName: true,
            model: true,
            platform: true,
            osVersion: true,
            isEncrypted: true,
            isJailbroken: true,
            lastCheckIn: true,
            managedApps: true,
            mdmDeviceId: true,
            mdmProvider: { select: { id: true, name: true, providerType: true } },
            matchedUser: { select: { id: true, name: true, email: true } },
          },
          take: 1,
        },
      },
      orderBy: { lastSeenAt: "desc" },
    });

    // For each device, count applicable CVEs and IOC matches
    const enrichedDevices = await Promise.all(
      devices.map(async (device) => {
        // Count only CONFIRMED or POTENTIAL open CVEs (not NOT_APPLICABLE or UNASSESSED)
        const openCves = await prisma.cveEntry.count({
          where: {
            organizationId: orgId,
            status: "OPEN",
            applicability: { in: ["CONFIRMED", "POTENTIAL"] },
          },
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
    return NextResponse.json({ error: "Failed to fetch devices" }, { status: 500 });
  }
}

// POST - register/heartbeat a device (called by agent — supports both NextAuth and agent JWT)
export async function POST(request: NextRequest) {
  // Try NextAuth session first, then agent JWT
  const session = await auth();
  const agentAuth = !session ? await authenticateAgent(request) : null;

  if (!session && !agentAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const orgId = session ? session.user.organizationId : agentAuth!.organizationId;
    // For agent JWT auth, use a system user or find any admin user in the org
    let userId: string;
    if (session) {
      userId = session.user.id;
    } else {
      const adminUser = await prisma.user.findFirst({
        where: { organizationId: orgId, role: "ADMIN" },
        select: { id: true },
      });
      if (!adminUser) {
        return NextResponse.json({ error: "No admin user found in organization" }, { status: 500 });
      }
      userId = adminUser.id;
    }

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
        agentVersion: parsed.data.agentVersion || "1.0.0",
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
        agentVersion: parsed.data.agentVersion || "1.0.0",
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

// PATCH - update device diagnostics / heartbeat (supports both NextAuth and agent JWT)
export async function PATCH(request: NextRequest) {
  const session = await auth();
  const agentAuth = !session ? await authenticateAgent(request) : null;

  if (!session && !agentAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Validate input with Zod to prevent injection and type coercion attacks
    const diagnosticsSchema = z.object({
      deviceId: z.string().optional(),
      cpuName: z.string().max(256).optional(),
      cpuCores: z.number().int().positive().max(1024).optional(),
      ramTotalGb: z.number().positive().max(100000).optional(),
      ramAvailGb: z.number().min(0).max(100000).optional(),
      gpuName: z.string().max(256).optional(),
      diskDrives: z.array(z.record(z.string(), z.unknown())).optional(),
      uptimeSeconds: z.number().int().min(0).optional(),
      antivirusName: z.string().max(256).optional(),
      firewallStatus: z.record(z.string(), z.unknown()).optional(),
      defenderStatus: z.string().max(64).optional(),
      lastUpdateDate: z.string().optional(),
      pendingUpdates: z.array(z.record(z.string(), z.unknown())).optional(),
      updateServiceStatus: z.string().max(64).optional(),
      rebootPending: z.boolean().optional(),
      bsodEvents: z.array(z.record(z.string(), z.unknown())).optional(),
      bsodCount: z.number().int().min(0).optional(),
      dnsServers: z.string().max(512).optional(),
      networkAdapters: z.array(z.record(z.string(), z.unknown())).optional(),
      wifiSignal: z.number().int().min(-200).max(0).optional(),
      installedSoftware: z.array(z.record(z.string(), z.unknown())).optional(),
      runningSoftware: z.array(z.record(z.string(), z.unknown())).optional(),
      performanceIssues: z.array(z.record(z.string(), z.unknown())).optional(),
    });

    const parsed = diagnosticsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request format" }, { status: 400 });
    }

    const data = parsed.data;
    const orgId = session ? session.user.organizationId : agentAuth!.organizationId;
    const deviceId = data.deviceId || agentAuth?.deviceId;

    // Verify agent can only update its own device
    if (agentAuth && deviceId && deviceId !== agentAuth.deviceId) {
      return NextResponse.json({ error: "Cannot update other devices" }, { status: 403 });
    }

    // Find the device
    let device;
    if (deviceId) {
      device = await prisma.agentDevice.findFirst({
        where: { id: deviceId, organizationId: orgId },
      });
    } else if (session) {
      device = await prisma.agentDevice.findFirst({
        where: { organizationId: orgId, userId: session.user.id },
        orderBy: { lastSeenAt: "desc" },
      });
    }

    if (!device) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    // Update device using safe Prisma update (no raw SQL)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {
      lastSeenAt: new Date(),
      status: "ONLINE",
    };

    if (data.cpuName !== undefined) updateData.cpuName = data.cpuName;
    if (data.cpuCores !== undefined) updateData.cpuCores = data.cpuCores;
    if (data.ramTotalGb !== undefined) updateData.ramTotalGb = data.ramTotalGb;
    if (data.ramAvailGb !== undefined) updateData.ramAvailGb = data.ramAvailGb;
    if (data.gpuName !== undefined) updateData.gpuName = data.gpuName;
    if (data.diskDrives !== undefined) updateData.diskDrives = data.diskDrives;
    if (data.uptimeSeconds !== undefined) updateData.uptimeSeconds = data.uptimeSeconds;
    if (data.antivirusName !== undefined) updateData.antivirusName = data.antivirusName;
    if (data.firewallStatus !== undefined) updateData.firewallStatus = data.firewallStatus;
    if (data.defenderStatus !== undefined) updateData.defenderStatus = data.defenderStatus;
    if (data.lastUpdateDate !== undefined) updateData.lastUpdateDate = new Date(data.lastUpdateDate);
    if (data.pendingUpdates !== undefined) updateData.pendingUpdates = data.pendingUpdates;
    if (data.updateServiceStatus !== undefined) updateData.updateServiceStatus = data.updateServiceStatus;
    if (data.rebootPending !== undefined) updateData.rebootPending = data.rebootPending;
    if (data.bsodEvents !== undefined) updateData.bsodEvents = data.bsodEvents;
    if (data.bsodCount !== undefined) updateData.bsodCount = data.bsodCount;
    if (data.dnsServers !== undefined) updateData.dnsServers = data.dnsServers;
    if (data.networkAdapters !== undefined) updateData.networkAdapters = data.networkAdapters;
    if (data.wifiSignal !== undefined) updateData.wifiSignal = data.wifiSignal;
    if (data.installedSoftware !== undefined) updateData.installedSoftware = data.installedSoftware;
    if (data.runningSoftware !== undefined) updateData.runningSoftware = data.runningSoftware;
    if (data.performanceIssues !== undefined) updateData.performanceIssues = data.performanceIssues;

    const updated = await prisma.agentDevice.update({
      where: { id: device.id },
      data: updateData,
    });

    // Save a diagnostic snapshot
    const issuesFound = (data.performanceIssues?.length || 0) + (data.pendingUpdates?.length || 0) + (data.bsodCount || 0);
    await prisma.deviceDiagnostic.create({
      data: {
        deviceId: device.id,
        scanType: "full",
        timestamp: new Date(),
        results: data as object,
        issuesFound,
        criticalCount: data.bsodCount || 0,
        highCount: data.pendingUpdates?.length || 0,
        mediumCount: data.performanceIssues?.length || 0,
        lowCount: 0,
      },
    });

    return NextResponse.json({ device: updated });
  } catch (error) {
    console.error("Error updating device diagnostics:", error);
    return NextResponse.json({ error: "Failed to update diagnostics" }, { status: 500 });
  }
}
