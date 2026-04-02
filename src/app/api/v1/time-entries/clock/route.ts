import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { emitRealtimeEvent, managersChannel } from "@/lib/realtime";
import { hasPermission } from "@/lib/permissions";

export async function POST() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user.role, "time-entries:write")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = session.user.id;
  const orgId = session.user.organizationId;

  try {
    // Check if there's an active (open) time entry
    const activeEntry = await prisma.timeEntry.findFirst({
      where: {
        userId,
        organizationId: orgId,
        status: "ACTIVE",
        clockOut: null,
      },
      orderBy: { clockIn: "desc" },
    });

    if (activeEntry) {
      // Clock out: close the active entry
      const now = new Date();
      const durationSeconds = Math.floor(
        (now.getTime() - activeEntry.clockIn.getTime()) / 1000
      );

      const updatedEntry = await prisma.timeEntry.update({
        where: { id: activeEntry.id },
        data: {
          clockOut: now,
          activeSeconds: durationSeconds,
          status: "COMPLETED",
        },
      });

      // Update today's attendance record with clock-out time
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      await prisma.attendanceRecord.updateMany({
        where: { userId, organizationId: orgId, date: todayStart },
        data: { checkOut: now },
      }).catch(() => { /* ignore if no record */ });

      emitRealtimeEvent({
        organizationId: orgId,
        channel: managersChannel(orgId),
        eventType: "CLOCK_OUT",
        payload: { userId: session.user.id, userName: session.user.name, time: new Date().toISOString() },
      }).catch(() => {});

      return NextResponse.json({
        action: "clock_out",
        timeEntry: updatedEntry,
      });
    } else {
      // Clock in: check if agent must be running first
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { requireAgentForClock: true },
      });

      if (org?.requireAgentForClock) {
        // Check for an online agent device for this user
        const onlineDevice = await prisma.agentDevice.findFirst({
          where: {
            userId,
            organizationId: orgId,
            status: "ONLINE",
          },
        });

        if (!onlineDevice) {
          return NextResponse.json(
            {
              error: "Agent required",
              message:
                "Your monitoring agent must be running before you can clock in. Please start the MyDex agent on your device and try again.",
            },
            { status: 403 }
          );
        }
      }

      const now = new Date();
      const newEntry = await prisma.timeEntry.create({
        data: {
          userId,
          organizationId: orgId,
          clockIn: now,
          status: "ACTIVE",
        },
      });

      // Auto-create attendance record for today if none exists
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const existingAttendance = await prisma.attendanceRecord.findFirst({
        where: { userId, organizationId: orgId, date: todayStart },
      });
      if (!existingAttendance) {
        await prisma.attendanceRecord.create({
          data: {
            userId,
            organizationId: orgId,
            date: todayStart,
            status: "PRESENT",
            checkIn: now,
          },
        }).catch(() => { /* ignore if duplicate race */ });
      }

      emitRealtimeEvent({
        organizationId: orgId,
        channel: managersChannel(orgId),
        eventType: "CLOCK_IN",
        payload: { userId: session.user.id, userName: session.user.name, time: new Date().toISOString() },
      }).catch(() => {});

      return NextResponse.json({
        action: "clock_in",
        timeEntry: newEntry,
      });
    }
  } catch (error) {
    console.error("Clock in/out error:", error);
    return NextResponse.json(
      { error: "Failed to process clock action" },
      { status: 500 }
    );
  }
}
