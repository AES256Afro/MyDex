import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import type { AttendanceStatus } from "@/generated/prisma";

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: "P",
  ABSENT: "A",
  HALF_DAY: "H",
  LEAVE: "L",
  HOLIDAY: "HO",
  WEEKEND: "W",
};

const STATUS_COLORS: Record<AttendanceStatus, string> = {
  PRESENT: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  ABSENT: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  HALF_DAY: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  LEAVE: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  HOLIDAY: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  WEEKEND: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

export default async function AttendancePage() {
  const session = await auth();
  if (!session) redirect("/login");

  if (!hasPermission(session.user.role, "attendance:read")) {
    redirect("/dashboard");
  }

  const canReadAll = hasPermission(session.user.role, "attendance:read-all");
  const orgId = session.user.organizationId;

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Fetch employees (all if manager/admin, just self if employee)
  const employees = canReadAll
    ? await prisma.user.findMany({
        where: { organizationId: orgId, status: "ACTIVE" },
        select: { id: true, name: true, department: true },
        orderBy: { name: "asc" },
      })
    : await prisma.user.findMany({
        where: { id: session.user.id },
        select: { id: true, name: true, department: true },
      });

  // Fetch attendance records for the current month
  const records = await prisma.attendanceRecord.findMany({
    where: {
      organizationId: orgId,
      date: { gte: monthStart, lte: monthEnd },
      ...(canReadAll ? {} : { userId: session.user.id }),
    },
  });

  // Build lookup: userId -> date string -> status
  const recordMap = new Map<string, Map<string, AttendanceStatus>>();
  for (const record of records) {
    const dateKey = format(record.date, "yyyy-MM-dd");
    if (!recordMap.has(record.userId)) {
      recordMap.set(record.userId, new Map());
    }
    recordMap.get(record.userId)!.set(dateKey, record.status);
  }

  // Compute per-employee stats
  const employeeStats = employees.map((emp) => {
    const userRecords = recordMap.get(emp.id);
    let present = 0;
    let absent = 0;
    let halfDay = 0;
    let leave = 0;
    let holiday = 0;

    if (userRecords) {
      for (const status of userRecords.values()) {
        switch (status) {
          case "PRESENT":
            present++;
            break;
          case "ABSENT":
            absent++;
            break;
          case "HALF_DAY":
            halfDay++;
            break;
          case "LEAVE":
            leave++;
            break;
          case "HOLIDAY":
            holiday++;
            break;
        }
      }
    }

    return { ...emp, present, absent, halfDay, leave, holiday };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Attendance</h1>
          <p className="text-muted-foreground">
            {format(now, "MMMM yyyy")} overview
          </p>
        </div>
        <Link
          href="/attendance/leave-requests"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
        >
          Leave Requests
        </Link>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {(
          Object.entries(STATUS_LABELS) as [AttendanceStatus, string][]
        ).map(([status, label]) => (
          <div key={status} className="flex items-center gap-1.5">
            <span
              className={`inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold ${STATUS_COLORS[status]}`}
            >
              {label}
            </span>
            <span className="text-muted-foreground capitalize">
              {status.replace("_", " ").toLowerCase()}
            </span>
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Monthly Calendar &mdash; {format(now, "MMMM yyyy")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="sticky left-0 bg-card z-10 pb-2 pr-3 text-left font-medium text-muted-foreground min-w-[140px]">
                    Employee
                  </th>
                  {daysInMonth.map((day) => (
                    <th
                      key={day.toISOString()}
                      className="pb-2 px-0.5 text-center font-medium text-muted-foreground min-w-[28px]"
                    >
                      <div>{format(day, "d")}</div>
                      <div className="text-[9px]">
                        {format(day, "EEE").charAt(0)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => {
                  const userMap = recordMap.get(emp.id);
                  return (
                    <tr
                      key={emp.id}
                      className="border-b last:border-0 hover:bg-muted/50"
                    >
                      <td className="sticky left-0 bg-card z-10 py-1.5 pr-3 font-medium truncate max-w-[140px]">
                        {emp.name}
                      </td>
                      {daysInMonth.map((day) => {
                        const dateKey = format(day, "yyyy-MM-dd");
                        const status = userMap?.get(dateKey);
                        const dayOfWeek = day.getDay();
                        const isWeekend =
                          dayOfWeek === 0 || dayOfWeek === 6;

                        return (
                          <td
                            key={dateKey}
                            className="py-1.5 px-0.5 text-center"
                          >
                            {status ? (
                              <span
                                className={`inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold ${STATUS_COLORS[status]}`}
                              >
                                {STATUS_LABELS[status]}
                              </span>
                            ) : isWeekend ? (
                              <span className="inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500">
                                W
                              </span>
                            ) : (
                              <span className="inline-flex h-5 w-5 items-center justify-center rounded text-[10px] text-muted-foreground">
                                &mdash;
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {employees.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No attendance data to display.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Stats Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Attendance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 pr-4 font-medium text-muted-foreground">
                    Employee
                  </th>
                  <th className="pb-3 pr-4 font-medium text-muted-foreground">
                    Department
                  </th>
                  <th className="pb-3 pr-4 font-medium text-muted-foreground text-center">
                    Present
                  </th>
                  <th className="pb-3 pr-4 font-medium text-muted-foreground text-center">
                    Absent
                  </th>
                  <th className="pb-3 pr-4 font-medium text-muted-foreground text-center">
                    Half Day
                  </th>
                  <th className="pb-3 pr-4 font-medium text-muted-foreground text-center">
                    Leave
                  </th>
                  <th className="pb-3 font-medium text-muted-foreground text-center">
                    Holiday
                  </th>
                </tr>
              </thead>
              <tbody>
                {employeeStats.map((emp) => (
                  <tr
                    key={emp.id}
                    className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                  >
                    <td className="py-3 pr-4 font-medium">{emp.name}</td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {emp.department ?? "\u2014"}
                    </td>
                    <td className="py-3 pr-4 text-center">
                      <Badge variant="success">{emp.present}</Badge>
                    </td>
                    <td className="py-3 pr-4 text-center">
                      <Badge variant="destructive">{emp.absent}</Badge>
                    </td>
                    <td className="py-3 pr-4 text-center">
                      <Badge variant="warning">{emp.halfDay}</Badge>
                    </td>
                    <td className="py-3 pr-4 text-center">
                      <Badge variant="default">{emp.leave}</Badge>
                    </td>
                    <td className="py-3 text-center">
                      <Badge variant="secondary">{emp.holiday}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
