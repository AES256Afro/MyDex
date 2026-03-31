import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { hasMinRole } from "@/lib/permissions";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { subDays, startOfDay, endOfDay } from "date-fns";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Users,
  BarChart3,
  CalendarCheck,
  ShieldAlert,
  ArrowRight,
  Lightbulb,
  Clock,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────

interface InsightCard {
  type: "trend" | "anomaly" | "recommendation" | "achievement";
  severity: "info" | "warning" | "critical" | "positive";
  title: string;
  description: string;
  metric?: { label: string; value: string; change?: string };
  affectedUsers?: { id: string; name: string; email: string }[];
  recommendation?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function severityColor(severity: string): string {
  switch (severity) {
    case "critical": return "border-red-500/50 bg-red-50 dark:bg-red-950/20";
    case "warning": return "border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20";
    case "positive": return "border-green-500/50 bg-green-50 dark:bg-green-950/20";
    default: return "border-blue-500/50 bg-blue-50 dark:bg-blue-950/20";
  }
}

function severityBadge(severity: string): "destructive" | "warning" | "success" | "secondary" {
  switch (severity) {
    case "critical": return "destructive";
    case "warning": return "warning";
    case "positive": return "success";
    default: return "secondary";
  }
}

// ── Page ─────────────────────────────────────────────────────────────

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  if (!hasMinRole(session.user.role, "MANAGER")) {
    redirect("/dashboard");
  }

  const resolvedParams = await searchParams;
  const period = Math.min(Math.max(parseInt(resolvedParams.period || "7", 10), 7), 30);
  const orgId = session.user.organizationId;

  const now = new Date();
  const currentStart = startOfDay(subDays(now, period));
  const currentEnd = endOfDay(now);
  const previousStart = startOfDay(subDays(now, period * 2));
  const previousEnd = endOfDay(subDays(now, period + 1));
  const thirtyDaysAgo = startOfDay(subDays(now, 30));

  // ── Parallel data fetch ────────────────────────────────────────────

  const [
    currentSummaries,
    previousSummaries,
    currentAttendance,
    previousAttendance,
    completedTasks,
    recentAlerts,
    offlineDevices,
    hourlySummaries,
    dailySummaries,
    baselineSummaries,
    lateHourSummaries,
  ] = await Promise.all([
    prisma.activitySummary.findMany({
      where: { organizationId: orgId, date: { gte: currentStart, lte: currentEnd }, hour: null },
      include: { user: { select: { id: true, name: true, email: true, department: true } } },
    }),
    prisma.activitySummary.findMany({
      where: { organizationId: orgId, date: { gte: previousStart, lte: previousEnd }, hour: null },
    }),
    prisma.attendanceRecord.findMany({
      where: { organizationId: orgId, date: { gte: currentStart, lte: currentEnd } },
      include: { user: { select: { id: true, name: true, email: true, department: true } } },
    }),
    prisma.attendanceRecord.findMany({
      where: { organizationId: orgId, date: { gte: previousStart, lte: previousEnd } },
    }),
    prisma.task.findMany({
      where: {
        organizationId: orgId,
        status: "DONE",
        updatedAt: { gte: currentStart, lte: currentEnd },
        assigneeId: { not: null },
      },
      select: { assigneeId: true },
    }),
    prisma.securityAlert.findMany({
      where: { organizationId: orgId, createdAt: { gte: currentStart, lte: currentEnd } },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.agentDevice.findMany({
      where: {
        organizationId: orgId,
        status: { in: ["OFFLINE", "STALE"] },
        lastSeenAt: { lt: subDays(now, 2) },
      },
      select: { id: true, hostname: true },
    }),
    prisma.activitySummary.findMany({
      where: { organizationId: orgId, date: { gte: currentStart, lte: currentEnd }, hour: { not: null } },
    }),
    // Daily summaries for trend chart
    prisma.activitySummary.groupBy({
      by: ["date"],
      where: { organizationId: orgId, date: { gte: currentStart, lte: currentEnd }, hour: null },
      _avg: { productivityScore: true },
      _sum: { totalActiveSeconds: true },
      _count: true,
      orderBy: { date: "asc" },
    }),
    // 30-day baselines for anomaly detection
    prisma.activitySummary.findMany({
      where: { organizationId: orgId, date: { gte: thirtyDaysAgo }, hour: null },
    }),
    // Late hour summaries for anomaly detection
    prisma.activitySummary.findMany({
      where: {
        organizationId: orgId,
        date: { gte: currentStart, lte: currentEnd },
        hour: { gte: 20 },
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
  ]);

  // ── Compute Productivity Metrics ───────────────────────────────────

  const curScores = currentSummaries.filter(s => s.productivityScore !== null).map(s => s.productivityScore!);
  const prevScores = previousSummaries.filter(s => s.productivityScore !== null).map(s => s.productivityScore!);
  const avgProductivity = curScores.length > 0 ? Math.round(curScores.reduce((a, b) => a + b, 0) / curScores.length) : 0;
  const prevAvgProductivity = prevScores.length > 0 ? Math.round(prevScores.reduce((a, b) => a + b, 0) / prevScores.length) : 0;
  const productivityChange = pctChange(avgProductivity, prevAvgProductivity);

  // ── Compute Attendance Metrics ─────────────────────────────────────

  const curPresent = currentAttendance.filter(r => r.status === "PRESENT" || r.status === "HALF_DAY").length;
  const attendanceRate = currentAttendance.length > 0 ? Math.round((curPresent / currentAttendance.length) * 1000) / 10 : 0;
  const prevPresent = previousAttendance.filter(r => r.status === "PRESENT" || r.status === "HALF_DAY").length;
  const prevAttendanceRate = previousAttendance.length > 0 ? Math.round((prevPresent / previousAttendance.length) * 1000) / 10 : 0;
  const attendanceChange = pctChange(attendanceRate, prevAttendanceRate);

  // ── Compute Engagement Scores ──────────────────────────────────────

  const userProd = new Map<string, { user: { id: string; name: string; email: string; department: string | null }; scores: number[] }>();
  for (const s of currentSummaries) {
    if (s.productivityScore === null) continue;
    if (!userProd.has(s.userId)) userProd.set(s.userId, { user: s.user, scores: [] });
    userProd.get(s.userId)!.scores.push(s.productivityScore);
  }

  const userAttendance = new Map<string, { total: number; present: number }>();
  for (const r of currentAttendance) {
    if (!userAttendance.has(r.userId)) userAttendance.set(r.userId, { total: 0, present: 0 });
    const d = userAttendance.get(r.userId)!;
    d.total++;
    if (r.status === "PRESENT" || r.status === "HALF_DAY") d.present++;
  }

  const userTasks = new Map<string, number>();
  for (const t of completedTasks) {
    if (t.assigneeId) userTasks.set(t.assigneeId, (userTasks.get(t.assigneeId) ?? 0) + 1);
  }
  const maxTasks = Math.max(...Array.from(userTasks.values()), 1);

  const engagementScores: {
    user: { id: string; name: string; email: string; department: string | null };
    attendanceRate: number;
    productivityScore: number;
    taskCompletion: number;
    engagementScore: number;
  }[] = [];

  for (const [uid, prodData] of userProd) {
    const att = userAttendance.get(uid);
    const attRate = att ? (att.present / att.total) * 100 : 50;
    const prodScore = prodData.scores.reduce((a, b) => a + b, 0) / prodData.scores.length;
    const taskCount = userTasks.get(uid) ?? 0;
    const taskCompletion = (taskCount / maxTasks) * 100;

    const engagement = Math.round(
      attRate * 0.3 + prodScore * 0.4 + taskCompletion * 0.2 + Math.min(attRate, 100) * 0.1
    );

    engagementScores.push({
      user: prodData.user,
      attendanceRate: Math.round(attRate),
      productivityScore: Math.round(prodScore),
      taskCompletion: Math.round(taskCompletion),
      engagementScore: engagement,
    });
  }
  engagementScores.sort((a, b) => b.engagementScore - a.engagementScore);

  const orgEngagement = engagementScores.length > 0
    ? Math.round(engagementScores.reduce((s, u) => s + u.engagementScore, 0) / engagementScores.length)
    : 0;

  // ── Anomaly Detection ──────────────────────────────────────────────

  const anomalies: InsightCard[] = [];

  // Productivity drops
  const baselineByUser = new Map<string, number[]>();
  for (const s of baselineSummaries) {
    if (s.productivityScore === null) continue;
    if (!baselineByUser.has(s.userId)) baselineByUser.set(s.userId, []);
    baselineByUser.get(s.userId)!.push(s.productivityScore);
  }

  const recentByUser = new Map<string, { user: { id: string; name: string; email: string }; scores: number[] }>();
  for (const s of currentSummaries) {
    if (s.productivityScore === null) continue;
    if (!recentByUser.has(s.userId)) recentByUser.set(s.userId, { user: s.user, scores: [] });
    recentByUser.get(s.userId)!.scores.push(s.productivityScore);
  }

  for (const [uid, recent] of recentByUser) {
    const baseline = baselineByUser.get(uid);
    if (!baseline || baseline.length < 5) continue;
    const baselineAvg = baseline.reduce((a, b) => a + b, 0) / baseline.length;
    const recentAvg = recent.scores.reduce((a, b) => a + b, 0) / recent.scores.length;
    const drop = ((baselineAvg - recentAvg) / baselineAvg) * 100;

    if (drop > 20) {
      anomalies.push({
        type: "anomaly",
        severity: drop > 30 ? "critical" : "warning",
        title: `${recent.user.name}: productivity dropped ${Math.round(drop)}%`,
        description: `Dropped from ${Math.round(baselineAvg)}% baseline to ${Math.round(recentAvg)}% recently.`,
        affectedUsers: [recent.user],
        recommendation: `Consider a check-in with ${recent.user.name} to identify potential issues.`,
      });
    }
  }

  // Late workers
  const lateWorkers = new Map<string, { user: { id: string; name: string; email: string }; count: number }>();
  for (const s of lateHourSummaries) {
    if (s.totalActiveSeconds > 300) {
      if (!lateWorkers.has(s.userId)) lateWorkers.set(s.userId, { user: s.user, count: 0 });
      lateWorkers.get(s.userId)!.count++;
    }
  }
  const frequentLate = Array.from(lateWorkers.values()).filter(u => u.count >= 3);
  if (frequentLate.length > 0) {
    anomalies.push({
      type: "anomaly",
      severity: "info",
      title: `${frequentLate.length} employees working past 8pm regularly`,
      description: frequentLate.map(u => `${u.user.name} (${u.count} late sessions)`).join(", "),
      affectedUsers: frequentLate.map(u => u.user),
      recommendation: "Monitor for burnout risk and ensure healthy work-life boundaries.",
    });
  }

  // Offline devices
  if (offlineDevices.length > 0) {
    anomalies.push({
      type: "anomaly",
      severity: offlineDevices.length > 5 ? "warning" : "info",
      title: `${offlineDevices.length} devices offline for 48+ hours`,
      description: offlineDevices.slice(0, 5).map(d => d.hostname).join(", ") + (offlineDevices.length > 5 ? ` and ${offlineDevices.length - 5} more` : ""),
      recommendation: "Verify these devices are operational and agents are running.",
    });
  }

  // Security alerts
  const criticalAlerts = recentAlerts.filter(a => a.severity === "CRITICAL" || a.severity === "HIGH").length;
  if (recentAlerts.length > 0) {
    anomalies.push({
      type: "anomaly",
      severity: criticalAlerts > 5 ? "critical" : criticalAlerts > 0 ? "warning" : "info",
      title: `${recentAlerts.length} security alerts this period`,
      description: `${criticalAlerts} critical/high severity alerts detected.`,
    });
  }

  const anomalyCount = anomalies.length;
  const criticalCount = anomalies.filter(a => a.severity === "critical").length;
  const warningCount = anomalies.filter(a => a.severity === "warning").length;

  // ── Recommendations ────────────────────────────────────────────────

  const recommendations: InsightCard[] = [];

  // Productivity drop check-ins
  for (const a of anomalies.filter(a => a.affectedUsers && a.type === "anomaly" && a.severity === "critical")) {
    if (a.affectedUsers && a.affectedUsers.length > 0) {
      recommendations.push({
        type: "recommendation",
        severity: "warning",
        title: `Check in with ${a.affectedUsers[0].name}`,
        description: a.description,
        recommendation: a.recommendation,
        affectedUsers: a.affectedUsers,
      });
    }
  }

  // Peak hours recommendation
  const peakHourMap = new Map<number, number>();
  for (const s of hourlySummaries) {
    if (s.hour !== null) {
      peakHourMap.set(s.hour, (peakHourMap.get(s.hour) ?? 0) + s.totalActiveSeconds);
    }
  }
  const peakHours = Array.from(peakHourMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([h]) => h);

  if (peakHours.length > 0) {
    recommendations.push({
      type: "recommendation",
      severity: "info",
      title: `Peak hours: ${peakHours.map(h => `${h}:00`).join(", ")}`,
      description: "Schedule meetings outside peak productivity hours to minimize disruption.",
      recommendation: `Avoid scheduling meetings between ${peakHours[0]}:00-${peakHours[0] + 1}:00 when focus is highest.`,
    });
  }

  if (offlineDevices.length > 0) {
    recommendations.push({
      type: "recommendation",
      severity: "info",
      title: `${offlineDevices.length} devices need attention`,
      description: "Devices haven't checked in for 48+ hours and may need maintenance.",
      recommendation: "Contact device owners or schedule remote diagnostics.",
    });
  }

  // ── Department comparison ──────────────────────────────────────────

  const deptProd = new Map<string, number[]>();
  for (const s of currentSummaries) {
    const dept = s.user.department || "Unassigned";
    if (s.productivityScore !== null) {
      if (!deptProd.has(dept)) deptProd.set(dept, []);
      deptProd.get(dept)!.push(s.productivityScore);
    }
  }
  const deptAvgs = Array.from(deptProd.entries())
    .map(([dept, scores]) => ({
      dept,
      avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    }))
    .sort((a, b) => b.avg - a.avg);

  // ── Peak hours analysis ────────────────────────────────────────────

  const hourlyActivity = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    seconds: peakHourMap.get(i) ?? 0,
  }));
  const maxHourlySeconds = Math.max(...hourlyActivity.map(h => h.seconds), 1);

  // ── Daily trend for chart ──────────────────────────────────────────

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dailyTrend = dailySummaries.map(d => ({
    date: d.date.toISOString().slice(0, 10),
    label: dayNames[d.date.getDay()],
    avgScore: Math.round(d._avg.productivityScore ?? 0),
    totalHours: Math.round(((d._sum.totalActiveSeconds ?? 0) / 3600) * 10) / 10,
  }));
  const maxDailyScore = Math.max(...dailyTrend.map(d => d.avgScore), 1);

  // Top and bottom performers
  const top5 = engagementScores.slice(0, 5);
  const bottom5 = [...engagementScores].reverse().slice(0, 5);

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">AI Insights & Analytics</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Intelligent analysis of your organization&apos;s workforce data
          </p>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2">
        {[7, 14, 30].map(p => (
          <Link
            key={p}
            href={`/insights?period=${p}`}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              period === p
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80 text-muted-foreground"
            }`}
          >
            {p} days
          </Link>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Productivity Score</CardDescription>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{avgProductivity}%</div>
            <div className="flex items-center gap-1 mt-1">
              {productivityChange >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-600" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600" />
              )}
              <span className={`text-xs ${productivityChange >= 0 ? "text-green-600" : "text-red-600"}`}>
                {productivityChange >= 0 ? "+" : ""}{productivityChange}% vs prev period
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Engagement Score</CardDescription>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{orgEngagement}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Composite of attendance, productivity, tasks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Attendance Rate</CardDescription>
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{attendanceRate}%</div>
            <div className="flex items-center gap-1 mt-1">
              {attendanceChange >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-600" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600" />
              )}
              <span className={`text-xs ${attendanceChange >= 0 ? "text-green-600" : "text-red-600"}`}>
                {attendanceChange >= 0 ? "+" : ""}{attendanceChange}% vs prev period
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Anomalies Detected</CardDescription>
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{anomalyCount}</div>
            <div className="flex gap-2 mt-1">
              {criticalCount > 0 && (
                <Badge variant="destructive" className="text-[10px]">{criticalCount} critical</Badge>
              )}
              {warningCount > 0 && (
                <Badge variant="warning" className="text-[10px]">{warningCount} warning</Badge>
              )}
              {anomalyCount === 0 && (
                <span className="text-xs text-green-600">All clear</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Anomaly Alerts */}
      {anomalies.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Anomaly Alerts
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {anomalies.map((anomaly, i) => (
              <Card key={i} className={`border ${severityColor(anomaly.severity)}`}>
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 mt-0.5">
                      {anomaly.severity === "critical" && <ShieldAlert className="h-5 w-5 text-red-600" />}
                      {anomaly.severity === "warning" && <AlertTriangle className="h-5 w-5 text-yellow-600" />}
                      {anomaly.severity === "info" && <Sparkles className="h-5 w-5 text-blue-600" />}
                      {anomaly.severity === "positive" && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={severityBadge(anomaly.severity)} className="text-[10px]">
                          {anomaly.severity}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium">{anomaly.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{anomaly.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Recommendations
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recommendations.map((rec, i) => (
              <Card key={i} className="border-l-4 border-l-primary">
                <CardContent className="pt-4">
                  <p className="text-sm font-medium">{rec.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{rec.description}</p>
                  {rec.recommendation && (
                    <p className="text-xs mt-2 text-primary font-medium">{rec.recommendation}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Trends Section */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Daily Productivity Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Productivity Trend</CardTitle>
            <CardDescription>Daily average productivity score</CardDescription>
          </CardHeader>
          <CardContent>
            {dailyTrend.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                No productivity data for this period
              </div>
            ) : (
              <div className="flex items-end gap-1 h-48">
                {dailyTrend.map((day) => {
                  const pct = (day.avgScore / maxDailyScore) * 100;
                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {day.avgScore > 0 ? `${day.avgScore}%` : ""}
                      </span>
                      <div className="w-full relative" style={{ height: "130px" }}>
                        <div
                          className="absolute bottom-0 left-0 right-0 rounded-t-md transition-all duration-500"
                          style={{
                            height: `${Math.max(pct, day.avgScore > 0 ? 4 : 0)}%`,
                            background: "linear-gradient(to top, hsl(217, 91%, 50%), hsl(217, 91%, 65%))",
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{day.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Department Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Department Comparison</CardTitle>
            <CardDescription>Average productivity by department</CardDescription>
          </CardHeader>
          <CardContent>
            {deptAvgs.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                No department data available
              </div>
            ) : (
              <div className="space-y-3">
                {deptAvgs.map((dept) => (
                  <div key={dept.dept} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate font-medium">{dept.dept}</span>
                      <span className="text-muted-foreground ml-2">{dept.avg}%</span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${dept.avg}%`,
                          background: dept.avg >= 70
                            ? "linear-gradient(to right, #22c55e, #4ade80)"
                            : dept.avg >= 50
                            ? "linear-gradient(to right, #eab308, #facc15)"
                            : "linear-gradient(to right, #ef4444, #f87171)",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top & Bottom Performers */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Top 5 by Engagement
            </CardTitle>
          </CardHeader>
          <CardContent>
            {top5.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No engagement data available</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 pr-4 font-medium text-muted-foreground">Employee</th>
                      <th className="pb-2 pr-2 font-medium text-muted-foreground text-center">Score</th>
                      <th className="pb-2 pr-2 font-medium text-muted-foreground text-center">Prod</th>
                      <th className="pb-2 pr-2 font-medium text-muted-foreground text-center">Att</th>
                      <th className="pb-2 font-medium text-muted-foreground text-center">Tasks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {top5.map((emp) => (
                      <tr key={emp.user.id} className="border-b last:border-0">
                        <td className="py-2 pr-4">
                          <Link href={`/employees/${emp.user.id}`} className="text-primary hover:underline font-medium">
                            {emp.user.name}
                          </Link>
                          <div className="text-xs text-muted-foreground">{emp.user.department ?? "N/A"}</div>
                        </td>
                        <td className="py-2 pr-2 text-center">
                          <Badge variant="success">{emp.engagementScore}%</Badge>
                        </td>
                        <td className="py-2 pr-2 text-center text-muted-foreground">{emp.productivityScore}%</td>
                        <td className="py-2 pr-2 text-center text-muted-foreground">{emp.attendanceRate}%</td>
                        <td className="py-2 text-center text-muted-foreground">{emp.taskCompletion}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              Bottom 5 — Needs Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bottom5.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No engagement data available</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 pr-4 font-medium text-muted-foreground">Employee</th>
                      <th className="pb-2 pr-2 font-medium text-muted-foreground text-center">Score</th>
                      <th className="pb-2 pr-2 font-medium text-muted-foreground text-center">Prod</th>
                      <th className="pb-2 pr-2 font-medium text-muted-foreground text-center">Att</th>
                      <th className="pb-2 font-medium text-muted-foreground text-center">Area</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bottom5.map((emp) => {
                      const weakest = emp.productivityScore <= emp.attendanceRate && emp.productivityScore <= emp.taskCompletion
                        ? "Productivity"
                        : emp.attendanceRate <= emp.taskCompletion
                        ? "Attendance"
                        : "Tasks";
                      return (
                        <tr key={emp.user.id} className="border-b last:border-0">
                          <td className="py-2 pr-4">
                            <Link href={`/employees/${emp.user.id}`} className="text-primary hover:underline font-medium">
                              {emp.user.name}
                            </Link>
                            <div className="text-xs text-muted-foreground">{emp.user.department ?? "N/A"}</div>
                          </td>
                          <td className="py-2 pr-2 text-center">
                            <Badge variant={emp.engagementScore < 40 ? "destructive" : "warning"}>
                              {emp.engagementScore}%
                            </Badge>
                          </td>
                          <td className="py-2 pr-2 text-center text-muted-foreground">{emp.productivityScore}%</td>
                          <td className="py-2 pr-2 text-center text-muted-foreground">{emp.attendanceRate}%</td>
                          <td className="py-2 text-center">
                            <Badge variant="secondary" className="text-[10px]">{weakest}</Badge>
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

      {/* Peak Hours Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Peak Hours Analysis
          </CardTitle>
          <CardDescription>Activity distribution across hours of the day</CardDescription>
        </CardHeader>
        <CardContent>
          {hourlyActivity.every(h => h.seconds === 0) ? (
            <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
              No hourly activity data available
            </div>
          ) : (
            <div>
              <div className="flex items-end gap-1" style={{ height: 120 }}>
                {hourlyActivity.map(({ hour, seconds }) => {
                  const pct = (seconds / maxHourlySeconds) * 100;
                  const intensity = seconds === 0
                    ? "bg-muted"
                    : pct > 75 ? "bg-primary" : pct > 50 ? "bg-primary/80" : pct > 25 ? "bg-primary/60" : "bg-primary/40";
                  return (
                    <div
                      key={hour}
                      className="flex-1 flex flex-col items-center justify-end"
                      title={`${hour}:00 - ${Math.round(seconds / 60)}m active`}
                    >
                      <div
                        className={`w-full rounded-t ${intensity} transition-all`}
                        style={{ height: `${Math.max(pct, seconds > 0 ? 2 : 0)}%` }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-1 mt-1">
                {hourlyActivity.map(({ hour }) => (
                  <div key={hour} className="flex-1 text-center text-[10px] text-muted-foreground">
                    {hour % 3 === 0 ? `${hour}` : ""}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Empty State */}
      {curScores.length === 0 && currentAttendance.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No data yet</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Insights will appear once your organization has activity and attendance data.
              Deploy agents and have employees start tracking their time.
            </p>
            <div className="flex gap-4 justify-center mt-4">
              <Link
                href="/settings/agent-setup"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                Deploy agents <ArrowRight className="h-3 w-3" />
              </Link>
              <Link
                href="/time-tracking"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                Start tracking <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
