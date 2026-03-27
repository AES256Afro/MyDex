import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { format, startOfDay, endOfDay, subDays } from "date-fns";

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `<1m`;
}

function BarChart({ items, label, colorClass }: { items: { name: string; value: number }[]; label: string; colorClass?: string }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  const colors = [
    "bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-amber-500", "bg-rose-500",
    "bg-cyan-500", "bg-pink-500", "bg-indigo-500", "bg-teal-500", "bg-orange-500",
  ];
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No data</p>
      ) : (
        items.map((item, idx) => (
          <div key={item.name} className="flex items-center gap-3">
            <span className="text-xs w-32 truncate text-right text-muted-foreground">{item.name}</span>
            <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
              <div
                className={`h-full ${colorClass || colors[idx % colors.length]} rounded transition-all`}
                style={{ width: `${Math.max((item.value / max) * 100, 2)}%` }}
              />
            </div>
            <span className="text-xs w-14 text-muted-foreground">{formatDuration(item.value)}</span>
          </div>
        ))
      )}
    </div>
  );
}

// Infer durations from consecutive events
function inferDurations<T extends { timestamp: Date; durationSeconds: number | null }>(
  events: T[]
): (T & { inferredDuration: number })[] {
  const sorted = [...events].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  return sorted.map((ev, i) => {
    if (ev.durationSeconds && ev.durationSeconds > 0) {
      return { ...ev, inferredDuration: ev.durationSeconds };
    }
    if (i < sorted.length - 1) {
      const diff = Math.floor((sorted[i + 1].timestamp.getTime() - ev.timestamp.getTime()) / 1000);
      return { ...ev, inferredDuration: Math.min(diff, 600) }; // Cap at 10min
    }
    return { ...ev, inferredDuration: 30 };
  });
}

export default async function EmployeeActivityPage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (!hasPermission(session.user.role, "activity:read")) redirect("/dashboard");

  const { employeeId } = await params;
  const canReadAll = hasPermission(session.user.role, "activity:read-all");
  if (!canReadAll && employeeId !== session.user.id) redirect("/activity");

  const orgId = session.user.organizationId;

  const employee = await prisma.user.findFirst({
    where: { id: employeeId, organizationId: orgId },
    select: { id: true, name: true, email: true, department: true, jobTitle: true },
  });
  if (!employee) redirect("/activity");

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekStart = subDays(todayStart, 7);

  // Fetch activity events for the past 7 days
  const allEvents = await prisma.activityEvent.findMany({
    where: {
      userId: employeeId,
      organizationId: orgId,
      timestamp: { gte: weekStart, lte: todayEnd },
    },
    orderBy: { timestamp: "desc" },
    take: 2000,
  });

  // Split by type
  const appEvents = allEvents.filter((e) => e.eventType === "APP_SWITCH");
  const webEvents = allEvents.filter((e) => e.eventType === "WEBSITE_VISIT");
  const fileEvents = allEvents.filter((e) =>
    ["FILE_CREATE", "FILE_DELETE", "FILE_COPY", "FILE_MOVE", "FILE_RENAME"].includes(e.eventType)
  );

  // Infer durations
  const appsWithDuration = inferDurations(appEvents);
  const websWithDuration = inferDurations(webEvents);

  // Aggregate app time
  const appTotals = new Map<string, number>();
  for (const ev of appsWithDuration) {
    const app = ev.appName || "unknown";
    appTotals.set(app, (appTotals.get(app) || 0) + ev.inferredDuration);
  }
  const topApps = Array.from(appTotals.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  // Aggregate domain time
  const domainTotals = new Map<string, number>();
  for (const ev of websWithDuration) {
    const domain = ev.domain || "unknown";
    domainTotals.set(domain, (domainTotals.get(domain) || 0) + ev.inferredDuration);
  }
  const topDomains = Array.from(domainTotals.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  // Total active seconds
  const totalActive = [...appsWithDuration, ...websWithDuration].reduce((sum, e) => sum + e.inferredDuration, 0);

  // Daily breakdown
  const dailyMap = new Map<string, { active: number; apps: number; sites: number; files: number }>();
  for (let d = 0; d < 7; d++) {
    const day = subDays(todayStart, d);
    const key = format(day, "yyyy-MM-dd");
    dailyMap.set(key, { active: 0, apps: 0, sites: 0, files: 0 });
  }
  for (const ev of appsWithDuration) {
    const key = format(ev.timestamp, "yyyy-MM-dd");
    const entry = dailyMap.get(key);
    if (entry) { entry.active += ev.inferredDuration; entry.apps++; }
  }
  for (const ev of websWithDuration) {
    const key = format(ev.timestamp, "yyyy-MM-dd");
    const entry = dailyMap.get(key);
    if (entry) { entry.active += ev.inferredDuration; entry.sites++; }
  }
  for (const ev of fileEvents) {
    const key = format(ev.timestamp, "yyyy-MM-dd");
    const entry = dailyMap.get(key);
    if (entry) entry.files++;
  }
  const dailyBreakdown = Array.from(dailyMap.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => b.date.localeCompare(a.date));

  // Hourly heatmap for today
  const todayEvents = [...appsWithDuration, ...websWithDuration].filter(
    (e) => e.timestamp >= todayStart && e.timestamp <= todayEnd
  );
  const hourlyData = Array(24).fill(0);
  for (const ev of todayEvents) {
    const hour = ev.timestamp.getHours();
    hourlyData[hour] += ev.inferredDuration;
  }
  const maxHour = Math.max(...hourlyData, 1);

  // Unique counts
  const uniqueApps = new Set(appEvents.map((e) => e.appName).filter(Boolean)).size;
  const uniqueDomains = new Set(webEvents.map((e) => e.domain).filter(Boolean)).size;

  // Productivity estimate: ratio of active time to expected 8h workday
  const avgDailyActive = totalActive / Math.max(dailyBreakdown.filter((d) => d.active > 0).length, 1);
  const productivityPct = Math.min(Math.round((avgDailyActive / (8 * 3600)) * 100), 100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{employee.name}</h1>
          <p className="text-muted-foreground">
            {employee.jobTitle ? `${employee.jobTitle} \u2022 ` : ""}
            {employee.department ?? "No department"} &mdash; Last 7 days
          </p>
        </div>
        <Link
          href="/activity"
          className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          Back to Activity
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Active</p>
            <p className="text-2xl font-bold">{formatDuration(totalActive)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Avg Daily</p>
            <p className="text-2xl font-bold">{formatDuration(Math.round(avgDailyActive))}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Apps Used</p>
            <p className="text-2xl font-bold">{uniqueApps}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Sites Visited</p>
            <p className="text-2xl font-bold">{uniqueDomains}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Productivity</p>
            <p className="text-2xl font-bold">
              <Badge variant={productivityPct >= 70 ? "success" : productivityPct >= 50 ? "warning" : "destructive"}>
                {productivityPct}%
              </Badge>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Today's Hourly Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Today&apos;s Hourly Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-1" style={{ height: 100 }}>
            {hourlyData.map((sec: number, hour: number) => {
              const pct = (sec / maxHour) * 100;
              const intensity = sec === 0 ? "bg-muted" : pct > 75 ? "bg-blue-600" : pct > 50 ? "bg-blue-500" : pct > 25 ? "bg-blue-400" : "bg-blue-300";
              return (
                <div key={hour} className="flex-1 flex flex-col items-center" title={`${hour}:00 — ${formatDuration(sec)}`}>
                  <div className={`w-full rounded-t ${intensity}`} style={{ height: `${Math.max(pct, 2)}%` }} />
                </div>
              );
            })}
          </div>
          <div className="flex gap-1 mt-1">
            {hourlyData.map((_: number, hour: number) => (
              <div key={hour} className="flex-1 text-center text-[9px] text-muted-foreground">
                {hour % 3 === 0 ? `${hour}` : ""}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* App & Website Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">App Usage</CardTitle></CardHeader>
          <CardContent>
            <BarChart items={topApps} label="Top applications" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-lg">Website Usage</CardTitle></CardHeader>
          <CardContent>
            <BarChart items={topDomains} label="Top websites" colorClass="bg-emerald-500" />
          </CardContent>
        </Card>
      </div>

      {/* Daily Breakdown */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Daily Breakdown</CardTitle></CardHeader>
        <CardContent>
          {dailyBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No data</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">Date</th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground text-center">Active Time</th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground text-center">App Switches</th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground text-center">Site Visits</th>
                    <th className="pb-3 font-medium text-muted-foreground text-center">File Ops</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyBreakdown.map((d) => (
                    <tr key={d.date} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="py-3 pr-4 font-medium">{format(new Date(d.date), "EEE, MMM d")}</td>
                      <td className="py-3 pr-4 text-center text-muted-foreground">{d.active > 0 ? formatDuration(d.active) : "—"}</td>
                      <td className="py-3 pr-4 text-center text-muted-foreground">{d.apps || "—"}</td>
                      <td className="py-3 pr-4 text-center text-muted-foreground">{d.sites || "—"}</td>
                      <td className="py-3 text-center text-muted-foreground">{d.files || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity Timeline */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Recent Activity Timeline</CardTitle></CardHeader>
        <CardContent>
          {allEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No recent activity events.</p>
          ) : (
            <div className="space-y-1 max-h-[500px] overflow-y-auto">
              {allEvents.slice(0, 200).map((event) => (
                <div key={event.id} className="flex items-start gap-3 py-2 border-b last:border-0">
                  <span className="text-xs text-muted-foreground w-36 shrink-0 pt-0.5">
                    {format(event.timestamp, "MMM d, HH:mm:ss")}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {event.eventType.replace("_", " ")}
                      </Badge>
                      {event.appName && <span className="text-sm font-medium truncate">{event.appName}</span>}
                    </div>
                    {event.windowTitle && <p className="text-xs text-muted-foreground truncate mt-0.5">{event.windowTitle}</p>}
                    {event.domain && <p className="text-xs text-muted-foreground mt-0.5">{event.domain}</p>}
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
