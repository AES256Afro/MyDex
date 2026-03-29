import { prisma } from "@/lib/prisma";
import { createMdmClient } from "./factory";
import type { MdmDeviceData } from "./types";

interface SyncResult {
  success: boolean;
  devicesFound: number;
  devicesUpserted: number;
  usersMatched: number;
  devicesMatched: number;
  autoAssigned: number;
  error?: string;
}

export async function syncMdmProvider(providerId: string): Promise<SyncResult> {
  const provider = await prisma.mdmProvider.findUnique({ where: { id: providerId } });
  if (!provider) throw new Error("Provider not found");

  // Mark as syncing
  await prisma.mdmProvider.update({
    where: { id: providerId },
    data: { lastSyncStatus: "SYNCING" },
  });

  try {
    const client = createMdmClient({
      providerType: provider.providerType,
      clientId: provider.clientId || undefined,
      clientSecret: provider.clientSecret || undefined,
      tenantId: provider.tenantId || undefined,
      apiToken: provider.apiToken || undefined,
      instanceUrl: provider.instanceUrl || undefined,
    });

    // 1. Fetch devices from MDM
    const mdmDevices = await client.listDevices();

    // 2. Get org users for email matching
    const orgUsers = await prisma.user.findMany({
      where: { organizationId: provider.organizationId },
      select: { id: true, email: true },
    });
    const emailToUser = new Map(orgUsers.map((u) => [u.email.toLowerCase(), u.id]));

    // 3. Get org agent devices for matching
    const agentDevices = await prisma.agentDevice.findMany({
      where: { organizationId: provider.organizationId },
      select: { id: true, hostname: true, serialNumber: true, userId: true },
    });
    const serialToDevice = new Map<string, typeof agentDevices[0]>();
    const hostnameToDevice = new Map<string, typeof agentDevices[0]>();
    for (const d of agentDevices) {
      if (d.serialNumber) serialToDevice.set(d.serialNumber.toLowerCase(), d);
      if (d.hostname) hostnameToDevice.set(d.hostname.toLowerCase(), d);
    }

    // 4. Track existing MDM device IDs for stale detection
    const existingMdmDevices = await prisma.mdmDevice.findMany({
      where: { mdmProviderId: providerId },
      select: { id: true, mdmDeviceId: true },
    });
    const existingIds = new Set(existingMdmDevices.map((d) => d.mdmDeviceId));
    const seenIds = new Set<string>();

    let usersMatched = 0;
    let devicesMatched = 0;
    let autoAssigned = 0;

    // 5. Upsert each device
    for (const device of mdmDevices) {
      seenIds.add(device.mdmDeviceId);

      // Match user
      let matchedUserId: string | null = null;
      if (device.userEmail) {
        const userId = emailToUser.get(device.userEmail.toLowerCase());
        if (userId) {
          matchedUserId = userId;
          usersMatched++;
        }
      }

      // Match agent device (serial first, then hostname)
      let agentDeviceId: string | null = null;
      let matchConfidence: string | null = null;

      if (device.serialNumber) {
        const match = serialToDevice.get(device.serialNumber.toLowerCase());
        if (match) {
          agentDeviceId = match.id;
          matchConfidence = "serial";
          devicesMatched++;
        }
      }
      if (!agentDeviceId && device.hostname) {
        const match = hostnameToDevice.get(device.hostname.toLowerCase());
        if (match) {
          agentDeviceId = match.id;
          matchConfidence = "hostname";
          devicesMatched++;
        }
      }

      await prisma.mdmDevice.upsert({
        where: {
          mdmProviderId_mdmDeviceId: {
            mdmProviderId: providerId,
            mdmDeviceId: device.mdmDeviceId,
          },
        },
        create: {
          organizationId: provider.organizationId,
          mdmProviderId: providerId,
          ...mapToDbFields(device, agentDeviceId, matchedUserId, matchConfidence),
        },
        update: {
          ...mapToDbFields(device, agentDeviceId, matchedUserId, matchConfidence),
          lastSyncedAt: new Date(),
        },
      });

      // 6. Auto-assign if enabled
      if (provider.autoAssign && agentDeviceId && matchedUserId) {
        const agentDev = agentDevices.find((d) => d.id === agentDeviceId);
        if (agentDev && agentDev.userId !== matchedUserId) {
          await prisma.agentDevice.update({
            where: { id: agentDeviceId },
            data: { userId: matchedUserId },
          });
          autoAssigned++;
        }
      }
    }

    // 7. Mark stale devices
    const staleIds = [...existingIds].filter((id) => !seenIds.has(id));
    if (staleIds.length > 0) {
      await prisma.mdmDevice.updateMany({
        where: {
          mdmProviderId: providerId,
          mdmDeviceId: { in: staleIds },
        },
        data: { enrollmentStatus: "unenrolled" },
      });
    }

    // 8. Update provider
    await prisma.mdmProvider.update({
      where: { id: providerId },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: "SUCCESS",
        lastSyncDeviceCount: mdmDevices.length,
        lastSyncError: null,
      },
    });

    return {
      success: true,
      devicesFound: mdmDevices.length,
      devicesUpserted: mdmDevices.length,
      usersMatched,
      devicesMatched,
      autoAssigned,
    };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Unknown error";
    await prisma.mdmProvider.update({
      where: { id: providerId },
      data: {
        lastSyncStatus: "FAILED",
        lastSyncError: error,
      },
    });
    return {
      success: false,
      devicesFound: 0,
      devicesUpserted: 0,
      usersMatched: 0,
      devicesMatched: 0,
      autoAssigned: 0,
      error,
    };
  }
}

function mapToDbFields(
  device: MdmDeviceData,
  agentDeviceId: string | null,
  matchedUserId: string | null,
  matchConfidence: string | null
) {
  return {
    mdmDeviceId: device.mdmDeviceId,
    serialNumber: device.serialNumber || null,
    hostname: device.hostname || null,
    userEmail: device.userEmail || null,
    enrollmentStatus: device.enrollmentStatus || null,
    complianceStatus: device.complianceStatus || null,
    managementState: device.managementState || null,
    deviceName: device.deviceName || null,
    platform: device.platform || null,
    osVersion: device.osVersion || null,
    model: device.model || null,
    manufacturer: device.manufacturer || null,
    managedApps: device.managedApps ? JSON.parse(JSON.stringify(device.managedApps)) : [],
    isEncrypted: device.isEncrypted ?? null,
    isJailbroken: device.isJailbroken ?? null,
    lastCheckIn: device.lastCheckIn || null,
    agentDeviceId,
    matchedUserId,
    matchConfidence,
    rawData: device.rawData ? JSON.parse(JSON.stringify(device.rawData)) : undefined,
  };
}
