import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendIntegrationMessage } from "@/lib/integrations";
import { notifyAdmins } from "@/lib/notifications";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const bulkLookupSchema = z.object({
  hashes: z.array(z.object({
    hashType: z.enum(["MD5", "SHA1", "SHA256"]),
    hashValue: z.string(),
  })).min(1).max(500),
  hostname: z.string().optional(),
  userId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = bulkLookupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const orgId = session.user.organizationId;
    const { hashes, hostname, userId } = parsed.data;

    // Look up all hashes against the IOC database
    const hashValues = hashes.map(h => h.hashValue.toLowerCase());
    const matches = await prisma.iocEntry.findMany({
      where: {
        organizationId: orgId,
        hashValue: { in: hashValues },
      },
    });

    const matchedHashes = new Set(matches.map(m => m.hashValue));
    const blocked = matches.filter(m => m.isBlocked);

    // Record matches
    if (matches.length > 0) {
      await prisma.iocMatch.createMany({
        data: matches.map(m => ({
          iocEntryId: m.id,
          organizationId: orgId,
          userId: userId || session.user.id,
          hostname: hostname,
          matchedAt: new Date(),
        })),
      });

      // Update match counts and lastSeenAt
      await Promise.all(matches.map(m =>
        prisma.iocEntry.update({
          where: { id: m.id },
          data: {
            matchCount: { increment: 1 },
            lastSeenAt: new Date(),
          },
        })
      ));

      // Create security alerts for high/critical matches
      const criticalMatches = matches.filter(m => m.severity === "CRITICAL" || m.severity === "HIGH");
      if (criticalMatches.length > 0) {
        await prisma.securityAlert.createMany({
          data: criticalMatches.map(m => ({
            userId: userId || session.user.id,
            organizationId: orgId,
            alertType: "POLICY_VIOLATION" as const,
            severity: m.severity,
            title: `IOC Match: ${m.threatName || m.hashValue}`,
            description: `Known malicious hash detected${hostname ? ` on ${hostname}` : ""}. Hash: ${m.hashValue} (${m.hashType})`,
            metadata: { iocEntryId: m.id, hashType: m.hashType, hashValue: m.hashValue, hostname },
          })),
        });

        // Send Slack/Teams notification for IOC matches
        sendIntegrationMessage(orgId, {
          title: `🚨 ${criticalMatches.length} Malicious IOC${criticalMatches.length > 1 ? "s" : ""} Detected`,
          message: criticalMatches.map(m => `• *${m.threatName || "Unknown Threat"}*: ${m.hashValue.slice(0, 16)}… (${m.hashType})`).join("\n"),
          color: "#DC2626",
          link: `${process.env.NEXTAUTH_URL || "https://mydexnow.com"}/security`,
          fields: [
            ...(hostname ? [{ label: "Host", value: hostname }] : []),
            { label: "Matches", value: String(matches.length) },
            { label: "Blocked", value: String(blocked.length) },
          ],
        }).catch(() => {});

        // In-app notification for admins
        notifyAdmins({
          organizationId: orgId,
          type: "SECURITY_ALERT",
          title: `Malicious IOC${criticalMatches.length > 1 ? "s" : ""} Detected`,
          message: `${criticalMatches.length} known threat${criticalMatches.length > 1 ? "s" : ""} found${hostname ? ` on ${hostname}` : ""}`,
          link: "/security",
        }).catch(() => {});
      }
    }

    return NextResponse.json({
      checked: hashes.length,
      matched: matches.length,
      blocked: blocked.length,
      matches: matches.map(m => ({
        hashType: m.hashType,
        hashValue: m.hashValue,
        threatName: m.threatName,
        severity: m.severity,
        isBlocked: m.isBlocked,
      })),
      blockedHashes: blocked.map(b => b.hashValue),
    });
  } catch (error) {
    console.error("Error looking up IOC hashes:", error);
    return NextResponse.json({ error: "Failed to lookup hashes" }, { status: 500 });
  }
}
