import { auth } from "@/lib/auth";
import { authenticateAgent } from "@/lib/agent-auth";
import { prisma } from "@/lib/prisma";
import { sendIntegrationMessage } from "@/lib/integrations";
import { notifyAdmins } from "@/lib/notifications";
import { sendSecurityAlertEmail } from "@/lib/email";
import { evaluateWorkflows } from "@/lib/workflows/engine";
import { hasPermission } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const scanSchema = z.object({
  hostname: z.string(),
  software: z.array(z.object({
    name: z.string(),
    version: z.string(),
  })).min(1).max(1000),
});

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

/** Check if an installed version is vulnerable given the CVE's fixedVersion and affectedVersions. */
function isVersionVulnerable(installedVersion: string, fixedVersion: string | null, affectedVersions: string | null): boolean {
  // If there's a fixed version and the installed version is >= it, not vulnerable
  if (fixedVersion) {
    const cleaned = fixedVersion.replace(/^[<>=\s]+/, "").trim();
    if (cleaned && compareVersions(installedVersion, cleaned) >= 0) return false;
  }
  // If there's an affected version range, try to parse it
  if (affectedVersions) {
    const lower = affectedVersions.toLowerCase();
    // "< X.Y.Z" or "<= X.Y.Z" — vulnerable if installed is below that
    const ltMatch = lower.match(/^[<]=?\s*([\d.]+)/);
    if (ltMatch) {
      const isLte = lower.startsWith("<=");
      const cmp = compareVersions(installedVersion, ltMatch[1]);
      return isLte ? cmp <= 0 : cmp < 0;
    }
    // "all versions before X.Y.Z" pattern
    const beforeMatch = lower.match(/before\s+([\d.]+)/);
    if (beforeMatch) return compareVersions(installedVersion, beforeMatch[1]) < 0;
  }
  // No version info to compare — assume vulnerable (name matched)
  return true;
}

export async function POST(request: NextRequest) {
  // Accept both user sessions and agent auth
  const session = await auth();
  const agentAuth = !session ? await authenticateAgent(request) : null;
  if (!session && !agentAuth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session && !hasPermission(session.user.role, "security:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = scanSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const orgId = session?.user.organizationId || agentAuth!.organizationId;
    const { hostname, software } = parsed.data;

    // Get all known CVEs for this org
    const knownCves = await prisma.cveEntry.findMany({
      where: { organizationId: orgId, status: "OPEN" },
    });

    // Match installed software against known CVEs (name + version comparison)
    const matchedCves: Array<{ software: string; version: string; cveId: string; cveEntryId: string; severity: string }> = [];
    const patchedCveIds: string[] = [];

    for (const sw of software) {
      for (const cve of knownCves) {
        if (cve.affectedSoftware.toLowerCase() === sw.name.toLowerCase()) {
          if (isVersionVulnerable(sw.version, cve.fixedVersion, cve.affectedVersions)) {
            matchedCves.push({
              software: sw.name,
              version: sw.version,
              cveId: cve.cveId,
              cveEntryId: cve.id,
              severity: cve.severity,
            });
          } else {
            // Software is installed but version is patched — auto-resolve
            patchedCveIds.push(cve.id);
          }
        }
      }
    }

    // Auto-mark CVEs as PATCHED when the installed version is >= fixedVersion
    if (patchedCveIds.length > 0) {
      await prisma.cveEntry.updateMany({
        where: { id: { in: patchedCveIds }, status: "OPEN" },
        data: { status: "PATCHED", applicability: "NOT_APPLICABLE", resolvedAt: new Date() },
      });
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
          userId: session?.user.id || "",
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

      // Email admins for HIGH/CRITICAL alerts
      const admins = await prisma.user.findMany({
        where: { organizationId: orgId, role: { in: ["ADMIN", "SUPER_ADMIN"] }, status: "ACTIVE" },
        select: { email: true },
      });
      const adminEmails = admins.map(a => a.email).filter(Boolean);
      if (adminEmails.length > 0) {
        const dashboardUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/security`;
        sendSecurityAlertEmail({
          to: adminEmails,
          alertType: `${criticalMatches.length} Critical CVE${criticalMatches.length > 1 ? "s" : ""} Detected`,
          severity: criticalMatches.some(m => m.severity === "CRITICAL") ? "CRITICAL" : "HIGH",
          message: `Vulnerable software detected on ${hostname}: ${criticalMatches.map(m => `${m.cveId} (${m.software} v${m.version})`).join(", ")}`,
          dashboardUrl,
        }).catch(err => console.error("[security] Alert email failed:", err));
      }

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
