import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const querySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  userId: z.string().optional(),
  status: z.enum(["ACTIVE", "COMPLETED", "EDITED", "FLAGGED"]).optional(),
  limit: z.coerce.number().min(1).max(200).default(50),
  offset: z.coerce.number().min(0).default(0),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = session.user.organizationId;
  const canReadAll = hasPermission(session.user.role, "time-entries:read-all");

  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const parsed = querySchema.safeParse(searchParams);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { from, to, userId, status, limit, offset } = parsed.data;

    // Build the where clause
    const where: Record<string, unknown> = {
      organizationId: orgId,
    };

    // Employees can only see their own entries
    if (!canReadAll) {
      where.userId = session.user.id;
    } else if (userId) {
      where.userId = userId;
    }

    if (status) {
      where.status = status;
    }

    if (from || to) {
      where.clockIn = {};
      if (from) (where.clockIn as Record<string, unknown>).gte = new Date(from);
      if (to) (where.clockIn as Record<string, unknown>).lte = new Date(to);
    }

    const [timeEntries, total] = await Promise.all([
      prisma.timeEntry.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { clockIn: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.timeEntry.count({ where }),
    ]);

    return NextResponse.json({
      timeEntries,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error("Error fetching time entries:", error);
    return NextResponse.json(
      { error: "Failed to fetch time entries" },
      { status: 500 }
    );
  }
}
