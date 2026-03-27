import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "security:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgId = session.user.organizationId;
  const hostname = request.nextUrl.searchParams.get("hostname");
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get("limit") || "100"), 500);

  const where: Record<string, unknown> = { organizationId: orgId };
  if (hostname) where.hostname = hostname;

  try {
    const results = await prisma.cveScanResult.findMany({
      where,
      include: {
        cveEntry: {
          select: { cveId: true, severity: true, cvssScore: true, status: true },
        },
      },
      orderBy: { scannedAt: "desc" },
      take: limit,
    });

    // Get unique hostnames
    const hostnames = await prisma.cveScanResult.groupBy({
      by: ["hostname"],
      where: { organizationId: orgId },
      _count: { hostname: true },
    });

    return NextResponse.json({
      results,
      hostnames: hostnames.map(h => ({ hostname: h.hostname, scanCount: h._count.hostname })),
    });
  } catch (error) {
    console.error("Error fetching scan results:", error);
    return NextResponse.json({ error: "Failed to fetch scan results" }, { status: 500 });
  }
}
