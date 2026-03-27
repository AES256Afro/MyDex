import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const querySchema = z.object({
  status: z
    .enum(["PENDING", "APPROVED", "REJECTED", "CANCELLED"])
    .optional(),
  userId: z.string().optional(),
  limit: z.coerce.number().min(1).max(200).default(50),
  offset: z.coerce.number().min(0).default(0),
});

const createSchema = z.object({
  leaveType: z.enum([
    "ANNUAL",
    "SICK",
    "PERSONAL",
    "UNPAID",
    "MATERNITY",
    "PATERNITY",
    "OTHER",
  ]),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  reason: z.string().optional(),
});

const patchSchema = z.object({
  id: z.string().min(1),
  action: z.enum(["APPROVED", "REJECTED"]),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = session.user.organizationId;
  const canReadAll = hasPermission(session.user.role, "attendance:read-all");

  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const parsed = querySchema.safeParse(searchParams);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { status, userId, limit, offset } = parsed.data;

    const where: Record<string, unknown> = {
      organizationId: orgId,
    };

    // Employees can only see their own requests
    if (!canReadAll) {
      where.userId = session.user.id;
    } else if (userId) {
      where.userId = userId;
    }

    if (status) {
      where.status = status;
    }

    const [requests, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true, department: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.leaveRequest.count({ where }),
    ]);

    return NextResponse.json({
      requests,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error("Error fetching leave requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch leave requests" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { leaveType, startDate, endDate, reason } = parsed.data;

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      return NextResponse.json(
        { error: "End date cannot be before start date" },
        { status: 400 }
      );
    }

    // Check for overlapping requests
    const overlapping = await prisma.leaveRequest.findFirst({
      where: {
        userId: session.user.id,
        status: { in: ["PENDING", "APPROVED"] },
        startDate: { lte: end },
        endDate: { gte: start },
      },
    });

    if (overlapping) {
      return NextResponse.json(
        { error: "You already have a leave request overlapping these dates" },
        { status: 409 }
      );
    }

    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        userId: session.user.id,
        organizationId: session.user.organizationId,
        leaveType,
        startDate: start,
        endDate: end,
        reason,
      },
    });

    return NextResponse.json({ leaveRequest }, { status: 201 });
  } catch (error) {
    console.error("Error creating leave request:", error);
    return NextResponse.json(
      { error: "Failed to create leave request" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user.role, "leave:approve")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { id, action } = parsed.data;

    // Ensure the request belongs to the same org
    const existing = await prisma.leaveRequest.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Leave request not found" },
        { status: 404 }
      );
    }

    if (existing.status !== "PENDING") {
      return NextResponse.json(
        { error: "Only pending requests can be approved or rejected" },
        { status: 400 }
      );
    }

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: action,
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
      },
    });

    // If approved, create attendance records for the leave days
    if (action === "APPROVED") {
      const start = new Date(existing.startDate);
      const end = new Date(existing.endDate);
      const days: Date[] = [];
      const cursor = new Date(start);
      while (cursor <= end) {
        days.push(new Date(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }

      for (const day of days) {
        await prisma.attendanceRecord.upsert({
          where: {
            userId_date: {
              userId: existing.userId,
              date: day,
            },
          },
          update: { status: "LEAVE", source: "leave-request", notes: existing.reason },
          create: {
            userId: existing.userId,
            organizationId: session.user.organizationId,
            date: day,
            status: "LEAVE",
            source: "leave-request",
            notes: existing.reason,
          },
        });
      }
    }

    return NextResponse.json({ leaveRequest: updated });
  } catch (error) {
    console.error("Error updating leave request:", error);
    return NextResponse.json(
      { error: "Failed to update leave request" },
      { status: 500 }
    );
  }
}
