import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

function scoreColor(score: number | null): string {
  if (score === null) return "secondary";
  if (score >= 80) return "success";
  if (score >= 60) return "warning";
  return "destructive";
}

function formatHours(seconds: number): string {
  return (Math.round((seconds / 3600) * 10) / 10).toFixed(1);
}

function trendIndicator(current: number, previous: number): string {
  if (previous === 0) return "--";
  const change = ((current - previous) / previous) * 100;
  const rounded = Math.round(change * 10) / 10;
  if (rounded > 0) return `+${rounded}%`;
  if (rounded < 0) return `${rounded}%`;
  return "0%";
}

export default async function ProductivityPage() {
  const session = await auth();
  if (!session) redirect("/login");

  if (!hasPermission(session.user.role, "activity:read")) {
    redirect("/dashboard");
  }

  const canReadAll = hasPermission(session.user.role, "activity:read-all");
  const orgId = session.user.organizationId;

  const now = new Date();
  const currentStart = startOfDay(subDays(now, 30));
  const currentEnd = endOfDay(now);
  const previousStart = startOfDay(subDays(now, 60));
  const previousEnd = endOfDay(subDays(now, 31));

  // Current period summaries
  const currentSummaries = await prisma.activitySummary.findMany({
    where: {
      organizationId: orgId,
      date: { gte: currentStart, lte: currentEnd },
      hour: null,
      ...(canReadAll ? {} : { userId: session.user.id }),
    },
    include: {
      user: {
        select: { id: true, name: true, email: true, department: true },
      },
    },
  });

  // If no summaries, try to compute from raw ActivityEvents
  let rawEventSummaries: typeof currentSummaries = [];
  if (currentSummaries.length === 0) {
    const rawEvents = await prisma.activityEvent.findMany({
      where: {
        organizationId: orgId,
        timestamp: { gte: currentStart, lte: currentEnd },
        ...(canReadAll ? {} : { userId: session.user.id }),
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, department: true },
        },
      },
      orderBy: { timestamp: "asc" },
    });

    if (rawEvents.length > 0) {
      // Group events by user+date and infer durations
      const byUserDate = new Map<string, typeof rawEvents>();
      for (const ev of rawEvents) {
        const dateKey = `${ev.userId}-${format(ev.timestamp, "yyyy-MM-dd")}`;
        if (!byUserDate.has(dateKey)) byUserDate.set(dateKey, []);
        byUserDate.get(dateKey)!.push(ev);
      }

      for (const [, events] of byUserDate) {
        let totalActive = 0;
        for (let i = 0; i < events.length; i++) {
          if (events[i].durationSeconds && events[i].durationSeconds! > 0) {
            totalActive += events[i].durationSeconds!;
          } else if (i < events.length - 1) {
            const diff = Math.floor((events[i + 1].timestamp.getTime() - events[i].timestamp.getTime()) / 1000);
            totalActive += Math.min(diff, 600); // Cap at 10 min
          } else {
            totalActive += 30;
          }
        }

        const ev0 = events[0];
        // Estimate productivity: productive apps get higher scores
        const score = Math.min(100, Math.round((totalActive / 28800) * 100)); // % of 8h workday

        rawEventSummaries.push({
          id: `computed-${ev0.userId}-${format(ev0.timestamp, "yyyy-MM-dd")}`,
          organizationId: orgId,
          userId: ev0.userId,
          date: startOfDay(ev0.timestamp),
          hour: null,
          totalActiveSeconds: totalActive,
          totalIdleSeconds: 0,
          topApps: {},
          topSites: {},
          topDomains: {},
          productivityScore: score,
          createdAt: new Date(),
          user: ev0.user,
        } as typeof currentSummaries[0]);
      }
    }
  }

  const effectiveSummaries = currentSummaries.length > 0 ? currentSummaries : rawEventSummaries;

  // Previous period summaries (for trends)
  const previousSummaries = await prisma.activitySummary.findMany({
    where: {
      organizationId: orgId,
      date: { gte: previousStart, lte: previousEnd },
      hour: null,
      ...(canReadAll ? {} : { userId: session.user.id }),
    },
  });

  // Attendance data for current period
  const attendanceRecords = await prisma.attendanceRecord.findMany({
    where: {
      organizationId: orgId,
      date: { gte: currentStart, lte: currentEnd },
      ...(canReadAll ? {} : { userId: session.user.id }),
    },
  });

  // Aggregate current period by user
  const userMap = new Map<
    string,
    {
      user: { id: string; name: string; email: string; department: string | null };
      scores: number[];
      activeSeconds: number;
      idleSeconds: number;
      days: number;
    }
  >();

  for (const s of effectiveSummaries) {
    if (!userMap.has(s.userId)) {
      userMap.set(s.userId, {
        user: s.user,
        scores: [],
        activeSeconds: 0,
        idleSeconds: 0,
        days: 0,
      });
    }
    const entry = userMap.get(s.userId)!;
    if (s.productivityScore !== null) entry.scores.push(s.productivityScore);
    entry.activeSeconds += s.totalActiveSeconds;
    entry.idleSeconds += s.totalIdleSeconds;
    entry.days++;
  }

  const employees = Array.from(userMap.values())
    .map((e) => ({
      ...e,
      avgScore:
        e.scores.length > 0
          ? Math.round(e.scores.reduce((a, b) => a + b, 0) / e.scores.length)
          : null,
      avgActiveHoursPerDay:
        e.days > 0
          ? Math.round((e.activeSeconds / e.days / 3600) * 10) / 10
          : 0,
    }))
    .sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0));

  // Org-wide current metrics
  const allCurrentScores = effectiveSummaries
    .filter((s) => s.productivityScore !== null)
    .map((s) => s.productivityScore!);
  const avgProductivityScore =
    allCurrentScores.length > 0
      ? Math.round(
          allCurrentScores.reduce((a, b) => a + b, 0) / allCurrentScores.length
        )
      : 0;

  const totalActiveSeconds = effectiveSummaries.reduce(
    (sum, s) => sum + s.totalActiveSeconds,
    0
  );
  const uniqueUserDays = new Set(
    effectiveSummaries.map((s) => `${s.userId}-${s.date.toISOString()}`)
  ).size;
  const avgActiveHoursPerDay =
    uniqueUserDays > 0
      ? Math.round((totalActiveSeconds / uniqueUserDays / 3600) * 10) / 10
      : 0;

  // Attendance rate
  const totalAttendance = attendanceRecords.length;
  const presentCount = attendanceRecords.filter(
    (r) => r.status === "PRESENT" || r.status === "HALF_DAY"
  ).length;
  const attendanceRate =
    totalAttendance > 0
      ? Math.round((presentCount / totalAttendance) * 1000) / 10
      : 0;

  // Previous period metrics for trend comparison
  const allPrevScores = previousSummaries
    .filter((s) => s.productivityScore !== null)
    .map((s) => s.productivityScore!);
  const prevAvgScore =
    allPrevScores.length > 0
      ? Math.round(
          allPrevScores.reduce((a, b) => a + b, 0) / allPrevScores.length
        )
      : 0;

  const prevTotalActive = previousSummaries.reduce(
    (sum, s) => sum + s.totalActiveSeconds,
    0
  );
  const prevUniqueDays = new Set(
    previousSummaries.map((s) => `${s.userId}-${s.date.toISOString()}`)
  ).size;
  const prevAvgActiveHours =
    prevUniqueDays > 0
      ? Math.round((prevTotalActive / prevUniqueDays / 3600) * 10) / 10
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Productivity & Engagement
        </h1>
        <p className="text-muted-foreground">
          Organization productivity insights for the last 30 days (
          {format(currentStart, "MMM d")} - {format(currentEnd, "MMM d, yyyy")})
        </p>
      </div>

      {/* Engagement Metrics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Productivity Score</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{avgProductivityScore}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              vs last period: {trendIndicator(avgProductivityScore, prevAvgScore)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Active Hours/Day</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{avgActiveHoursPerDay}h</div>
            <p className="text-xs text-muted-foreground mt-1">
              vs last period:{" "}
              {trendIndicator(avgActiveHoursPerDay, prevAvgActiveHours)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Attendance Rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{attendanceRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {presentCount} of {totalAttendance} records
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Employees Tracked</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{employees.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              with activity data this period
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Productivity Scores by Employee</CardTitle>
          <CardDescription>
            Sorted by average productivity score (highest first)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {employees.length === 0 ? (
            <div className="py-8 text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                No productivity data available for this period.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 max-w-md mx-auto text-left space-y-2">
                <p className="text-sm font-medium">To start tracking productivity:</p>
                <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                  <li>Install the MyDex agent on employee devices</li>
                  <li>Employees open the <a href="/tracker" className="text-primary underline">web tracker</a> or use the desktop agent</li>
                  <li>Activity events are automatically collected and scored</li>
                </ol>
                <p className="text-xs text-muted-foreground mt-2">
                  Want to see what this looks like? Check the <a href="/demo" className="text-primary underline">interactive demo</a>.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 pr-4 font-medium text-muted-foreground w-8">
                      #
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Employee
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Department
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground text-center">
                      Avg Score
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground text-center">
                      Avg Active Hours/Day
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground text-center">
                      Total Active Hours
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground text-center">
                      Days Tracked
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp, index) => (
                    <tr
                      key={emp.user.id}
                      className="border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <td className="py-3 pr-4 text-muted-foreground">
                        {index + 1}
                      </td>
                      <td className="py-3 pr-4 font-medium">
                        <Link href={`/employees/${emp.user.id}`} className="text-primary hover:underline">
                          {emp.user.name}
                        </Link>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {emp.user.department ?? "\u2014"}
                      </td>
                      <td className="py-3 pr-4 text-center">
                        <Badge
                          variant={
                            scoreColor(emp.avgScore) as
                              | "success"
                              | "warning"
                              | "destructive"
                              | "secondary"
                          }
                        >
                          {emp.avgScore !== null ? `${emp.avgScore}%` : "N/A"}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-center text-muted-foreground">
                        {emp.avgActiveHoursPerDay}h
                      </td>
                      <td className="py-3 pr-4 text-center text-muted-foreground">
                        {formatHours(emp.activeSeconds)}h
                      </td>
                      <td className="py-3 text-center text-muted-foreground">
                        {emp.days}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
