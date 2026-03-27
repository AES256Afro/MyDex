import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { NextResponse } from "next/server";

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
    // Reset all to UNASSESSED first so they get re-evaluated
    await prisma.cveEntry.updateMany({
      where: { organizationId: orgId },
      data: { applicability: "UNASSESSED" },
    });

    // Get all devices and their installed software
    const devices = await prisma.agentDevice.findMany({
      where: { organizationId: orgId },
      select: { installedSoftware: true, platform: true, osVersion: true },
    });

    const installedSoftwareNames = new Set<string>();
    const platforms = new Set<string>();
    for (const device of devices) {
      if (device.platform) platforms.add(device.platform.toLowerCase());
      if (device.osVersion) installedSoftwareNames.add(device.osVersion.toLowerCase());
      const sw = device.installedSoftware;
      if (Array.isArray(sw)) {
        for (const item of sw as Array<{ name?: string }>) {
          if (item?.name) installedSoftwareNames.add(item.name.toLowerCase());
        }
      }
    }

    // Get all CVEs
    const cves = await prisma.cveEntry.findMany({
      where: { organizationId: orgId },
      select: { id: true, affectedSoftware: true, description: true },
    });

    let confirmed = 0;
    let potential = 0;
    let notApplicable = 0;

    if (devices.length === 0) {
      // No devices — mark all as POTENTIAL
      await prisma.cveEntry.updateMany({
        where: { organizationId: orgId },
        data: { applicability: "POTENTIAL" },
      });
      return NextResponse.json({
        total: cves.length,
        confirmed: 0,
        potential: cves.length,
        notApplicable: 0,
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

      const directMatch = [...installedSoftwareNames].some((installed) => {
        const normalizedProduct = product.replace(/[_\-\.]/g, " ").trim();
        const normalizedInstalled = installed.replace(/[_\-\.]/g, " ").trim();
        return (
          normalizedInstalled.includes(normalizedProduct) ||
          normalizedProduct.includes(normalizedInstalled)
        );
      });

      const isWindowsCve = desc.includes("windows") || software.includes("windows") || software.includes("microsoft");
      const isMacCve = desc.includes("macos") || desc.includes("mac os") || software.includes("apple") || software.includes("macos");
      const isLinuxCve = desc.includes("linux") || software.includes("linux");
      const osSpecific = isWindowsCve || isMacCve || isLinuxCve;
      const osRelevant =
        (isWindowsCve && hasWindowsDevice) ||
        (isMacCve && hasMacDevice) ||
        (isLinuxCve && hasLinuxDevice) ||
        !osSpecific;

      let applicability: "CONFIRMED" | "POTENTIAL" | "NOT_APPLICABLE";
      if (directMatch && osRelevant) {
        applicability = "CONFIRMED";
        confirmed++;
      } else if (osRelevant) {
        applicability = "POTENTIAL";
        potential++;
      } else {
        applicability = "NOT_APPLICABLE";
        notApplicable++;
      }

      await prisma.cveEntry.update({
        where: { id: cve.id },
        data: { applicability },
      });
    }

    return NextResponse.json({
      total: cves.length,
      confirmed,
      potential,
      notApplicable,
    });
  } catch (error) {
    console.error("Error assessing CVE applicability:", error);
    return NextResponse.json(
      { error: "Failed to assess CVE applicability" },
      { status: 500 }
    );
  }
}
