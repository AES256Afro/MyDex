import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { NextResponse } from "next/server";

/** Compare two version strings. Returns -1 if a < b, 0 if equal, 1 if a > b. */
function compareVersions(a: string, b: string): number {
  const pa = a.replace(/[^0-9.]/g, "").split(".").map(Number);
  const pb = b.replace(/[^0-9.]/g, "").split(".").map(Number);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na < nb) return -1;
    if (na > nb) return 1;
  }
  return 0;
}

/** Check if an installed version is vulnerable given fixedVersion/affectedVersions. */
function isVersionVulnerable(installedVersion: string, fixedVersion: string | null, affectedVersions: string | null): boolean {
  if (fixedVersion) {
    const cleaned = fixedVersion.replace(/^[<>=\s]+/, "").trim();
    if (cleaned && compareVersions(installedVersion, cleaned) >= 0) return false;
  }
  if (affectedVersions) {
    const lower = affectedVersions.toLowerCase();
    const ltMatch = lower.match(/^[<]=?\s*([\d.]+)/);
    if (ltMatch) {
      const isLte = lower.startsWith("<=");
      const cmp = compareVersions(installedVersion, ltMatch[1]);
      return isLte ? cmp <= 0 : cmp < 0;
    }
    const beforeMatch = lower.match(/before\s+([\d.]+)/);
    if (beforeMatch) return compareVersions(installedVersion, beforeMatch[1]) < 0;
  }
  return true;
}

interface InstalledSoftware {
  name: string;
  version: string;
}

// POST - re-assess applicability of all CVEs against device inventory
export async function POST() {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "security:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgId = session.user.organizationId;

  try {
    // Only reset OPEN CVEs — don't touch resolved ones (PATCHED, MITIGATED, etc.)
    await prisma.cveEntry.updateMany({
      where: { organizationId: orgId, status: "OPEN" },
      data: { applicability: "UNASSESSED" },
    });

    // Get all devices with their installed software (including versions)
    const devices = await prisma.agentDevice.findMany({
      where: { organizationId: orgId },
      select: { installedSoftware: true, platform: true, osVersion: true },
    });

    // Build a map of installed software with versions
    const installedSoftware: InstalledSoftware[] = [];
    const installedNames = new Set<string>();
    const platforms = new Set<string>();

    for (const device of devices) {
      if (device.platform) platforms.add(device.platform.toLowerCase());
      if (device.osVersion) {
        installedNames.add(device.osVersion.toLowerCase());
        installedSoftware.push({ name: device.osVersion, version: device.osVersion });
      }
      const sw = device.installedSoftware;
      if (Array.isArray(sw)) {
        for (const item of sw as Array<{ name?: string; version?: string }>) {
          if (item?.name) {
            installedNames.add(item.name.toLowerCase());
            installedSoftware.push({
              name: item.name,
              version: item.version || "0.0.0",
            });
          }
        }
      }
    }

    // Get only OPEN CVEs for assessment
    const cves = await prisma.cveEntry.findMany({
      where: { organizationId: orgId, status: "OPEN" },
      select: {
        id: true,
        affectedSoftware: true,
        affectedVersions: true,
        fixedVersion: true,
        description: true,
      },
    });

    let confirmed = 0;
    let potential = 0;
    let notApplicable = 0;
    let autoPatched = 0;

    if (devices.length === 0) {
      await prisma.cveEntry.updateMany({
        where: { organizationId: orgId, status: "OPEN" },
        data: { applicability: "POTENTIAL" },
      });
      return NextResponse.json({
        total: cves.length,
        confirmed: 0,
        potential: cves.length,
        notApplicable: 0,
        autoPatched: 0,
        message: "No devices enrolled — all CVEs marked as potential",
      });
    }

    const hasWindowsDevice = platforms.has("win32") || platforms.has("windows");
    const hasMacDevice = platforms.has("darwin") || platforms.has("macos");
    const hasLinuxDevice = platforms.has("linux");

    for (const cve of cves) {
      const software = cve.affectedSoftware.toLowerCase();
      const desc = (cve.description || "").toLowerCase();
      const product = software.includes("/")
        ? software.split("/")[1].replace(/_/g, " ")
        : software;

      // Check OS relevance
      const isWindowsCve = desc.includes("windows") || software.includes("windows") || software.includes("microsoft");
      const isMacCve = desc.includes("macos") || desc.includes("mac os") || software.includes("apple") || software.includes("macos");
      const isLinuxCve = desc.includes("linux") || software.includes("linux");
      const osSpecific = isWindowsCve || isMacCve || isLinuxCve;
      const osRelevant =
        (isWindowsCve && hasWindowsDevice) ||
        (isMacCve && hasMacDevice) ||
        (isLinuxCve && hasLinuxDevice) ||
        !osSpecific;

      if (!osRelevant) {
        await prisma.cveEntry.update({
          where: { id: cve.id },
          data: { applicability: "NOT_APPLICABLE" },
        });
        notApplicable++;
        continue;
      }

      // Find matching installed software by name
      const normalizedProduct = product.replace(/[_\-\.]/g, " ").trim();
      const matchingSoftware = installedSoftware.filter((sw) => {
        const normalizedInstalled = sw.name.toLowerCase().replace(/[_\-\.]/g, " ").trim();
        return (
          normalizedInstalled.includes(normalizedProduct) ||
          normalizedProduct.includes(normalizedInstalled)
        );
      });

      if (matchingSoftware.length === 0) {
        // Software not installed at all
        await prisma.cveEntry.update({
          where: { id: cve.id },
          data: { applicability: "NOT_APPLICABLE" },
        });
        notApplicable++;
        continue;
      }

      // Software is installed — check if any installed version is still vulnerable
      const anyVulnerable = matchingSoftware.some((sw) =>
        isVersionVulnerable(sw.version, cve.fixedVersion, cve.affectedVersions)
      );

      if (anyVulnerable) {
        await prisma.cveEntry.update({
          where: { id: cve.id },
          data: { applicability: "CONFIRMED" },
        });
        confirmed++;
      } else {
        // All installed versions are patched — auto-resolve
        await prisma.cveEntry.update({
          where: { id: cve.id },
          data: {
            applicability: "NOT_APPLICABLE",
            status: "PATCHED",
            resolvedAt: new Date(),
          },
        });
        autoPatched++;
      }
    }

    return NextResponse.json({
      total: cves.length,
      confirmed,
      potential,
      notApplicable,
      autoPatched,
    });
  } catch (error) {
    console.error("Error assessing CVE applicability:", error);
    return NextResponse.json(
      { error: "Failed to assess CVE applicability" },
      { status: 500 }
    );
  }
}
