import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";

// GET — Login history / audit trail
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = hasPermission(session.user.role, "security:read");
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);

  // Non-admins can only see their own login history
  const where: Record<string, unknown> = {};
  if (isAdmin && email) {
    where.email = email;
  } else if (!isAdmin) {
    where.email = session.user.email;
  }

  const attempts = await prisma.loginAttempt.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  // Stats
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const last7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [failedLast24h, totalLast7d] = await Promise.all([
    prisma.loginAttempt.count({
      where: { ...where, success: false, createdAt: { gte: last24h } },
    }),
    prisma.loginAttempt.count({
      where: { ...where, createdAt: { gte: last7d } },
    }),
  ]);

  return NextResponse.json({
    attempts,
    stats: {
      failedLast24h,
      totalLast7d,
    },
  });
}
