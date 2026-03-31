"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Shield,
  Clock,
  AlertTriangle,
  Ticket,
  UserPlus,
  Monitor,
  FileBarChart,
  Cpu,
  ShieldAlert,
  Headphones,
} from "lucide-react";
import Link from "next/link";

// ── Types ──────────────────────────────────────────────────────────────

export interface ActivityDay {
  label: string; // "Mon", "Tue", etc.
  date: string;  // ISO date string
  hours: number; // active hours
}

export interface DeviceBreakdown {
  online: number;
  offline: number;
  stale: number;
}

export interface SecurityAlertItem {
  id: string;
  alertType: string;
  severity: string;
  title: string;
  createdAt: string;
  status: string;
}

export interface RecentTimeEntry {
  id: string;
  userName: string;
  clockIn: string;
  clockOut: string | null;
  status: string;
}

export interface HourlyActivityPoint {
  hour: number;          // 0-23
  activeSeconds: number; // total active seconds for that hour
}

export interface TopApp {
  appName: string;
  count: number;
}

export interface FeedItem {
  id: string;
  type: "clock_in" | "clock_out" | "alert" | "ticket";
  description: string;
  timestamp: string;
  severity?: string;
}

// ── Relative time helper ───────────────────────────────────────────────

function relativeTime(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

// ── 7-Day Activity Bar Chart ───────────────────────────────────────────

export function ActivityTrendChart({ data }: { data: ActivityDay[] }) {
  const maxHours = Math.max(...data.map((d) => d.hours), 1);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">7-Day Activity Trend</CardTitle>
      </CardHeader>
      <CardContent>
        {data.every((d) => d.hours === 0) ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            No activity data for the past 7 days
          </div>
        ) : (
          <div className="flex items-end gap-2 h-48">
            {data.map((day) => {
              const pct = (day.hours / maxHours) * 100;
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-muted-foreground font-medium">
                    {day.hours > 0 ? `${day.hours.toFixed(1)}h` : ""}
                  </span>
                  <div className="w-full relative" style={{ height: "140px" }}>
                    <div
                      className="absolute bottom-0 left-0 right-0 rounded-t-md transition-all duration-500"
                      style={{
                        height: `${Math.max(pct, day.hours > 0 ? 4 : 0)}%`,
                        background: "linear-gradient(to top, hsl(217, 91%, 50%), hsl(217, 91%, 65%))",
                      }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{day.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Device Fleet Donut ─────────────────────────────────────────────────

export function DeviceFleetDonut({ data }: { data: DeviceBreakdown }) {
  const total = data.online + data.offline + data.stale;

  const onlinePct = total > 0 ? (data.online / total) * 100 : 0;
  const offlinePct = total > 0 ? (data.offline / total) * 100 : 0;
  const stalePct = total > 0 ? (data.stale / total) * 100 : 0;

  // conic-gradient angles
  const onlineEnd = onlinePct * 3.6;
  const offlineEnd = onlineEnd + offlinePct * 3.6;

  const gradient =
    total > 0
      ? `conic-gradient(
          #22c55e 0deg ${onlineEnd}deg,
          #ef4444 ${onlineEnd}deg ${offlineEnd}deg,
          #eab308 ${offlineEnd}deg 360deg
        )`
      : "conic-gradient(hsl(var(--muted)) 0deg 360deg)";

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Device Fleet Status</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            No devices registered
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div
                className="rounded-full"
                style={{
                  width: "140px",
                  height: "140px",
                  background: gradient,
                }}
              />
              {/* inner cutout */}
              <div
                className="absolute rounded-full bg-card flex items-center justify-center"
                style={{
                  width: "90px",
                  height: "90px",
                  top: "25px",
                  left: "25px",
                }}
              >
                <div className="text-center">
                  <div className="text-2xl font-bold">{total}</div>
                  <div className="text-xs text-muted-foreground">devices</div>
                </div>
              </div>
            </div>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <span>Online {data.online}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <span>Offline {data.offline}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-full bg-yellow-500" />
                <span>Stale {data.stale}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Activity Feed ──────────────────────────────────────────────────────

function FeedIcon({ type, severity }: { type: FeedItem["type"]; severity?: string }) {
  switch (type) {
    case "clock_in":
      return (
        <div className="p-1.5 rounded-md bg-green-500/10">
          <Clock className="h-3.5 w-3.5 text-green-500" />
        </div>
      );
    case "clock_out":
      return (
        <div className="p-1.5 rounded-md bg-muted">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      );
    case "alert":
      return (
        <div
          className={`p-1.5 rounded-md ${
            severity === "CRITICAL" || severity === "HIGH"
              ? "bg-red-500/10"
              : "bg-yellow-500/10"
          }`}
        >
          <AlertTriangle
            className={`h-3.5 w-3.5 ${
              severity === "CRITICAL" || severity === "HIGH"
                ? "text-red-500"
                : "text-yellow-500"
            }`}
          />
        </div>
      );
    case "ticket":
      return (
        <div className="p-1.5 rounded-md bg-blue-500/10">
          <Ticket className="h-3.5 w-3.5 text-blue-500" />
        </div>
      );
  }
}

export function ActivityFeed({ items }: { items: FeedItem[] }) {
  // Re-render periodically to update relative times
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            No recent activity
          </div>
        ) : (
          <div className="space-y-1 max-h-[320px] overflow-y-auto pr-1">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 py-2 px-1 rounded-md hover:bg-muted/50 transition-colors"
              >
                <FeedIcon type={item.type} severity={item.severity} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-tight truncate">{item.description}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {relativeTime(item.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Quick Actions Grid ─────────────────────────────────────────────────

const quickActions = [
  { href: "/settings/team", icon: UserPlus, label: "Invite Team", desc: "Add team members" },
  { href: "/settings/agent-setup", icon: Monitor, label: "Deploy Agents", desc: "Install monitoring" },
  { href: "/reports", icon: FileBarChart, label: "Generate Report", desc: "Compliance & analytics" },
  { href: "/devices", icon: Cpu, label: "View Fleet", desc: "Device management" },
  { href: "/security", icon: ShieldAlert, label: "Security Alerts", desc: "Review incidents" },
  { href: "/it-support", icon: Headphones, label: "IT Support", desc: "Manage tickets" },
];

export function QuickActionsGrid() {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="flex items-center gap-3 p-3 rounded-lg border border-transparent hover:border-border hover:bg-muted/50 transition-all group"
            >
              <div className="p-2 rounded-md bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <action.icon className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium leading-tight">{action.label}</div>
                <div className="text-xs text-muted-foreground truncate">{action.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Top Apps Bar Chart ─────────────────────────────────────────────────

export function TopAppsChart({ data }: { data: TopApp[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Top Applications Today</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
            No application usage recorded today
          </div>
        ) : (
          <div className="space-y-3">
            {data.map((app, i) => {
              const pct = (app.count / maxCount) * 100;
              return (
                <div key={app.appName} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate font-medium">{app.appName}</span>
                    <span className="text-muted-foreground ml-2 shrink-0">
                      {app.count} {app.count === 1 ? "event" : "events"}
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        background:
                          i === 0
                            ? "linear-gradient(to right, hsl(217, 91%, 50%), hsl(217, 91%, 65%))"
                            : i === 1
                            ? "linear-gradient(to right, hsl(217, 80%, 55%), hsl(217, 80%, 70%))"
                            : "linear-gradient(to right, hsl(217, 60%, 60%), hsl(217, 60%, 75%))",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Today's Activity Heatmap ───────────────────────────────────────────

export function HourlyActivityHeatmap({ data }: { data: HourlyActivityPoint[] }) {
  // Build array for all 24 hours, filling gaps with 0
  const hours = Array.from({ length: 24 }, (_, i) => {
    const match = data.find((d) => d.hour === i);
    return { hour: i, activeSeconds: match?.activeSeconds ?? 0 };
  });
  const maxSec = Math.max(...hours.map((h) => h.activeSeconds), 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">
          Today&apos;s Activity Heatmap
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
            No hourly activity data yet today
          </div>
        ) : (
          <div>
            <div className="flex items-end gap-1" style={{ height: 120 }}>
              {hours.map(({ hour, activeSeconds }) => {
                const pct = (activeSeconds / maxSec) * 100;
                const intensity =
                  activeSeconds === 0
                    ? "bg-muted"
                    : pct > 75
                    ? "bg-blue-600"
                    : pct > 50
                    ? "bg-blue-500"
                    : pct > 25
                    ? "bg-blue-400"
                    : "bg-blue-300";
                const mins = Math.round(activeSeconds / 60);
                return (
                  <div
                    key={hour}
                    className="flex-1 flex flex-col items-center justify-end"
                    title={`${hour}:00 - ${mins}m active`}
                  >
                    <div
                      className={`w-full rounded-t ${intensity} transition-all`}
                      style={{ height: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex gap-1 mt-1">
              {hours.map(({ hour }) => (
                <div
                  key={hour}
                  className="flex-1 text-center text-[10px] text-muted-foreground"
                >
                  {hour % 3 === 0 ? `${hour}` : ""}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
