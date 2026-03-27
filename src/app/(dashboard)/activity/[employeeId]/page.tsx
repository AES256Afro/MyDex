import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { format, startOfMonth, endOfMonth } from "date-fns";

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function BarChart({
  items,
  label,
}: {
  items: { name: string; value: number }[];
  label: string;
}) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No data</p>
      ) : (
        items.map((item) => (
          <div key={item.name} className="flex items-center gap-3">
            <span className="text-xs w-32 truncate text-right text-muted-foreground">
              {item.name}
            </span>
            <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
              <div
                className="h-full bg-primary rounded transition-all"
                style={{
                  width: `${Math.max((item.value / max) * 100, 2)}%`,
                }}
              />
            </div>
            <span className="text-xs w-14 text-muted-foreground">
              {formatDuration(item.value)}
            </span>
          </div>
        ))
      )}
    </div>
  );
}

export default async function EmployeeActivityPage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  if (!hasPermission(session.user.role, "activity:read")) {
    redirect("/dashboard");
  }

  const { employeeId } = await params;
  const canReadAll = hasPermission(session.user.role, "activity:read-all");

  // Employees can only view their own activity
  if (!canReadAll && employeeId !== session.user.id) {
    redirect("/activity");
  }

  const orgId = session.user.organizationId;

  // Verify employee belongs to same org
  const employee = await prisma.user.findFirst({
    where: { id: employeeId, organizationId: orgId },
    select: { id: true, name: true, email: true, department: true, jobTitle: true },
  });

  if (!employee) {
    redirect("/activity");
  }

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  // Fetch daily summaries for this employee
  const summaries = await prisma.activitySummary.findMany({
    where: {
      userId: employeeId,
      organizationId: orgId,
      date: { gte: monthStart, lte: monthEnd },
      hour: null,
    },
    orderBy: { date: "desc" },
  });

  // Fetch recent activity events (last 100)
  const recentEvents = await prisma.activityEvent.findMany({
    where: {
      userId: employeeId,
      organizationId: orgId,
      timestamp: { gte: monthStart, lte: monthEnd },
    },
    orderBy: { timestamp: "desc" },
    take: 100,
  });

  // Aggregate app and domain usage from summaries
  const appTotals = new Map<string, number>();
  const domainTotals = new Map<string, number>();
  let totalActive = 0;
  let totalIdle = 0;
  const scores: number[] = [];

  for (const summary of summaries) {
    totalActive += summary.totalActiveSeconds;
    totalIdle += summary.totalIdleSeconds;
    if (summary.productivityScore !== null) {
      scores.push(summary.productivityScore);
    }

    const topApps = summary.topApps as Array<{
      name: string;
      seconds: number;
    }>;
    const topDomains = summary.topDomains as Array<{
      name: string;
      seconds: number;
    }>;

    if (Array.isArray(topApps)) {
      for (const app of topApps) {
        appTotals.set(
          app.name,
          (appTotals.get(app.name) || 0) + (app.seconds || 0)
        );
      }
    }

    if (Array.isArray(topDomains)) {
      for (const domain of topDomains) {
        domainTotals.set(
          domain.name,
          (domainTotals.get(domain.name) || 0) + (domain.seconds || 0)
        );
      }
    }
  }

  const topApps = Array.from(appTotals.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const topDomains = Array.from(domainTotals.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const avgScore =
    scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {employee.name}
          </h1>
          <p className="text-muted-foreground">
            {employee.jobTitle ? `${employee.jobTitle} \u2022 ` : ""}
            {employee.department ?? "No department"} &mdash; Activity for{" "}
            {format(now, "MMMM yyyy")}
          </p>
        </div>
        <Link
          href="/activity"
          className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          Back to Activity
        </Link>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Active Time</p>
            <p className="text-2xl font-bold">{formatDuration(totalActive)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Idle Time</p>
            <p className="text-2xl font-bold">{formatDuration(totalIdle)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Days Tracked</p>
            <p className="text-2xl font-bold">{summaries.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Avg Productivity</p>
            <p className="text-2xl font-bold">
              {avgScore !== null ? `${avgScore}%` : "N/A"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* App & Website Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">App Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart items={topApps} label="Top applications" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Website Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart items={topDomains} label="Top websites" />
          </CardContent>
        </Card>
      </div>

      {/* Daily Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Daily Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {summaries.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No daily summaries for this period.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Date
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground text-center">
                      Active
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground text-center">
                      Idle
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground text-center">
                      Score
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {summaries.map((s) => (
                    <tr
                      key={s.id}
                      className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-3 pr-4 font-medium">
                        {format(s.date, "EEE, MMM d")}
                      </td>
                      <td className="py-3 pr-4 text-center text-muted-foreground">
                        {formatDuration(s.totalActiveSeconds)}
                      </td>
                      <td className="py-3 pr-4 text-center text-muted-foreground">
                        {formatDuration(s.totalIdleSeconds)}
                      </td>
                      <td className="py-3 text-center">
                        {s.productivityScore !== null ? (
                          <Badge
                            variant={
                              s.productivityScore >= 80
                                ? "success"
                                : s.productivityScore >= 60
                                  ? "warning"
                                  : "destructive"
                            }
                          >
                            {Math.round(s.productivityScore)}%
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {recentEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No recent activity events.
            </p>
          ) : (
            <div className="space-y-1">
              {recentEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 py-2 border-b last:border-0"
                >
                  <span className="text-xs text-muted-foreground w-36 shrink-0 pt-0.5">
                    {format(event.timestamp, "MMM d, HH:mm:ss")}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {event.eventType.replace("_", " ")}
                      </Badge>
                      {event.appName && (
                        <span className="text-sm font-medium truncate">
                          {event.appName}
                        </span>
                      )}
                    </div>
                    {event.windowTitle && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {event.windowTitle}
                      </p>
                    )}
                    {event.domain && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {event.domain}
                        {event.durationSeconds
                          ? ` \u2022 ${formatDuration(event.durationSeconds)}`
                          : ""}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
