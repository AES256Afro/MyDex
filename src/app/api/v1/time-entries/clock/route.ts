import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

      return NextResponse.json({
        action: "clock_out",
        timeEntry: updatedEntry,
      });
    } else {
      // Clock in: create a new time entry
      const newEntry = await prisma.timeEntry.create({
        data: {
          userId,
          organizationId: orgId,
          clockIn: new Date(),
          status: "ACTIVE",
        },
      });

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
