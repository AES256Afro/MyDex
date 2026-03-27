import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import {
  User,
  Mail,
  Building2,
  Briefcase,
  Clock,
  CalendarCheck,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import type { Role, UserStatus, TimeEntryStatus, AttendanceStatus } from "@/generated/prisma";

function roleBadgeVariant(role: Role) {
  switch (role) {
    case "SUPER_ADMIN":
      return "destructive" as const;
    case "ADMIN":
      return "default" as const;
    case "MANAGER":
      return "warning" as const;
    case "EMPLOYEE":
      return "secondary" as const;
  }
}

function statusBadgeVariant(status: UserStatus) {
  switch (status) {
    case "ACTIVE":
      return "success" as const;
    case "INACTIVE":
      return "secondary" as const;
    case "SUSPENDED":
      return "destructive" as const;
  }
}

function timeEntryStatusVariant(status: TimeEntryStatus) {
  switch (status) {
    case "ACTIVE":
      return "success" as const;
    case "COMPLETED":
      return "secondary" as const;
    case "EDITED":
      return "warning" as const;
    case "FLAGGED":
      return "destructive" as const;
  }
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

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
    },
  });

  if (!employee) notFound();

  // Fetch recent time entries (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [recentTimeEntries, attendanceRecords] = await Promise.all([
    prisma.timeEntry.findMany({
      where: {
        userId: employee.id,
        clockIn: { gte: thirtyDaysAgo },
      },
      orderBy: { clockIn: "desc" },
      take: 15,
    }),
    prisma.attendanceRecord.findMany({
      where: {
        userId: employee.id,
        date: { gte: thirtyDaysAgo },
      },
      orderBy: { date: "desc" },
    }),
  ]);

  // Compute attendance summary
  const attendanceSummary: Record<AttendanceStatus, number> = {
    PRESENT: 0,
    ABSENT: 0,
    HALF_DAY: 0,
    LEAVE: 0,
    HOLIDAY: 0,
    WEEKEND: 0,
  };
  for (const record of attendanceRecords) {
    attendanceSummary[record.status]++;
  }

  const totalHoursWorked = recentTimeEntries.reduce((acc, entry) => {
    return acc + entry.activeSeconds + entry.idleSeconds;
  }, 0);

  return (
    <div className="space-y-6">
      <Link
        href="/employees"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Employees
      </Link>

      {/* Profile Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <Avatar className="h-20 w-20">
              {employee.image && (
                <AvatarImage src={employee.image} alt={employee.name} />
              )}
              <AvatarFallback className="text-xl">
                {getInitials(employee.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-3">
              <div>
                <h1 className="text-2xl font-bold">{employee.name}</h1>
                <div className="flex flex-wrap gap-2 mt-1">
                  <Badge variant={roleBadgeVariant(employee.role)}>
                    {employee.role.replace("_", " ")}
                  </Badge>
                  <Badge variant={statusBadgeVariant(employee.status)}>
                    {employee.status}
                  </Badge>
                </div>
              </div>
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  {employee.email}
                </div>
                {employee.department && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    {employee.department}
                  </div>
                )}
                {employee.jobTitle && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Briefcase className="h-4 w-4" />
                    {employee.jobTitle}
                  </div>
                )}
                {employee.manager && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-4 w-4" />
                    Reports to{" "}
                    <Link
                      href={`/employees/${employee.manager.id}`}
                      className="underline hover:text-foreground"
                    >
                      {employee.manager.name}
                    </Link>
                  </div>
                )}
              </div>
              {employee.directReports.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">Direct reports:</span>{" "}
                  {employee.directReports.map((r, i) => (
                    <span key={r.id}>
                      {i > 0 && ", "}
                      <Link
                        href={`/employees/${r.id}`}
                        className="underline hover:text-foreground"
                      >
                        {r.name}
                      </Link>
                    </span>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Member since {format(new Date(employee.createdAt), "MMM d, yyyy")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Attendance Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarCheck className="h-5 w-5" />
              Attendance Summary (30 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {attendanceRecords.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No attendance records in the last 30 days.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {attendanceSummary.PRESENT}
                  </div>
                  <div className="text-xs text-muted-foreground">Present</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {attendanceSummary.ABSENT}
                  </div>
                  <div className="text-xs text-muted-foreground">Absent</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {attendanceSummary.HALF_DAY}
                  </div>
                  <div className="text-xs text-muted-foreground">Half Day</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {attendanceSummary.LEAVE}
                  </div>
                  <div className="text-xs text-muted-foreground">Leave</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-muted-foreground">
                    {attendanceSummary.HOLIDAY}
                  </div>
                  <div className="text-xs text-muted-foreground">Holiday</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-muted-foreground">
                    {attendanceSummary.WEEKEND}
                  </div>
                  <div className="text-xs text-muted-foreground">Weekend</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hours Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5" />
              Time Summary (30 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {formatDuration(totalHoursWorked)}
                </div>
                <div className="text-xs text-muted-foreground">Total Time</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {recentTimeEntries.length}
                </div>
                <div className="text-xs text-muted-foreground">Sessions</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Time Entries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5" />
            Recent Time Entries
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentTimeEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No time entries in the last 30 days.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Date
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Clock In
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Clock Out
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Duration
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentTimeEntries.map((entry) => {
                    const duration = entry.clockOut
                      ? Math.floor(
                          (new Date(entry.clockOut).getTime() -
                            new Date(entry.clockIn).getTime()) /
                            1000
                        )
                      : Math.floor(
                          (Date.now() - new Date(entry.clockIn).getTime()) / 1000
                        );
                    return (
                      <tr
                        key={entry.id}
                        className="border-b last:border-0 hover:bg-muted/50"
                      >
                        <td className="py-3 pr-4">
                          {format(new Date(entry.clockIn), "MMM d, yyyy")}
                        </td>
                        <td className="py-3 pr-4">
                          {format(new Date(entry.clockIn), "h:mm a")}
                        </td>
                        <td className="py-3 pr-4">
                          {entry.clockOut
                            ? format(new Date(entry.clockOut), "h:mm a")
                            : "—"}
                        </td>
                        <td className="py-3 pr-4">{formatDuration(duration)}</td>
                        <td className="py-3">
                          <Badge variant={timeEntryStatusVariant(entry.status)}>
                            {entry.status}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
