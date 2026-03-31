import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendIntegrationMessage } from "@/lib/integrations";
import { notifyAdmins } from "@/lib/notifications";
import { evaluateWorkflows } from "@/lib/workflows/engine";
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

      // Send Slack/Teams notification for critical CVEs
      sendIntegrationMessage(orgId, {
        title: `🛡️ ${criticalMatches.length} Critical CVE${criticalMatches.length > 1 ? "s" : ""} Detected`,
        message: criticalMatches.map(m => `• *${m.cveId}*: ${m.software} v${m.version}`).join("\n"),
        color: "#EF4444",
        link: `${process.env.NEXTAUTH_URL || "https://mydexnow.com"}/security`,
        fields: [
          { label: "Host", value: hostname },
          { label: "Total Vulnerabilities", value: String(matchedCves.length) },
          { label: "Critical/High", value: String(criticalMatches.length) },
        ],
      }).catch(() => {});

      // In-app notification for admins
      notifyAdmins({
        organizationId: orgId,
        type: "SECURITY_ALERT",
        title: `${criticalMatches.length} Critical CVE${criticalMatches.length > 1 ? "s" : ""} Found`,
        message: `Vulnerable software detected on ${hostname}: ${criticalMatches.map(m => m.cveId).join(", ")}`,
        link: "/security",
      }).catch(() => {});

      // Evaluate automated workflows
      for (const match of criticalMatches) {
        evaluateWorkflows(orgId, "security_alert", {
          severity: match.severity,
          cveId: match.cveId,
          software: match.software,
          version: match.version,
          hostname,
          title: `CVE Detected: ${match.cveId}`,
        }).catch(() => {});
      }
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
