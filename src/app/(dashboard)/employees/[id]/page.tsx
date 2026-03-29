import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import EmployeeDetailClient from "./employee-detail-client";

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  if (!hasPermission(session.user.role, "employees:read")) {
    redirect("/dashboard");
  }

  const { id } = await params;

  const employee = await prisma.user.findFirst({
    where: {
      id,
      organizationId: session.user.organizationId,
    },
    include: {
      manager: { select: { id: true, name: true } },
      directReports: { select: { id: true, name: true, image: true } },
      agentDevices: { select: { id: true, hostname: true, platform: true, status: true } },
    },
  });

  if (!employee) notFound();

  // Fetch data in parallel
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [recentTimeEntries, attendanceRecords, tickets, recentActivity, boardingTasks] =
    await Promise.all([
      prisma.timeEntry.findMany({
        where: { userId: employee.id, clockIn: { gte: thirtyDaysAgo } },
        orderBy: { clockIn: "desc" },
        take: 15,
      }),
      prisma.attendanceRecord.findMany({
        where: { userId: employee.id, date: { gte: thirtyDaysAgo } },
        orderBy: { date: "desc" },
      }),
      prisma.supportTicket.findMany({
        where: { submittedBy: employee.id, organizationId: session.user.organizationId },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          assignee: { select: { id: true, name: true } },
          device: { select: { hostname: true } },
        },
      }),
      prisma.activityEvent.findMany({
        where: {
          userId: employee.id,
          eventType: {
            in: [
              "FILE_CREATE",
              "FILE_DELETE",
              "FILE_COPY",
              "FILE_MOVE",
              "FILE_RENAME",
              "HEARTBEAT",
              "APP_SWITCH",
            ],
          },
          timestamp: { gte: thirtyDaysAgo },
        },
        orderBy: { timestamp: "desc" },
        take: 50,
      }),
      prisma.boardingTask.findMany({
        where: { userId: employee.id, organizationId: session.user.organizationId },
        orderBy: [{ type: "asc" }, { sortOrder: "asc" }],
        include: { completedBy: { select: { id: true, name: true } } },
      }),
    ]);

  // Get MDM devices matched to this user
  const mdmDevices = await prisma.mdmDevice.findMany({
    where: {
      organizationId: session.user.organizationId,
      matchedUserId: employee.id,
    },
    include: {
      mdmProvider: { select: { name: true, providerType: true } },
      agentDevice: { select: { hostname: true } },
    },
    orderBy: { lastSyncedAt: "desc" },
  });

  // Also get USB events from the last 30 days
  const usbEvents = employee.agentDevices.length > 0
    ? await prisma.usbDeviceEvent.findMany({
        where: {
          deviceId: { in: employee.agentDevices.map((d) => d.id) },
          timestamp: { gte: thirtyDaysAgo },
        },
        orderBy: { timestamp: "desc" },
        take: 20,
        include: { device: { select: { hostname: true } } },
      })
    : [];

  // Serialize dates for client component
  const serialized = {
    employee: JSON.parse(JSON.stringify(employee)),
    recentTimeEntries: JSON.parse(JSON.stringify(recentTimeEntries)),
    attendanceRecords: JSON.parse(JSON.stringify(attendanceRecords)),
    tickets: JSON.parse(JSON.stringify(tickets)),
    recentActivity: JSON.parse(JSON.stringify(recentActivity)),
    usbEvents: JSON.parse(JSON.stringify(usbEvents)),
    boardingTasks: JSON.parse(JSON.stringify(boardingTasks)),
    mdmDevices: JSON.parse(JSON.stringify(mdmDevices)),
    canWrite: hasPermission(session.user.role, "employees:write"),
    currentUserId: session.user.id,
  };

  return <EmployeeDetailClient {...serialized} />;
}
