import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";

// GET - list MDM devices with filtering, search, and pagination
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "mdm:read"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const providerId = searchParams.get("providerId");
  const compliance = searchParams.get("compliance");
  const enrollment = searchParams.get("enrollment");
  const unmatched = searchParams.get("unmatched");
  const search = searchParams.get("search");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
  const skip = (page - 1) * limit;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    organizationId: session.user.organizationId,
  };

  if (providerId) where.mdmProviderId = providerId;
  if (compliance) where.complianceStatus = compliance;
  if (enrollment) where.enrollmentStatus = enrollment;
  if (unmatched === "true") where.agentDeviceId = null;

  if (search) {
    where.OR = [
      { hostname: { contains: search, mode: "insensitive" } },
      { serialNumber: { contains: search, mode: "insensitive" } },
      { userEmail: { contains: search, mode: "insensitive" } },
      { deviceName: { contains: search, mode: "insensitive" } },
    ];
  }

  const [devices, total] = await Promise.all([
    prisma.mdmDevice.findMany({
      where,
      include: {
        mdmProvider: { select: { name: true, providerType: true } },
        matchedUser: { select: { id: true, name: true, email: true } },
        agentDevice: { select: { id: true, hostname: true } },
      },
      orderBy: { lastSyncedAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.mdmDevice.count({ where }),
  ]);

  return NextResponse.json({
    devices,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
