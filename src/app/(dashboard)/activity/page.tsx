"use client";

import { useRequireRole } from "@/hooks/use-require-role";
import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string | null;
}

interface ActivityEvent {
  id: string;
  userId: string;
  eventType: string;
  appName: string | null;
  windowTitle: string | null;
  url: string | null;
  domain: string | null;
  category: string | null;
  durationSeconds: number | null;
  metadata: Record<string, unknown> | null;
  timestamp: string;
  user: { id: string; name: string; email: string };
}

type DatePreset = "today" | "yesterday" | "this_week" | "custom";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getDateRange(preset: DatePreset): { from: string; to: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case "today":
      return { from: today.toISOString(), to: new Date(today.getTime() + 86400000 - 1).toISOString() };
    case "yesterday": {
      const yesterday = new Date(today.getTime() - 86400000);
      return { from: yesterday.toISOString(), to: new Date(yesterday.getTime() + 86400000 - 1).toISOString() };
    }
    case "this_week": {
      const day = today.getDay();
      const monday = new Date(today.getTime() - (day === 0 ? 6 : day - 1) * 86400000);
      return { from: monday.toISOString(), to: new Date(today.getTime() + 86400000 - 1).toISOString() };
    }
    default:
      return { from: today.toISOString(), to: new Date(today.getTime() + 86400000 - 1).toISOString() };
  }
}

// ─── Bar Chart ───────────────────────────────────────────────────────────────

function BarChart({ items, label }: { items: { name: string; value: number }[]; label: string }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  const colors = [
    "bg-blue-500",
    "bg-emerald-500",
    "bg-violet-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-cyan-500",
    "bg-pink-500",
    "bg-indigo-500",
    "bg-teal-500",
    "bg-orange-500",
  ];

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No data</p>
      ) : (
        items.map((item, idx) => (
          <div key={item.name} className="flex items-center gap-3">
            <span className="text-xs w-32 truncate text-right text-muted-foreground" title={item.name}>
              {item.name}
            </span>
            <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
              <div
                className={`h-full ${colors[idx % colors.length]} rounded transition-all`}
                style={{ width: `${Math.max((item.value / max) * 100, 2)}%` }}
              />
            </div>
            <span className="text-xs w-16 text-muted-foreground">{formatDuration(item.value)}</span>
          </div>
        ))
      )}
    </div>
  );
}

// ─── Hourly Heatmap ─────────────────────────────────────────────────────────

function HourlyHeatmap({
  apps,
  websites,
}: {
  apps: { timestamp: string; inferredDuration: number }[];
  websites: { timestamp: string; inferredDuration: number }[];
}) {
  // Group all events by hour (0-23) and sum durations
  const hourlyData = useMemo(() => {
    const hours = Array(24).fill(0);
    for (const ev of [...apps, ...websites]) {
      const hour = new Date(ev.timestamp).getHours();
      hours[hour] += ev.inferredDuration;
    }
    return hours;
  }, [apps, websites]);

  const maxSec = Math.max(...hourlyData, 1);

  return (
    <div>
      <div className="flex items-end gap-1" style={{ height: 120 }}>
        {hourlyData.map((sec, hour) => {
          const pct = (sec / maxSec) * 100;
          const intensity = sec === 0 ? "bg-muted" : pct > 75 ? "bg-blue-600" : pct > 50 ? "bg-blue-500" : pct > 25 ? "bg-blue-400" : "bg-blue-300";
          return (
            <div key={hour} className="flex-1 flex flex-col items-center gap-1" title={`${hour}:00 — ${formatDuration(sec)}`}>
              <div className={`w-full rounded-t ${intensity} transition-all`} style={{ height: `${Math.max(pct, 2)}%` }} />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1 mt-1">
        {hourlyData.map((_, hour) => (
          <div key={hour} className="flex-1 text-center text-[9px] text-muted-foreground">
            {hour % 3 === 0 ? `${hour}` : ""}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
        <span>Less</span>
        <div className="h-3 w-4 bg-muted rounded" />
        <div className="h-3 w-4 bg-blue-300 rounded" />
        <div className="h-3 w-4 bg-blue-400 rounded" />
        <div className="h-3 w-4 bg-blue-500 rounded" />
        <div className="h-3 w-4 bg-blue-600 rounded" />
        <span>More</span>
      </div>
    </div>
  );
}

// ─── Interactive Bar Chart ───────────────────────────────────────────────────

function InteractiveBarChart({
  items,
  label,
  onBarClick,
  selectedItem,
}: {
  items: { name: string; value: number }[];
  label: string;
  onBarClick?: (name: string) => void;
  selectedItem?: string | null;
}) {
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
          <div
            key={item.name}
            className={`flex items-center gap-3 cursor-pointer rounded px-1 py-0.5 transition-colors ${
              selectedItem === item.name ? "bg-muted ring-1 ring-primary" : "hover:bg-muted/50"
            }`}
            onClick={() => onBarClick?.(item.name)}
          >
            <span className="text-xs w-32 truncate text-right text-muted-foreground" title={item.name}>
              {item.name}
            </span>
            <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
              <div
                className={`h-full ${colors[idx % colors.length]} rounded transition-all`}
                style={{ width: `${Math.max((item.value / max) * 100, 2)}%` }}
              />
            </div>
            <span className="text-xs w-16 text-muted-foreground">{formatDuration(item.value)}</span>
          </div>
        ))
      )}
    </div>
  );
}

// ─── File Action Colors ──────────────────────────────────────────────────────

const FILE_ACTION_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  FILE_CREATE: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-400", label: "Created" },
  FILE_DELETE: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", label: "Deleted" },
  FILE_COPY: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400", label: "Copied" },
  FILE_MOVE: { bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-400", label: "Moved" },
  FILE_RENAME: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-400", label: "Renamed" },
};

// ─── Main Page Component ─────────────────────────────────────────────────────

export default function ActivityPage() {
  const { authorized } = useRequireRole("MANAGER");
  if (!authorized) return null;

  // State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [datePreset, setDatePreset] = useState<DatePreset>("today");
  const [customFrom, setCustomFrom] = useState(toISODate(new Date()));
  const [customTo, setCustomTo] = useState(toISODate(new Date()));

  const [websiteEvents, setWebsiteEvents] = useState<ActivityEvent[]>([]);
  const [appEvents, setAppEvents] = useState<ActivityEvent[]>([]);
  const [fileEvents, setFileEvents] = useState<ActivityEvent[]>([]);

  const [loading, setLoading] = useState(false);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [selectedAppFilter, setSelectedAppFilter] = useState<string | null>(null);

  // ─── Fetch employees on mount ────────────────────────────────────────────

  useEffect(() => {
    async function loadEmployees() {
      try {
        const res = await fetch("/api/v1/employees");
        if (!res.ok) throw new Error("Failed to fetch employees");
        const data = await res.json();
        const list: Employee[] = data.employees ?? data ?? [];
        setEmployees(list);
        if (list.length > 0) {
          setSelectedUserId(list[0].id);
        }
      } catch (err) {
        console.error("Error loading employees:", err);
      } finally {
        setEmployeesLoading(false);
      }
    }
    loadEmployees();
  }, []);

  // ─── Compute date range ──────────────────────────────────────────────────

  const dateRange = useMemo(() => {
    if (datePreset === "custom") {
      const from = new Date(customFrom + "T00:00:00").toISOString();
      const to = new Date(customTo + "T23:59:59").toISOString();
      return { from, to };
    }
    return getDateRange(datePreset);
  }, [datePreset, customFrom, customTo]);

  // ─── Fetch activity events ───────────────────────────────────────────────

  const fetchEvents = useCallback(
    async (eventType: string): Promise<ActivityEvent[]> => {
      if (!selectedUserId) return [];
      const params = new URLSearchParams({
        userId: selectedUserId,
        eventType,
        from: dateRange.from,
        to: dateRange.to,
        limit: "500",
      });
      const res = await fetch(`/api/v1/activity/events?${params}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.events ?? [];
    },
    [selectedUserId, dateRange]
  );

  const loadAllData = useCallback(async () => {
    if (!selectedUserId) return;
    setLoading(true);
    try {
      const [sites, apps, files] = await Promise.all([
        fetchEvents("WEBSITE_VISIT"),
        fetchEvents("APP_SWITCH"),
        Promise.all([
          fetchEvents("FILE_CREATE"),
          fetchEvents("FILE_DELETE"),
          fetchEvents("FILE_COPY"),
          fetchEvents("FILE_MOVE"),
          fetchEvents("FILE_RENAME"),
        ]).then((results) =>
          results
            .flat()
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        ),
      ]);
      setWebsiteEvents(sites);
      setAppEvents(apps);
      setFileEvents(files);
    } catch (err) {
      console.error("Error loading activity data:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedUserId, fetchEvents]);

  useEffect(() => {
    if (selectedUserId) {
      loadAllData();
    }
  }, [selectedUserId, dateRange, loadAllData]);

  // ─── Computed aggregations ───────────────────────────────────────────────

  // Calculate durations from consecutive events (time between this event and the next)
  // since the agent doesn't send durationSeconds
  const eventsWithDurations = useMemo(() => {
    function inferDurations(events: ActivityEvent[]): (ActivityEvent & { inferredDuration: number })[] {
      // Sort oldest first to calculate forward durations
      const sorted = [...events].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      return sorted.map((ev, i) => {
        // If the event already has a duration, use it
        if (ev.durationSeconds && ev.durationSeconds > 0) {
          return { ...ev, inferredDuration: ev.durationSeconds };
        }
        // Otherwise calculate from the gap to the next event
        if (i < sorted.length - 1) {
          const current = new Date(ev.timestamp).getTime();
          const next = new Date(sorted[i + 1].timestamp).getTime();
          const diffSec = Math.floor((next - current) / 1000);
          // Cap at 10 minutes — anything longer is likely idle/away
          return { ...ev, inferredDuration: Math.min(diffSec, 600) };
        }
        // Last event — assume still active, give it 30 seconds
        return { ...ev, inferredDuration: 30 };
      });
    }
    return {
      websites: inferDurations(websiteEvents),
      apps: inferDurations(appEvents),
    };
  }, [websiteEvents, appEvents]);

  const domainAggregation = useMemo(() => {
    const map = new Map<string, number>();
    for (const ev of eventsWithDurations.websites) {
      // Use domain if available, otherwise extract from windowTitle or use appName
      const domain = ev.domain || ev.windowTitle || ev.appName || "unknown";
      map.set(domain, (map.get(domain) || 0) + ev.inferredDuration);
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [eventsWithDurations.websites]);

  const appAggregation = useMemo(() => {
    const map = new Map<string, number>();
    for (const ev of eventsWithDurations.apps) {
      const app = ev.appName || "unknown";
      map.set(app, (map.get(app) || 0) + ev.inferredDuration);
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [eventsWithDurations.apps]);

  const totalActiveSeconds = useMemo(() => {
    const siteSecs = eventsWithDurations.websites.reduce((sum, e) => sum + e.inferredDuration, 0);
    const appSecs = eventsWithDurations.apps.reduce((sum, e) => sum + e.inferredDuration, 0);
    return siteSecs + appSecs;
  }, [eventsWithDurations]);

  const uniqueDomains = useMemo(() => new Set(websiteEvents.map((e) => e.domain || e.windowTitle || e.appName || "unknown").filter(Boolean)).size, [websiteEvents]);
  const uniqueApps = useMemo(() => new Set(appEvents.map((e) => e.appName).filter(Boolean)).size, [appEvents]);

  const selectedEmployee = employees.find((e) => e.id === selectedUserId);

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Activity Dashboard</h1>
        <p className="text-muted-foreground">Detailed activity monitoring and site visit timeline</p>
      </div>

      {/* Controls: Employee selector + Date range */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
            {/* Employee selector */}
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium text-muted-foreground block mb-1.5">Employee</label>
              {employeesLoading ? (
                <div className="h-10 bg-muted animate-pulse rounded" />
              ) : (
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.email})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Date preset buttons */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-foreground">Date Range</label>
              <div className="flex gap-2">
                {(
                  [
                    { key: "today", label: "Today" },
                    { key: "yesterday", label: "Yesterday" },
                    { key: "this_week", label: "This Week" },
                    { key: "custom", label: "Custom" },
                  ] as const
                ).map(({ key, label }) => (
                  <Button
                    key={key}
                    variant={datePreset === key ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDatePreset(key)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom date inputs */}
            {datePreset === "custom" && (
              <div className="flex gap-2 items-end">
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1.5">From</label>
                  <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="w-40" />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1.5">To</label>
                  <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="w-40" />
                </div>
              </div>
            )}

            {/* Refresh + View Profile */}
            <div className="flex gap-2">
              <Button onClick={loadAllData} disabled={loading || !selectedUserId} variant="outline" size="sm">
                {loading ? "Loading..." : "Refresh"}
              </Button>
              {selectedUserId && (
                <Link href={`/activity/${selectedUserId}`}>
                  <Button variant="default" size="sm">
                    Full Report
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-muted-foreground">Total Active Time</p>
            <p className="text-2xl font-bold mt-1">{formatDuration(totalActiveSeconds)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-muted-foreground">Sites Visited</p>
            <p className="text-2xl font-bold mt-1">{uniqueDomains}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-muted-foreground">Apps Used</p>
            <p className="text-2xl font-bold mt-1">{uniqueApps}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-muted-foreground">File Operations</p>
            <p className="text-2xl font-bold mt-1">{fileEvents.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Hourly Activity Heatmap */}
      {!loading && selectedUserId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Hourly Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {eventsWithDurations.apps.length > 0 || eventsWithDurations.websites.length > 0 ? (
              <HourlyHeatmap apps={eventsWithDurations.apps} websites={eventsWithDurations.websites} />
            ) : (
              <div>
                <div className="flex items-end gap-1" style={{ height: 120 }}>
                  {Array(24).fill(0).map((_, hour) => (
                    <div key={hour} className="flex-1 flex flex-col items-center gap-1" title={`${hour}:00 — No data`}>
                      <div className="w-full rounded-t bg-muted transition-all" style={{ height: "4%" }} />
                    </div>
                  ))}
                </div>
                <div className="flex gap-1 mt-1">
                  {Array(24).fill(0).map((_, hour) => (
                    <div key={hour} className="flex-1 text-center text-[9px] text-muted-foreground">
                      {hour % 3 === 0 ? `${hour}` : ""}
                    </div>
                  ))}
                </div>
                <p className="text-center text-sm text-muted-foreground mt-4">
                  No activity data for this period. Activity will appear here once the tracker or agent reports events.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="text-center py-8 text-muted-foreground">Loading activity data...</div>
      )}

      {!loading && selectedUserId && (
        <>
          {/* Site Visit Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Site Visit Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Domain time aggregation */}
              {domainAggregation.length > 0 && (
                <div className="pb-4 border-b">
                  <p className="text-sm font-medium text-muted-foreground mb-3">Time per Domain</p>
                  <div className="flex flex-wrap gap-2">
                    {domainAggregation.slice(0, 15).map((d) => (
                      <Badge key={d.name} variant="secondary" className="text-xs">
                        {d.name}: {formatDuration(d.value)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Website visit table */}
              {eventsWithDurations.websites.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No website visits recorded for this period.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-3 pr-4 font-medium text-muted-foreground">Time</th>
                        <th className="pb-3 pr-4 font-medium text-muted-foreground">Domain</th>
                        <th className="pb-3 pr-4 font-medium text-muted-foreground">Page Title</th>
                        <th className="pb-3 pr-4 font-medium text-muted-foreground">App / Browser</th>
                        <th className="pb-3 font-medium text-muted-foreground text-right">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...eventsWithDurations.websites]
                        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                        .map((ev) => (
                          <tr key={ev.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                            <td className="py-2.5 pr-4 text-muted-foreground whitespace-nowrap">{formatTime(ev.timestamp)}</td>
                            <td className="py-2.5 pr-4 font-medium">
                              {ev.url ? (
                                <a
                                  href={ev.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:underline text-blue-600 dark:text-blue-400"
                                  title={ev.url}
                                >
                                  {ev.domain || ev.windowTitle || "—"}
                                </a>
                              ) : (
                                ev.domain || ev.windowTitle || "—"
                              )}
                            </td>
                            <td className="py-2.5 pr-4 max-w-[300px] truncate" title={ev.windowTitle || ""}>
                              {ev.windowTitle || "—"}
                            </td>
                            <td className="py-2.5 pr-4 text-muted-foreground">{ev.appName || "—"}</td>
                            <td className="py-2.5 text-right text-muted-foreground whitespace-nowrap">
                              {formatDuration(ev.inferredDuration)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* App Usage Summary */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">App Usage Summary</CardTitle>
              {selectedAppFilter && (
                <Button variant="ghost" size="sm" onClick={() => setSelectedAppFilter(null)}>
                  Clear filter
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {appAggregation.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No app usage recorded for this period.</p>
              ) : (
                <>
                  <InteractiveBarChart
                    items={appAggregation.slice(0, 15)}
                    label="Time spent per application"
                    onBarClick={(name) => setSelectedAppFilter(selectedAppFilter === name ? null : name)}
                    selectedItem={selectedAppFilter}
                  />
                  {selectedAppFilter && (
                    <div className="mt-4 border-t pt-4">
                      <h4 className="text-sm font-semibold mb-2">
                        {selectedAppFilter} — Window History
                      </h4>
                      <div className="max-h-60 overflow-y-auto space-y-1">
                        {[...eventsWithDurations.apps]
                          .filter((ev) => ev.appName === selectedAppFilter)
                          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                          .map((ev, i) => (
                            <div key={i} className="flex items-center gap-3 text-sm py-1.5 border-b last:border-0">
                              <span className="text-xs text-muted-foreground whitespace-nowrap w-20">
                                {formatTime(ev.timestamp)}
                              </span>
                              <span className="flex-1 truncate" title={ev.windowTitle || ""}>
                                {ev.windowTitle || "—"}
                              </span>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {formatDuration(ev.inferredDuration)}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* File Activity Feed */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">File Activity Feed</CardTitle>
            </CardHeader>
            <CardContent>
              {fileEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No file operations recorded for this period.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-3 pr-4 font-medium text-muted-foreground">Time</th>
                        <th className="pb-3 pr-4 font-medium text-muted-foreground">Action</th>
                        <th className="pb-3 pr-4 font-medium text-muted-foreground">File Path</th>
                        <th className="pb-3 font-medium text-muted-foreground">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fileEvents.map((ev) => {
                        const style = FILE_ACTION_STYLES[ev.eventType] || {
                          bg: "bg-gray-100 dark:bg-gray-900/30",
                          text: "text-gray-700 dark:text-gray-400",
                          label: ev.eventType,
                        };
                        const filePath =
                          (ev.metadata as Record<string, unknown>)?.filePath as string ||
                          (ev.metadata as Record<string, unknown>)?.path as string ||
                          ev.windowTitle ||
                          "—";
                        const details =
                          (ev.metadata as Record<string, unknown>)?.destination as string ||
                          (ev.metadata as Record<string, unknown>)?.newName as string ||
                          (ev.metadata as Record<string, unknown>)?.details as string ||
                          "";

                        return (
                          <tr key={ev.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                            <td className="py-2.5 pr-4 text-muted-foreground whitespace-nowrap">
                              {formatTime(ev.timestamp)}
                            </td>
                            <td className="py-2.5 pr-4">
                              <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${style.bg} ${style.text}`}>
                                {style.label}
                              </span>
                            </td>
                            <td className="py-2.5 pr-4 max-w-[400px] truncate font-mono text-xs" title={filePath}>
                              {filePath}
                            </td>
                            <td className="py-2.5 text-muted-foreground max-w-[200px] truncate" title={details}>
                              {details || "—"}
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
        </>
      )}

      {!loading && !selectedUserId && !employeesLoading && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No employees available. Please check your permissions.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
