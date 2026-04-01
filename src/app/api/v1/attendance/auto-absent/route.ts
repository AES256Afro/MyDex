import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET /api/v1/attendance/auto-absent
// Called by Vercel Cron daily at 9 PM UTC (weekdays only)
// Authenticated via CRON_SECRET
//
// For each active org, marks employees as ABSENT or LEAVE
// if they have no attendance record, time entry, or approved leave for today.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0=Sun, 6=Sat

  // Skip weekends (redundant with cron schedule, but safe)
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return NextResponse.json({
      skipped: true,
      reason: "Weekend",
      timestamp: now.toISOString(),
    });
  }

  // Today's date at midnight UTC
  const todayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const todayEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999)
  );

  let processed = 0;
  let absent = 0;
  let onLeave = 0;
  let skipped = 0;

  try {
    // Get all active organizations
    const organizations = await prisma.organization.findMany({
      select: { id: true },
    });

    for (const org of organizations) {
      // Get all active employees (not SUPER_ADMIN)
      const employees = await prisma.user.findMany({
        where: {
          organizationId: org.id,
          status: "ACTIVE",
          role: { not: "SUPER_ADMIN" },
        },
        select: { id: true },
      });

      for (const employee of employees) {
        processed++;

        // Check if they already have an attendance record for today
        const existingRecord = await prisma.attendanceRecord.findUnique({
          where: {
            userId_date: {
              userId: employee.id,
              date: todayStart,
            },
          },
        });

        if (existingRecord) {
          skipped++;
          continue;
        }

        // Check if they have a time entry with clockIn today
        const timeEntry = await prisma.timeEntry.findFirst({
          where: {
            userId: employee.id,
            organizationId: org.id,
            clockIn: { gte: todayStart, lte: todayEnd },
          },
        });

        if (timeEntry) {
          skipped++;
          continue;
        }

        // Check if they have an approved leave request covering today
        const leaveRequest = await prisma.leaveRequest.findFirst({
          where: {
            userId: employee.id,
            organizationId: org.id,
            status: "APPROVED",
            startDate: { lte: todayStart },
            endDate: { gte: todayStart },
          },
        });

        if (leaveRequest) {
          // Mark as ON_LEAVE
          await prisma.attendanceRecord.create({
            data: {
              userId: employee.id,
              organizationId: org.id,
              date: todayStart,
              status: "LEAVE",
              source: "auto-absent-cron",
              notes: `Auto-marked: approved ${leaveRequest.leaveType.toLowerCase()} leave`,
            },
          });
          onLeave++;
        } else {
          // Mark as ABSENT
          await prisma.attendanceRecord.create({
            data: {
              userId: employee.id,
              organizationId: org.id,
              date: todayStart,
              status: "ABSENT",
              source: "auto-absent-cron",
              notes: "Auto-marked: no attendance or time entry recorded",
            },
          });
          absent++;
        }
      }
    }

    return NextResponse.json({
      processed,
      absent,
      onLeave,
      skipped,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("Error running auto-absent cron:", error);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}
