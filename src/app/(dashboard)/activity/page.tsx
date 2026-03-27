"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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

  const domainAggregation = useMemo(() => {
    const map = new Map<string, number>();
    for (const ev of websiteEvents) {
      const domain = ev.domain || "unknown";
      map.set(domain, (map.get(domain) || 0) + (ev.durationSeconds || 0));
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [websiteEvents]);

  const appAggregation = useMemo(() => {
    const map = new Map<string, number>();
    for (const ev of appEvents) {
      const app = ev.appName || "unknown";
      map.set(app, (map.get(app) || 0) + (ev.durationSeconds || 0));
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [appEvents]);

  const totalActiveSeconds = useMemo(() => {
    const siteSecs = websiteEvents.reduce((sum, e) => sum + (e.durationSeconds || 0), 0);
    const appSecs = appEvents.reduce((sum, e) => sum + (e.durationSeconds || 0), 0);
    return siteSecs + appSecs;
  }, [websiteEvents, appEvents]);

  const uniqueDomains = useMemo(() => new Set(websiteEvents.map((e) => e.domain).filter(Boolean)).size, [websiteEvents]);
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

            {/* Refresh button */}
            <Button onClick={loadAllData} disabled={loading || !selectedUserId} variant="outline" size="sm">
              {loading ? "Loading..." : "Refresh"}
            </Button>
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
              {websiteEvents.length === 0 ? (
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
                      {websiteEvents
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
                                  {ev.domain || "—"}
                                </a>
                              ) : (
                                ev.domain || "—"
                              )}
                            </td>
                            <td className="py-2.5 pr-4 max-w-[300px] truncate" title={ev.windowTitle || ""}>
                              {ev.windowTitle || "—"}
                            </td>
                            <td className="py-2.5 pr-4 text-muted-foreground">{ev.appName || "—"}</td>
                            <td className="py-2.5 text-right text-muted-foreground whitespace-nowrap">
                              {ev.durationSeconds != null ? formatDuration(ev.durationSeconds) : "—"}
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
            <CardHeader>
              <CardTitle className="text-lg">App Usage Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {appAggregation.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No app usage recorded for this period.</p>
              ) : (
                <BarChart items={appAggregation.slice(0, 15)} label="Time spent per application" />
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
