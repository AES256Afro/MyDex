import { authenticateAgent } from "@/lib/agent-auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const batchSchema = z.object({
  type: z.string(),
  collectedAt: z.string().datetime(),
  data: z.unknown(),
});

const telemetrySchema = z.object({
  deviceId: z.string(),
  batches: z.array(batchSchema),
});

// POST - Batched telemetry upload from agent
export async function POST(request: NextRequest) {
  const agentAuth = await authenticateAgent(request);
  if (!agentAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = telemetrySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Verify the deviceId matches the authenticated agent
    if (parsed.data.deviceId !== agentAuth.deviceId) {
      return NextResponse.json(
        { error: "Device ID mismatch" },
        { status: 403 }
      );
    }

    const { deviceId } = agentAuth;
    const organizationId = agentAuth.organizationId;

    // Check if the device owner has monitoring paused
    const device = await prisma.agentDevice.findUnique({
      where: { id: deviceId },
      select: { userId: true },
    });
    if (device) {
      const user = await prisma.user.findUnique({
        where: { id: device.userId },
        select: { monitoringPaused: true },
      });
      if (user?.monitoringPaused) {
        // Silently accept but don't store telemetry
        return NextResponse.json({ processed: 0, paused: true });
      }
    }

    let batchesProcessed = 0;

    for (const batch of parsed.data.batches) {
      const collectedAt = new Date(batch.collectedAt);

      // Store the raw batch
      await prisma.telemetryBatch.create({
        data: {
          deviceId,
          organizationId,
          batchType: batch.type,
          collectedAt,
          payload: batch.data as object,
          eventCount: Array.isArray(batch.data) ? (batch.data as unknown[]).length : 1,
        },
      });

      // Process specific batch types
      switch (batch.type) {
        case "dns_queries":
          await processDnsQueries(deviceId, organizationId, batch.data);
          break;
        case "network_connections":
          await processNetworkConnections(deviceId, organizationId, batch.data);
          break;
        case "usb_events":
          await processUsbEvents(deviceId, organizationId, batch.data);
          break;
        case "system_state":
          await processSystemState(deviceId, batch.data);
          break;
      }

      batchesProcessed++;
    }

    return NextResponse.json({ received: true, batchesProcessed });
  } catch (error) {
    console.error("Error processing telemetry:", error);
    return NextResponse.json(
      { error: "Failed to process telemetry" },
      { status: 500 }
    );
  }
}

/**
 * Process DNS query batches — insert into DnsQueryLog and check blocklists.
 */
async function processDnsQueries(
  deviceId: string,
  organizationId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
) {
  if (!Array.isArray(data)) return;

  // Fetch active blocklists for this org
  const blocklists = await prisma.domainBlocklist.findMany({
    where: { organizationId, isActive: true },
    select: { id: true, name: true, domains: true },
  });

  // Build a set of blocked domains
  const blockedDomains = new Map<string, string>();
  for (const bl of blocklists) {
    const domains = Array.isArray(bl.domains) ? (bl.domains as string[]) : [];
    for (const domain of domains) {
      blockedDomains.set(domain.toLowerCase(), bl.name);
    }
  }

  for (const query of data) {
    const queryName = (query.queryName || query.domain || "").toLowerCase();
    const isBlocked = blockedDomains.has(queryName);
    const blockReason = isBlocked ? blockedDomains.get(queryName) : null;

    await prisma.dnsQueryLog.create({
      data: {
        deviceId,
        organizationId,
        queryName: queryName,
        queryType: query.queryType || "A",
        responseCode: query.responseCode || null,
        resolvedIps: query.resolvedIps || [],
        processName: query.processName || null,
        blocked: isBlocked,
        blockedBy: blockReason || null,
        timestamp: query.timestamp ? new Date(query.timestamp) : new Date(),
      },
    });
  }
}

/**
 * Process network connection batches — insert into NetworkConnection.
 */
async function processNetworkConnections(
  deviceId: string,
  organizationId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
) {
  if (!Array.isArray(data)) return;

  for (const conn of data) {
    await prisma.networkConnection.create({
      data: {
        deviceId,
        organizationId,
        protocol: conn.protocol || "TCP",
        localAddress: conn.localAddress || "",
        localPort: conn.localPort || 0,
        remoteAddress: conn.remoteAddress || "",
        remotePort: conn.remotePort || 0,
        state: conn.state || "UNKNOWN",
        processName: conn.processName || null,
        pid: conn.pid || null,
        direction: conn.direction || null,
        timestamp: conn.timestamp ? new Date(conn.timestamp) : new Date(),
      },
    });
  }
}

/**
 * Process USB device event batches — insert into UsbDeviceEvent.
 */
async function processUsbEvents(
  deviceId: string,
  organizationId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
) {
  if (!Array.isArray(data)) return;

  for (const event of data) {
    await prisma.usbDeviceEvent.create({
      data: {
        deviceId,
        organizationId,
        eventType: event.eventType || "CONNECTED",
        vendorId: event.vendorId || null,
        productId: event.productId || null,
        serialNumber: event.serialNumber || null,
        deviceName: event.deviceName || "Unknown",
        deviceClass: event.deviceClass || null,
        allowed: event.allowed !== undefined ? event.allowed : true,
        timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
      },
    });
  }
}

/**
 * Process system state — update AgentDevice fields.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processSystemState(deviceId: string, data: any) {
  if (!data || typeof data !== "object") return;

  const updateData: Record<string, unknown> = {
    lastSeenAt: new Date(),
    status: "ONLINE",
  };

  if (data.firewallStatus !== undefined) updateData.firewallStatus = data.firewallStatus;
  if (data.defenderStatus !== undefined) updateData.defenderStatus = data.defenderStatus;
  if (data.antivirusName !== undefined) updateData.antivirusName = data.antivirusName;
  if (data.diskDrives !== undefined) updateData.diskDrives = data.diskDrives;
  if (data.cpuName !== undefined) updateData.cpuName = data.cpuName;
  if (data.cpuCores !== undefined) updateData.cpuCores = data.cpuCores;
  if (data.ramTotalGb !== undefined) updateData.ramTotalGb = data.ramTotalGb;
  if (data.ramAvailGb !== undefined) updateData.ramAvailGb = data.ramAvailGb;
  if (data.gpuName !== undefined) updateData.gpuName = data.gpuName;
  if (data.uptimeSeconds !== undefined) updateData.uptimeSeconds = data.uptimeSeconds;
  if (data.rebootPending !== undefined) updateData.rebootPending = data.rebootPending;
  if (data.pendingUpdates !== undefined) updateData.pendingUpdates = data.pendingUpdates;
  if (data.updateServiceStatus !== undefined) updateData.updateServiceStatus = data.updateServiceStatus;
  if (data.lastUpdateDate !== undefined) updateData.lastUpdateDate = new Date(data.lastUpdateDate);
  if (data.dnsServers !== undefined) updateData.dnsServers = data.dnsServers;
  if (data.networkAdapters !== undefined) updateData.networkAdapters = data.networkAdapters;
  if (data.wifiSignal !== undefined) updateData.wifiSignal = data.wifiSignal;
  if (data.installedSoftware !== undefined) updateData.installedSoftware = data.installedSoftware;
  if (data.runningSoftware !== undefined) updateData.runningSoftware = data.runningSoftware;
  if (data.performanceIssues !== undefined) updateData.performanceIssues = data.performanceIssues;
  if (data.securityGrade !== undefined) updateData.securityGrade = data.securityGrade;

  await prisma.agentDevice.update({
    where: { id: deviceId },
    data: updateData,
  });
}
