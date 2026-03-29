import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";

// GET - list MDM devices
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "mdm:read"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const providerId = searchParams.get("providerId");
  const complianceStatus = searchParams.get("complianceStatus");
  const enrollmentStatus = searchParams.get("enrollmentStatus");
  const unmatched = searchParams.get("unmatched");

  const where: Record<string, unknown> = {
    organizationId: session.user.organizationId,
  };

  if (providerId) where.mdmProviderId = providerId;
  if (complianceStatus) where.complianceStatus = complianceStatus;
  if (enrollmentStatus) where.enrollmentStatus = enrollmentStatus;
  if (unmatched === "true") where.agentDeviceId = null;

  const devices = await prisma.mdmDevice.findMany({
    where,
    include: {
      mdmProvider: { select: { id: true, name: true, providerType: true } },
      agentDevice: { select: { id: true, hostname: true, platform: true, status: true, userId: true } },
    },
    orderBy: { lastSyncedAt: "desc" },
  });

  return NextResponse.json({ devices });
}
