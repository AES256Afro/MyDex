import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const scanSchema = z.object({
  hostname: z.string(),
  software: z.array(z.object({
    name: z.string(),
    version: z.string(),
  })).min(1).max(1000),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = scanSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const orgId = session.user.organizationId;
    const { hostname, software } = parsed.data;

    // Get all known CVEs for this org
    const knownCves = await prisma.cveEntry.findMany({
      where: { organizationId: orgId, status: "OPEN" },
    });

    // Match installed software against known CVEs
    const matchedCves: Array<{ software: string; version: string; cveId: string; cveEntryId: string; severity: string }> = [];

    for (const sw of software) {
      for (const cve of knownCves) {
        if (cve.affectedSoftware.toLowerCase() === sw.name.toLowerCase()) {
          matchedCves.push({
            software: sw.name,
            version: sw.version,
            cveId: cve.cveId,
            cveEntryId: cve.id,
            severity: cve.severity,
          });
        }
      }
    }

    // Record scan results
    await prisma.cveScanResult.createMany({
      data: software.map(sw => {
        const match = matchedCves.find(m => m.software.toLowerCase() === sw.name.toLowerCase());
        return {
          organizationId: orgId,
          hostname,
          softwareName: sw.name,
          installedVersion: sw.version,
          cveEntryId: match?.cveEntryId || null,
          scannedAt: new Date(),
        };
      }),
    });

    // Create alerts for critical/high CVE matches
    const criticalMatches = matchedCves.filter(m => m.severity === "CRITICAL" || m.severity === "HIGH");
    if (criticalMatches.length > 0) {
      await prisma.securityAlert.createMany({
        data: criticalMatches.map(m => ({
          userId: session.user.id,
          organizationId: orgId,
          alertType: "POLICY_VIOLATION" as const,
          severity: m.severity as "CRITICAL" | "HIGH",
          title: `CVE Detected: ${m.cveId}`,
          description: `Vulnerable software ${m.software} v${m.version} found on ${hostname}`,
          metadata: { cveId: m.cveId, software: m.software, version: m.version, hostname },
        })),
      });
    }

    return NextResponse.json({
      scanned: software.length,
      vulnerabilities: matchedCves.length,
      critical: criticalMatches.length,
      matches: matchedCves,
    });
  } catch (error) {
    console.error("Error processing CVE scan:", error);
    return NextResponse.json({ error: "Failed to process scan" }, { status: 500 });
  }
}
