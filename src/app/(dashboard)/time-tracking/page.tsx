import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { ClockWidget } from "@/components/time-tracking/clock-widget";
import { LocalTime } from "@/components/local-time";
import type { TimeEntryStatus } from "@/generated/prisma";
import { ExportButton } from "@/components/shared/export-button";

function statusVariant(status: TimeEntryStatus) {
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

export default async function TimeTrackingPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const orgId = session.user.organizationId;
  const userId = session.user.id;
  const canReadAll = hasPermission(session.user.role, "time-entries:read-all");

  // Fetch active entry for the current user (for clock widget)
  const activeEntry = await prisma.timeEntry.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      clockOut: null,
    },
    orderBy: { clockIn: "desc" },
  });

  // Fetch recent time entries (scoped to org for managers/admins, or self for employees)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const timeEntries = await prisma.timeEntry.findMany({
    where: {
      organizationId: orgId,
      clockIn: { gte: sevenDaysAgo },
      ...(canReadAll ? {} : { userId }),
    },
    include: {
      user: {
        select: { id: true, name: true, image: true },
      },
    },
    orderBy: { clockIn: "desc" },
    take: 50,
  });

  const initialActiveEntry = activeEntry
    ? {
        id: activeEntry.id,
        clockIn: activeEntry.clockIn.toISOString(),
        status: activeEntry.status,
      }
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Time Tracking</h1>
          <p className="text-muted-foreground">
            Track your work hours and view time entries
          </p>
        </div>
        <ExportButton type="time-entries" />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Clock Widget - takes 1 column */}
        <div className="md:col-span-1">
          <ClockWidget initialActiveEntry={initialActiveEntry} />
        </div>

        {/* Stats cards */}
        <div className="md:col-span-2 grid gap-4 sm:grid-cols-3">
          {(() => {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayEntries = timeEntries.filter(
              (e) => e.userId === userId && new Date(e.clockIn) >= todayStart
            );
            const todaySeconds = todayEntries.reduce((acc, e) => {
              const end = e.clockOut ? new Date(e.clockOut).getTime() : Date.now();
              return acc + Math.floor((end - new Date(e.clockIn).getTime()) / 1000);
            }, 0);
            const weekEntries = timeEntries.filter((e) => e.userId === userId);
            const weekSeconds = weekEntries.reduce((acc, e) => {
              const end = e.clockOut ? new Date(e.clockOut).getTime() : Date.now();
              return acc + Math.floor((end - new Date(e.clockIn).getTime()) / 1000);
            }, 0);
            const activeSessions = canReadAll
              ? timeEntries.filter((e) => e.status === "ACTIVE" && !e.clockOut).length
              : undefined;
            return (
              <>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">
                      {formatDuration(todaySeconds)}
                    </div>
                    <p className="text-xs text-muted-foreground">Today</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">
                      {formatDuration(weekSeconds)}
                    </div>
                    <p className="text-xs text-muted-foreground">This Week</p>
                  </CardContent>
                </Card>
                {activeSessions !== undefined && (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{activeSessions}</div>
                      <p className="text-xs text-muted-foreground">
                        Active Sessions (Org)
                      </p>
                    </CardContent>
                  </Card>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* Time Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5" />
            {canReadAll ? "Organization Time Entries" : "Your Time Entries"} (Last
            7 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {timeEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No time entries found. Click &quot;Clock In&quot; to start tracking.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    {canReadAll && (
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">
                        Employee
                      </th>
                    )}
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
                  {timeEntries.map((entry) => {
                    const durationSec = entry.clockOut
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
                        className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                      >
                        {canReadAll && (
                          <td className="py-3 pr-4 font-medium">
                            {entry.user.name}
                          </td>
                        )}
                        <td className="py-3 pr-4">
                          <LocalTime date={entry.clockIn.toISOString()} fmt="MMM d, yyyy" />
                        </td>
                        <td className="py-3 pr-4">
                          <LocalTime date={entry.clockIn.toISOString()} fmt="h:mm a" />
                        </td>
                        <td className="py-3 pr-4">
                          {entry.clockOut
                            ? <LocalTime date={entry.clockOut.toISOString()} fmt="h:mm a" />
                            : "—"}
                        </td>
                        <td className="py-3 pr-4">
                          {formatDuration(durationSec)}
                        </td>
                        <td className="py-3">
                          <Badge variant={statusVariant(entry.status)}>
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
