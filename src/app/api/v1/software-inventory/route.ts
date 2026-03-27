import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { NextResponse } from "next/server";

interface InstalledSoftwareItem {
  name: string;
  version: string;
  publisher?: string;
  installPath?: string;
  installDate?: string;
  size?: number;
}

interface SoftwareAggregation {
  name: string;
  totalInstalls: number;
  versions: Array<{
    version: string;
    count: number;
    devices: Array<{
      deviceId: string;
      hostname: string;
      platform: string;
      userName: string;
      installPath?: string;
    }>;
  }>;
  latestVersion: string;
  outdatedCount: number;
  publishers: string[];
}

// GET - aggregate software inventory across all devices
export async function GET() {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "security:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgId = session.user.organizationId;

  try {
    const devices = await prisma.agentDevice.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        hostname: true,
        platform: true,
        installedSoftware: true,
        user: { select: { name: true, email: true } },
      },
    });

    // Aggregate software across all devices
    const softwareMap = new Map<string, {
      name: string;
      versions: Map<string, Array<{
        deviceId: string;
        hostname: string;
        platform: string;
        userName: string;
        installPath?: string;
      }>>;
      publishers: Set<string>;
    }>();

    let totalDevices = devices.length;
    let totalInstallations = 0;

    for (const device of devices) {
      const sw = device.installedSoftware;
      if (!Array.isArray(sw)) continue;

      for (const item of sw as unknown as InstalledSoftwareItem[]) {
        if (!item?.name) continue;

        totalInstallations++;
        const normalizedName = item.name.trim();
        const version = (item.version || "Unknown").trim();

        if (!softwareMap.has(normalizedName)) {
          softwareMap.set(normalizedName, {
            name: normalizedName,
            versions: new Map(),
            publishers: new Set(),
          });
        }

        const entry = softwareMap.get(normalizedName)!;
        if (item.publisher) entry.publishers.add(item.publisher);

        if (!entry.versions.has(version)) {
          entry.versions.set(version, []);
        }

        entry.versions.get(version)!.push({
          deviceId: device.id,
          hostname: device.hostname,
          platform: device.platform,
          userName: device.user.name || device.user.email,
          installPath: item.installPath,
        });
      }
    }

    // Convert to sorted array
    const software: SoftwareAggregation[] = [];

    for (const [, entry] of softwareMap) {
      const versions = Array.from(entry.versions.entries())
        .map(([version, devices]) => ({
          version,
          count: devices.length,
          devices,
        }))
        .sort((a, b) => b.count - a.count);

      const totalInstalls = versions.reduce((sum, v) => sum + v.count, 0);

      // Determine latest version using simple semver-like comparison
      const versionStrings = versions.map((v) => v.version).filter((v) => v !== "Unknown");
      const latestVersion = versionStrings.length > 0
        ? versionStrings.sort((a, b) => compareVersions(b, a))[0]
        : "Unknown";

      // Count devices NOT on the latest version
      const outdatedCount = latestVersion !== "Unknown"
        ? versions
            .filter((v) => v.version !== latestVersion && v.version !== "Unknown")
            .reduce((sum, v) => sum + v.count, 0)
        : 0;

      software.push({
        name: entry.name,
        totalInstalls,
        versions,
        latestVersion,
        outdatedCount,
        publishers: Array.from(entry.publishers),
      });
    }

    // Sort by total installs descending
    software.sort((a, b) => b.totalInstalls - a.totalInstalls);

    // Summary stats
    const uniqueApps = software.length;
    const appsWithMultipleVersions = software.filter((s) => s.versions.length > 1).length;
    const totalOutdated = software.reduce((sum, s) => sum + s.outdatedCount, 0);

    return NextResponse.json({
      software,
      summary: {
        totalDevices,
        totalInstallations,
        uniqueApps,
        appsWithMultipleVersions,
        totalOutdated,
      },
    });
  } catch (error) {
    console.error("Error fetching software inventory:", error);
    return NextResponse.json(
      { error: "Failed to fetch software inventory" },
      { status: 500 }
    );
  }
}

// Simple version comparison (handles semver-like and numeric versions)
function compareVersions(a: string, b: string): number {
  const partsA = a.split(/[.\-_]/).map((p) => {
    const num = parseInt(p, 10);
    return isNaN(num) ? 0 : num;
  });
  const partsB = b.split(/[.\-_]/).map((p) => {
    const num = parseInt(p, 10);
    return isNaN(num) ? 0 : num;
  });

  const len = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < len; i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;
    if (numA !== numB) return numA - numB;
  }
  return 0;
}
