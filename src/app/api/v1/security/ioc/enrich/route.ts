import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const enrichSchema = z.object({
  vtApiKey: z.string().min(1, "VirusTotal API key required"),
  ids: z.array(z.string()).optional(), // specific IDs, or all if empty
  limit: z.number().min(1).max(50).default(20),
});

type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

function mapSeverity(detections: number): Severity {
  if (detections >= 20) return "CRITICAL";
  if (detections >= 10) return "HIGH";
  if (detections >= 3) return "MEDIUM";
  return "LOW";
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "security:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = enrichSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const orgId = session.user.organizationId;
    const { vtApiKey, ids, limit } = parsed.data;

    // Get IOC entries to enrich
    const where: Record<string, unknown> = { organizationId: orgId };
    if (ids && ids.length > 0) {
      where.id = { in: ids };
    }

    const entries = await prisma.iocEntry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, hashType: true, hashValue: true },
    });

    let enriched = 0;
    let failed = 0;
    const results: Array<{
      id: string;
      hash: string;
      detections: string;
      threatName: string;
      severity: string;
    }> = [];

    for (const entry of entries) {
      try {
        // Only look up actual file hashes (32/40/64 char hex strings)
        if (!/^[a-f0-9]{32,64}$/i.test(entry.hashValue)) {
          failed++;
          continue;
        }

        const res = await fetch(
          `https://www.virustotal.com/api/v3/files/${entry.hashValue}`,
          { headers: { "x-apikey": vtApiKey } }
        );

        if (res.status === 429) {
          // Rate limited — stop
          break;
        }

        if (!res.ok) {
          failed++;
          continue;
        }

        const data = await res.json();
        const attrs = data.data?.attributes;
        if (!attrs) {
          failed++;
          continue;
        }

        const malicious = attrs.last_analysis_stats?.malicious || 0;
        const total = Object.values(attrs.last_analysis_stats || {}).reduce(
          (sum: number, v) => sum + (v as number),
          0
        );
        const threatLabel =
          attrs.popular_threat_classification?.suggested_threat_label;
        const newSeverity = mapSeverity(malicious);
        const detectionStr = `${malicious}/${total}`;
        const newThreatName = threatLabel
          ? `${threatLabel} (${detectionStr} VT detections)`
          : `${detectionStr} VT detections`;

        await prisma.iocEntry.update({
          where: { id: entry.id },
          data: {
            threatName: newThreatName,
            severity: newSeverity,
            isBlocked: newSeverity === "CRITICAL" || newSeverity === "HIGH",
            description: `VT: ${detectionStr} detections | Type: ${attrs.type_description || "unknown"} | Size: ${attrs.size || "?"} bytes`,
          },
        });

        enriched++;
        results.push({
          id: entry.id,
          hash: entry.hashValue.slice(0, 16) + "...",
          detections: detectionStr,
          threatName: newThreatName,
          severity: newSeverity,
        });
      } catch {
        failed++;
      }
    }

    return NextResponse.json({
      total: entries.length,
      enriched,
      failed,
      results,
    });
  } catch (error) {
    console.error("Error enriching IOCs:", error);
    return NextResponse.json(
      { error: "Failed to enrich IOCs" },
      { status: 500 }
    );
  }
}
