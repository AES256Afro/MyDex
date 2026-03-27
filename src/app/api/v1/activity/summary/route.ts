import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const querySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  userId: z.string().optional(),
  limit: z.coerce.number().min(1).max(500).default(100),
  offset: z.coerce.number().min(0).default(0),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = session.user.organizationId;
  const canReadAll = hasPermission(session.user.role, "activity:read-all");

  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const parsed = querySchema.safeParse(searchParams);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { from, to, userId, limit, offset } = parsed.data;

    const where: Record<string, unknown> = {
      organizationId: orgId,
    };

    if (!canReadAll) {
      where.userId = session.user.id;
    } else if (userId) {
      where.userId = userId;
    }

    if (from || to) {
      where.date = {};
      if (from) (where.date as Record<string, unknown>).gte = new Date(from);
      if (to) (where.date as Record<string, unknown>).lte = new Date(to);
    }

    const [summaries, total] = await Promise.all([
      prisma.activitySummary.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true, department: true },
          },
        },
        orderBy: { date: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.activitySummary.count({ where }),
    ]);

    return NextResponse.json({
      summaries,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error("Error fetching activity summaries:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity summaries" },
      { status: 500 }
    );
  }
}
