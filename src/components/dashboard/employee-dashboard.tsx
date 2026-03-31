"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock,
  Ticket,
  CalendarDays,
  Monitor,
  Wifi,
  WifiOff,
  X,
  CheckCircle2,
  Circle,
  Timer,
} from "lucide-react";
import Link from "next/link";

// ── Types ──────────────────────────────────────────────────────────────

export interface EmployeeDevice {
  id: string;
  hostname: string;
  platform: string;
  osVersion: string | null;
  status: "ONLINE" | "OFFLINE" | "STALE";
  securityGrade: string | null;
  lastSeenAt: string;
}

export interface WeeklyHoursDay {
  label: string;
  hours: number;
}

export interface WelcomeBannerProps {
  userName: string;
  mfaEnabled: boolean;
  hasClockHistory: boolean;
  hasProfileUpdate: boolean;
}

// ── Welcome Banner (first-login) ──────────────────────────────────────

export function WelcomeBanner({
  userName,
  mfaEnabled,
  hasClockHistory,
  hasProfileUpdate,
}: WelcomeBannerProps) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const key = `mydex-welcome-dismissed`;
    const val = localStorage.getItem(key);
    if (!val) setDismissed(false);
  }, []);

  function dismiss() {
    localStorage.setItem(`mydex-welcome-dismissed`, "true");
    setDismissed(true);
  }

  if (dismissed) return null;

  const tasks = [
    { label: "Set up MFA", done: mfaEnabled, href: "/account" },
    { label: "Update your profile", done: hasProfileUpdate, href: "/account" },
    { label: "Clock in for the first time", done: hasClockHistory, href: "/time-tracking" },
  ];

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="py-5">
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            <div>
              <h2 className="text-xl font-semibold">
                Welcome to MyDex, {userName}!
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Complete these steps to get started
              </p>
            </div>
            <ul className="space-y-2">
              {tasks.map((t) => (
                <li key={t.label} className="flex items-center gap-2 text-sm">
                  {t.done ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  )}
                  {t.done ? (
                    <span className="text-muted-foreground line-through">
                      {t.label}
                    </span>
                  ) : (
                    <Link
                      href={t.href}
                      className="text-primary hover:underline font-medium"
                    >
                      {t.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={dismiss}
            className="shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── My Devices Card ───────────────────────────────────────────────────

export function MyDevicesCard({ devices }: { devices: EmployeeDevice[] }) {
  if (devices.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">My Devices</CardTitle>
          <Monitor className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No devices assigned</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">My Devices</CardTitle>
        <Monitor className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-3">
        {devices.map((d) => (
          <div key={d.id} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              {d.status === "ONLINE" ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-muted-foreground" />
              )}
              <div>
                <span className="font-medium">{d.hostname}</span>
                <span className="text-muted-foreground ml-2 text-xs">
                  {d.platform} {d.osVersion ?? ""}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {d.securityGrade && (
                <Badge
                  variant="outline"
                  className={
                    d.securityGrade <= "B"
                      ? "border-green-300 text-green-700 dark:text-green-300"
                      : d.securityGrade === "C"
                      ? "border-yellow-300 text-yellow-700 dark:text-yellow-300"
                      : "border-red-300 text-red-700 dark:text-red-300"
                  }
                >
                  {d.securityGrade}
                </Badge>
              )}
              <Badge variant={d.status === "ONLINE" ? "default" : "secondary"}>
                {d.status === "ONLINE" ? "Online" : "Offline"}
              </Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ── My Open Tickets Card ──────────────────────────────────────────────

export function MyOpenTicketsCard({
  openCount,
  latestSubject,
  latestStatus,
}: {
  openCount: number;
  latestSubject: string | null;
  latestStatus: string | null;
}) {
  return (
    <Link href="/support">
      <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">My Open Tickets</CardTitle>
          <Ticket className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{openCount}</div>
          {latestSubject ? (
            <p className="text-xs text-muted-foreground mt-1 truncate">
              Latest: {latestSubject}{" "}
              {latestStatus && (
                <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0">
                  {latestStatus.replace(/_/g, " ")}
                </Badge>
              )}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">No open tickets</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

// ── My Leave Balance Card ─────────────────────────────────────────────

export function MyLeaveBalanceCard({
  pendingCount,
  approvedThisYear,
}: {
  pendingCount: number;
  approvedThisYear: number;
}) {
  return (
    <Link href="/attendance/leave-requests">
      <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Leave Requests</CardTitle>
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-3">
            <div className="text-2xl font-bold">{pendingCount}</div>
            <span className="text-sm text-muted-foreground">pending</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {approvedThisYear} approved this year
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

// ── Quick Actions Row ─────────────────────────────────────────────────

export function EmployeeQuickActions({
  isClockedIn,
}: {
  isClockedIn: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link href="/time-tracking">
            <Button
              variant={isClockedIn ? "outline" : "default"}
              className="w-full justify-start gap-2"
            >
              <Clock className="h-4 w-4" />
              {isClockedIn ? "View Timesheet" : "Clock In"}
            </Button>
          </Link>
          <Link href="/support">
            <Button variant="outline" className="w-full justify-start gap-2">
              <Ticket className="h-4 w-4" />
              Submit Ticket
            </Button>
          </Link>
          <Link href="/attendance/leave-requests">
            <Button variant="outline" className="w-full justify-start gap-2">
              <CalendarDays className="h-4 w-4" />
              Request Leave
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

// ── My Productivity This Week ─────────────────────────────────────────

export function WeeklyProductivityChart({
  data,
}: {
  data: WeeklyHoursDay[];
}) {
  const maxHours = Math.max(...data.map((d) => d.hours), 1);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">
          My Productivity This Week
        </CardTitle>
        <Timer className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-2 h-32">
          {data.map((day) => (
            <div
              key={day.label}
              className="flex-1 flex flex-col items-center gap-1"
            >
              <span className="text-xs text-muted-foreground">
                {day.hours > 0 ? `${day.hours}h` : ""}
              </span>
              <div
                className="w-full rounded-t bg-primary/80 transition-all min-h-[2px]"
                style={{
                  height: `${Math.max((day.hours / maxHours) * 100, 2)}%`,
                }}
              />
              <span className="text-xs text-muted-foreground font-medium">
                {day.label}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── My Schedule Today Card ────────────────────────────────────────────

export function MyScheduleTodayCard({
  isClockedIn,
  clockInTime,
  hoursWorkedToday,
  attendanceStatus,
}: {
  isClockedIn: boolean;
  clockInTime: string | null;
  hoursWorkedToday: number;
  attendanceStatus: string | null;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">My Schedule Today</CardTitle>
        <Clock className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Clock-in status</span>
          <Badge variant={isClockedIn ? "default" : "secondary"}>
            {isClockedIn ? "Clocked In" : "Not Clocked In"}
          </Badge>
        </div>
        {clockInTime && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Since</span>
            <span className="text-sm font-medium">{clockInTime}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Hours today</span>
          <span className="text-sm font-bold">{hoursWorkedToday.toFixed(1)}h</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Attendance</span>
          <Badge
            variant="outline"
            className={
              attendanceStatus === "PRESENT"
                ? "border-green-300 text-green-700 dark:text-green-300"
                : "border-muted text-muted-foreground"
            }
          >
            {attendanceStatus ?? "Not Recorded"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
