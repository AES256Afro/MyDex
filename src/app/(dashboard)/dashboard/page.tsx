import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  Clock,
  CalendarCheck,
  Shield,
  FolderKanban,
  CheckSquare,
  ShieldCheck,
  ShieldX,
  ArrowRight,
  Activity,
  Ticket,
} from "lucide-react";
import Link from "next/link";
import { hasMinRole } from "@/lib/permissions";
import {
  ActivityTrendChart,
  DeviceFleetDonut,
  ActivityFeed,
  QuickActionsGrid,
  TopAppsChart,
} from "@/components/dashboard/dashboard-charts";
import type {
  ActivityDay,
  DeviceBreakdown,
  FeedItem,
  TopApp,
} from "@/components/dashboard/dashboard-charts";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const orgId = session.user.organizationId;
  const userId = session.user.id;
  const role = session.user.role;
  const isAdmin = hasMinRole(role, "ADMIN");
  const isManager = hasMinRole(role, "MANAGER");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (isAdmin || isManager) {
    // ── Build date range for 7-day trend ────────────────────────────
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    // ── Parallel data fetch ─────────────────────────────────────────
    const [
      totalEmployees,
      activeTimeEntries,
      presentToday,
      openAlerts,
      totalDevices,
      onlineDevices,
      offlineDevices,
      staleDevices,
      activitySummaries,
      recentAlerts,
      recentTimeEntries,
      topAppsRaw,
      openTickets,
      resolvedTickets,
    ] = await Promise.all([
      // KPI cards
      prisma.user.count({
        where: { organizationId: orgId, status: "ACTIVE" },
      }),
      prisma.timeEntry.count({
        where: { organizationId: orgId, status: "ACTIVE" },
      }),
      prisma.attendanceRecord.count({
        where: { organizationId: orgId, date: today, status: "PRESENT" },
      }),
      prisma.securityAlert.count({
        where: { organizationId: orgId, status: "OPEN" },
      }),
      prisma.agentDevice.count({
        where: { organizationId: orgId },
      }),
      prisma.agentDevice.count({
        where: { organizationId: orgId, status: "ONLINE" },
      }),

      // Device breakdown
      prisma.agentDevice.count({
        where: { organizationId: orgId, status: "OFFLINE" },
      }),
      prisma.agentDevice.count({
        where: { organizationId: orgId, status: "STALE" },
      }),

      // 7-day activity trend
      prisma.activitySummary.groupBy({
        by: ["date"],
        where: {
          organizationId: orgId,
          date: { gte: sevenDaysAgo, lte: today },
          hour: null, // daily summaries only
        },
        _sum: { totalActiveSeconds: true },
        orderBy: { date: "asc" },
      }),

      // Recent security alerts
      prisma.securityAlert.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          alertType: true,
          severity: true,
          title: true,
          createdAt: true,
          status: true,
        },
      }),

      // Recent time entries (clock in/out)
      prisma.timeEntry.findMany({
        where: { organizationId: orgId },
        orderBy: { clockIn: "desc" },
        take: 5,
        select: {
          id: true,
          clockIn: true,
          clockOut: true,
          status: true,
          user: { select: { name: true } },
        },
      }),

      // Top apps today
      prisma.activityEvent.groupBy({
        by: ["appName"],
        where: {
          organizationId: orgId,
          eventType: "APP_SWITCH",
          timestamp: { gte: today },
          appName: { not: null },
        },
        _count: { appName: true },
        orderBy: { _count: { appName: "desc" } },
        take: 5,
      }),

      // Support ticket stats
      prisma.supportTicket.count({
        where: { organizationId: orgId, status: { in: ["OPEN", "IN_PROGRESS", "WAITING_ON_IT"] } },
      }),
      prisma.supportTicket.count({
        where: { organizationId: orgId, status: { in: ["RESOLVED", "CLOSED"] } },
      }),
    ]);

    // ── Compute org-level DEX score ─────────────────────────────────
    let orgDexScore = 0;
    if (isAdmin && totalDevices > 0) {
      const devices = await prisma.agentDevice.findMany({
        where: { organizationId: orgId },
        select: {
          status: true, securityGrade: true, performanceScore: true,
          rebootPending: true, bsodCount: true, antivirusName: true,
          defenderStatus: true, updateServiceStatus: true, pendingUpdates: true,
          uptimeSeconds: true,
        },
      });
      let totalScore = 0;
      for (const d of devices) {
        let score = 100;
        if (d.status === "OFFLINE") score -= 25;
        else if (d.status === "STALE") score -= 15;
        const g = d.securityGrade;
        if (g === "F") score -= 30; else if (g === "D") score -= 20; else if (g === "C") score -= 10; else if (g === "B") score -= 5;
        if (d.performanceScore !== null && d.performanceScore < 50) score -= 15;
        else if (d.performanceScore !== null && d.performanceScore < 70) score -= 5;
        if (d.rebootPending) score -= 5;
        if (d.bsodCount > 5) score -= 15; else if (d.bsodCount > 0) score -= 5;
        if (!d.antivirusName && d.defenderStatus !== "enabled") score -= 10;
        if (d.updateServiceStatus === "disabled") score -= 10;
        else if (d.updateServiceStatus === "stopped") score -= 5;
        const pending = d.pendingUpdates;
        if (Array.isArray(pending) && pending.length > 5) score -= 10;
        else if (Array.isArray(pending) && pending.length > 0) score -= 3;
        if (d.uptimeSeconds && d.uptimeSeconds > 30 * 86400) score -= 5;
        totalScore += Math.max(0, Math.min(100, score));
      }
      orgDexScore = Math.round(totalScore / devices.length);
    }

    // ── Prepare serialized data for client components ───────────────

    // 7-day activity trend: fill in missing days
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const activityTrend: ActivityDay[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const match = activitySummaries.find(
        (s) => new Date(s.date).toISOString().slice(0, 10) === dateStr
      );
      const totalSec = match?._sum?.totalActiveSeconds ?? 0;
      activityTrend.push({
        label: dayNames[d.getDay()],
        date: d.toISOString(),
        hours: Math.round((totalSec / 3600) * 10) / 10,
      });
    }

    // Device breakdown
    const deviceBreakdown: DeviceBreakdown = {
      online: onlineDevices,
      offline: offlineDevices,
      stale: staleDevices,
    };

    // Build activity feed (merge alerts + time entries, sort by time)
    const feedItems: FeedItem[] = [];

    for (const entry of recentTimeEntries) {
      if (entry.clockOut) {
        feedItems.push({
          id: `te-out-${entry.id}`,
          type: "clock_out",
          description: `${entry.user.name ?? "Unknown"} clocked out`,
          timestamp: entry.clockOut.toISOString(),
        });
      }
      feedItems.push({
        id: `te-in-${entry.id}`,
        type: "clock_in",
        description: `${entry.user.name ?? "Unknown"} clocked in`,
        timestamp: entry.clockIn.toISOString(),
      });
    }

    for (const alert of recentAlerts) {
      feedItems.push({
        id: `alert-${alert.id}`,
        type: "alert",
        description: `${alert.severity} alert: ${alert.title}`,
        timestamp: alert.createdAt.toISOString(),
        severity: alert.severity,
      });
    }

    // Sort by timestamp descending, take 8
    feedItems.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    const feedSlice = feedItems.slice(0, 8);

    // Top apps
    const topApps: TopApp[] = topAppsRaw.map((r) => ({
      appName: r.appName ?? "Unknown",
      count: r._count.appName,
    }));

    // Attendance percentage
    const attendancePct =
      totalEmployees > 0 ? Math.round((presentToday / totalEmployees) * 100) : 0;

    // ── Render ──────────────────────────────────────────────────────
    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {session.user.name}
          </p>
        </div>

        {/* Row 1: KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {/* DEX Score */}
          {isAdmin && totalDevices > 0 && (
            <Link href="/fleet-health">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">DEX Score</CardTitle>
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-2xl font-bold ${
                      orgDexScore >= 80
                        ? "text-green-600"
                        : orgDexScore >= 60
                        ? "text-yellow-600"
                        : "text-red-600"
                    }`}
                  >
                    {orgDexScore}/100
                  </div>
                  <p className="text-xs text-muted-foreground">Digital Employee Experience</p>
                </CardContent>
              </Card>
            </Link>
          )}

          {/* Total Employees */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalEmployees}</div>
              <p className="text-xs text-muted-foreground">
                {attendancePct}% present today
              </p>
            </CardContent>
          </Card>

          {/* Currently Working */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Currently Working</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeTimeEntries}</div>
              <p className="text-xs text-muted-foreground">Clocked in right now</p>
            </CardContent>
          </Card>

          {/* Devices Online */}
          {isAdmin && totalDevices > 0 && (
            <Link href="/devices">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Devices Online</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {onlineDevices}/{totalDevices}
                  </div>
                  <p className="text-xs text-muted-foreground">Connected agents</p>
                </CardContent>
              </Card>
            </Link>
          )}

          {/* Open Alerts */}
          <Link href="/security">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Open Alerts</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${
                    openAlerts > 0 ? "text-red-600" : "text-green-600"
                  }`}
                >
                  {openAlerts}
                </div>
                <p className="text-xs text-muted-foreground">
                  {openAlerts === 0 ? "All clear" : "Security alerts pending"}
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Row 1b: Secondary KPI row */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Attendance Today</CardTitle>
              <CalendarCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{attendancePct}%</div>
              <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-green-500 transition-all"
                  style={{ width: `${attendancePct}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {presentToday} of {totalEmployees} employees
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Support Tickets</CardTitle>
              <Ticket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-3">
                <div className="text-2xl font-bold">{openTickets}</div>
                <span className="text-sm text-muted-foreground">open</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {resolvedTickets} resolved total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Activity Today</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {activityTrend[activityTrend.length - 1]?.hours ?? 0}h
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Total active hours across org
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Row 2: Charts — Activity Trend + Device Fleet */}
        <div className="grid gap-4 md:grid-cols-2">
          <ActivityTrendChart data={activityTrend} />
          <DeviceFleetDonut data={deviceBreakdown} />
        </div>

        {/* Row 3: Activity Feed + Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2">
          <ActivityFeed items={feedSlice} />
          <QuickActionsGrid />
        </div>

        {/* Row 4: Top Apps */}
        <TopAppsChart data={topApps} />
      </div>
    );
  }

  // Employee dashboard — focused on their own data
  const [
    myActiveEntry,
    myAttendanceToday,
    myTasks,
    myLeaveRequests,
    myMfa,
  ] = await Promise.all([
    prisma.timeEntry.findFirst({
      where: { userId, status: "ACTIVE" },
      orderBy: { clockIn: "desc" },
    }),
    prisma.attendanceRecord.findFirst({
      where: { userId, date: today },
    }),
    prisma.task.count({
      where: { assigneeId: userId, status: { in: ["TODO", "IN_PROGRESS"] } },
    }),
    prisma.leaveRequest.count({
      where: { userId, status: "PENDING" },
    }),
    prisma.mfaCredential.findUnique({
      where: { userId },
      select: { verified: true },
    }),
  ]);

  const mfaEnabled = myMfa?.verified ?? false;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome, {session.user.name}
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s your overview for today
        </p>
      </div>

      {/* MFA warning banner */}
      {!mfaEnabled && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldX className="h-5 w-5 text-amber-600" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  Secure your account
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Enable two-factor authentication to protect your account
                </p>
              </div>
            </div>
            <Link
              href="/account"
              className="inline-flex items-center gap-1 text-sm font-medium text-amber-700 hover:text-amber-900 dark:text-amber-300"
            >
              Set up 2FA <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Employee stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${myActiveEntry ? "text-green-600" : "text-muted-foreground"}`}>
              {myActiveEntry ? "Clocked In" : "Not Clocked In"}
            </div>
            {myActiveEntry && (
              <p className="text-xs text-muted-foreground">
                Since {new Date(myActiveEntry.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Attendance</CardTitle>
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {myAttendanceToday ? myAttendanceToday.status : "Not Recorded"}
            </div>
            <p className="text-xs text-muted-foreground">Today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Open Tasks</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myTasks}</div>
            <p className="text-xs text-muted-foreground">Assigned to you</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Leave Requests</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myLeaveRequests}</div>
            <p className="text-xs text-muted-foreground">Pending approval</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions for employees */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/time-tracking">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="flex items-center gap-4 py-6">
              <div className="p-3 rounded-lg bg-primary/10">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="font-medium">Time Tracking</div>
                <div className="text-sm text-muted-foreground">Clock in/out and view timesheets</div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/projects">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="flex items-center gap-4 py-6">
              <div className="p-3 rounded-lg bg-primary/10">
                <FolderKanban className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="font-medium">My Projects</div>
                <div className="text-sm text-muted-foreground">View tasks and assignments</div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/account">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="flex items-center gap-4 py-6">
              <div className="p-3 rounded-lg bg-primary/10">
                {mfaEnabled ? (
                  <ShieldCheck className="h-6 w-6 text-green-600" />
                ) : (
                  <ShieldX className="h-6 w-6 text-amber-600" />
                )}
              </div>
              <div>
                <div className="font-medium">My Account</div>
                <div className="text-sm text-muted-foreground">
                  {mfaEnabled ? "Profile & security settings" : "Set up 2FA"}
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
