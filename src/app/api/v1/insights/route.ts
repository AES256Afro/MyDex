import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasMinRole } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";
import { subDays, startOfDay, endOfDay } from "date-fns";

// ── Types ────────────────────────────────────────────────────────────

interface Insight {
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

function trendWord(change: number): string {
  if (change > 0) return "up";
  if (change < 0) return "down";
  return "stable";
}

// ── GET /api/v1/insights ─────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasMinRole(session.user.role, "MANAGER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgId = session.user.organizationId;
  const params = request.nextUrl.searchParams;
  const type = params.get("type") || "productivity";
  const period = Math.min(Math.max(parseInt(params.get("period") || "7", 10), 7), 30);

  const now = new Date();
  const currentStart = startOfDay(subDays(now, period));
  const currentEnd = endOfDay(now);
  const previousStart = startOfDay(subDays(now, period * 2));
  const previousEnd = endOfDay(subDays(now, period + 1));

  try {
    switch (type) {
      case "productivity":
        return NextResponse.json(await getProductivityInsights(orgId, currentStart, currentEnd, previousStart, previousEnd, period));
      case "attendance":
        return NextResponse.json(await getAttendanceInsights(orgId, currentStart, currentEnd, previousStart, previousEnd, period));
      case "engagement":
        return NextResponse.json(await getEngagementInsights(orgId, currentStart, currentEnd, period));
      case "anomalies":
        return NextResponse.json(await getAnomalyInsights(orgId, currentStart, currentEnd));
      default:
        return NextResponse.json({ error: "Invalid type. Use: productivity, attendance, engagement, anomalies" }, { status: 400 });
    }
  } catch (error) {
    console.error("[Insights API]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── Productivity Insights ────────────────────────────────────────────

async function getProductivityInsights(
  orgId: string, currentStart: Date, currentEnd: Date,
  previousStart: Date, previousEnd: Date, period: number,
) {
  const [currentSummaries, previousSummaries] = await Promise.all([
    prisma.activitySummary.findMany({
      where: { organizationId: orgId, date: { gte: currentStart, lte: currentEnd }, hour: null },
      include: { user: { select: { id: true, name: true, email: true, department: true } } },
    }),
    prisma.activitySummary.findMany({
      where: { organizationId: orgId, date: { gte: previousStart, lte: previousEnd }, hour: null },
    }),
  ]);

  // Org-wide average
  const curScores = currentSummaries.filter(s => s.productivityScore !== null).map(s => s.productivityScore!);
  const prevScores = previousSummaries.filter(s => s.productivityScore !== null).map(s => s.productivityScore!);
  const avgCur = curScores.length > 0 ? Math.round(curScores.reduce((a, b) => a + b, 0) / curScores.length) : 0;
  const avgPrev = prevScores.length > 0 ? Math.round(prevScores.reduce((a, b) => a + b, 0) / prevScores.length) : 0;
  const change = pctChange(avgCur, avgPrev);

  const insights: Insight[] = [];

  // Org-wide trend
  insights.push({
    type: "trend",
    severity: change >= 0 ? "positive" : "warning",
    title: `Org productivity ${trendWord(change)} ${Math.abs(change)}%`,
    description: `Average productivity score is ${avgCur}% over the last ${period} days, ${change >= 0 ? "up" : "down"} from ${avgPrev}% in the previous period.`,
    metric: { label: "Avg Productivity", value: `${avgCur}%`, change: `${change >= 0 ? "+" : ""}${change}%` },
  });

  // Per-department averages
  const deptMap = new Map<string, number[]>();
  for (const s of currentSummaries) {
    const dept = s.user.department || "Unassigned";
    if (!deptMap.has(dept)) deptMap.set(dept, []);
    if (s.productivityScore !== null) deptMap.get(dept)!.push(s.productivityScore);
  }
  for (const [dept, scores] of deptMap) {
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    insights.push({
      type: "trend",
      severity: avg >= 70 ? "positive" : avg >= 50 ? "info" : "warning",
      title: `${dept}: ${avg}% productivity`,
      description: `${dept} department averaged ${avg}% productivity over ${scores.length} data points.`,
      metric: { label: dept, value: `${avg}%` },
    });
  }

  // Per-employee aggregation
  const userMap = new Map<string, { user: { id: string; name: string; email: string }; scores: number[] }>();
  for (const s of currentSummaries) {
    if (s.productivityScore === null) continue;
    if (!userMap.has(s.userId)) userMap.set(s.userId, { user: s.user, scores: [] });
    userMap.get(s.userId)!.scores.push(s.productivityScore);
  }

  const userAvgs = Array.from(userMap.values()).map(u => ({
    ...u,
    avg: Math.round(u.scores.reduce((a, b) => a + b, 0) / u.scores.length),
  })).sort((a, b) => b.avg - a.avg);

  // Top 5
  const top5 = userAvgs.slice(0, 5);
  if (top5.length > 0) {
    insights.push({
      type: "achievement",
      severity: "positive",
      title: "Top performers this period",
      description: top5.map(u => `${u.user.name} (${u.avg}%)`).join(", "),
      affectedUsers: top5.map(u => u.user),
    });
  }

  // Bottom 5
  const bottom5 = userAvgs.slice(-5).reverse();
  if (bottom5.length > 0 && bottom5[0].avg < 60) {
    insights.push({
      type: "recommendation",
      severity: "warning",
      title: "Employees needing attention",
      description: bottom5.map(u => `${u.user.name} (${u.avg}%)`).join(", "),
      affectedUsers: bottom5.map(u => u.user),
      recommendation: "Consider scheduling one-on-ones with these team members to identify blockers.",
    });
  }

  // Peak hours (from hourly summaries)
  const hourlySummaries = await prisma.activitySummary.findMany({
    where: { organizationId: orgId, date: { gte: currentStart, lte: currentEnd }, hour: { not: null } },
  });
  const hourlyMap = new Map<number, number>();
  for (const s of hourlySummaries) {
    if (s.hour !== null) {
      hourlyMap.set(s.hour, (hourlyMap.get(s.hour) ?? 0) + s.totalActiveSeconds);
    }
  }
  const peakHours = Array.from(hourlyMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([h]) => `${h}:00`);

  if (peakHours.length > 0) {
    insights.push({
      type: "trend",
      severity: "info",
      title: "Peak productivity hours",
      description: `Most productive hours: ${peakHours.join(", ")}. Schedule deep-work blocks during these times.`,
      recommendation: `Schedule meetings outside ${peakHours[0]} - avoid disrupting peak focus time.`,
    });
  }

  // Top apps from JSON
  const appCounts = new Map<string, number>();
  for (const s of currentSummaries) {
    const apps = s.topApps as unknown;
    if (Array.isArray(apps)) {
      for (const item of apps) {
        if (typeof item === "object" && item !== null && "name" in item && "seconds" in item) {
          const a = item as { name: string; seconds: number };
          appCounts.set(a.name, (appCounts.get(a.name) ?? 0) + a.seconds);
        }
      }
    }
  }
  const topApps = Array.from(appCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (topApps.length > 0) {
    insights.push({
      type: "trend",
      severity: "info",
      title: "Most used applications",
      description: topApps.map(([name]) => name).join(", "),
    });
  }

  return { type: "productivity", period, insights };
}

// ── Attendance Insights ──────────────────────────────────────────────

async function getAttendanceInsights(
  orgId: string, currentStart: Date, currentEnd: Date,
  previousStart: Date, previousEnd: Date, period: number,
) {
  const [currentRecords, previousRecords] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where: { organizationId: orgId, date: { gte: currentStart, lte: currentEnd } },
      include: { user: { select: { id: true, name: true, email: true, department: true } } },
    }),
    prisma.attendanceRecord.findMany({
      where: { organizationId: orgId, date: { gte: previousStart, lte: previousEnd } },
    }),
  ]);

  const insights: Insight[] = [];

  // Org attendance rate
  const curPresent = currentRecords.filter(r => r.status === "PRESENT" || r.status === "HALF_DAY").length;
  const curRate = currentRecords.length > 0 ? Math.round((curPresent / currentRecords.length) * 1000) / 10 : 0;
  const prevPresent = previousRecords.filter(r => r.status === "PRESENT" || r.status === "HALF_DAY").length;
  const prevRate = previousRecords.length > 0 ? Math.round((prevPresent / previousRecords.length) * 1000) / 10 : 0;
  const rateChange = pctChange(curRate, prevRate);

  insights.push({
    type: "trend",
    severity: curRate >= 90 ? "positive" : curRate >= 75 ? "info" : "warning",
    title: `Attendance rate: ${curRate}%`,
    description: `Org-wide attendance rate is ${curRate}%, ${trendWord(rateChange)} ${Math.abs(rateChange)}% vs previous period.`,
    metric: { label: "Attendance Rate", value: `${curRate}%`, change: `${rateChange >= 0 ? "+" : ""}${rateChange}%` },
  });

  // Per-department rates
  const deptRecords = new Map<string, { total: number; present: number }>();
  for (const r of currentRecords) {
    const dept = r.user.department || "Unassigned";
    if (!deptRecords.has(dept)) deptRecords.set(dept, { total: 0, present: 0 });
    const d = deptRecords.get(dept)!;
    d.total++;
    if (r.status === "PRESENT" || r.status === "HALF_DAY") d.present++;
  }
  for (const [dept, data] of deptRecords) {
    const rate = Math.round((data.present / data.total) * 1000) / 10;
    if (rate < 80) {
      insights.push({
        type: "trend",
        severity: "warning",
        title: `${dept} attendance: ${rate}%`,
        description: `${dept} has below-average attendance at ${rate}%.`,
        metric: { label: dept, value: `${rate}%` },
      });
    }
  }

  // Chronic absentees (absent > 3 days)
  const userAbsences = new Map<string, { user: { id: string; name: string; email: string }; count: number }>();
  for (const r of currentRecords) {
    if (r.status === "ABSENT") {
      if (!userAbsences.has(r.userId)) userAbsences.set(r.userId, { user: r.user, count: 0 });
      userAbsences.get(r.userId)!.count++;
    }
  }
  const chronic = Array.from(userAbsences.values()).filter(u => u.count > 3).sort((a, b) => b.count - a.count);
  if (chronic.length > 0) {
    insights.push({
      type: "anomaly",
      severity: "warning",
      title: `${chronic.length} employees with frequent absences`,
      description: chronic.map(u => `${u.user.name} (${u.count} days)`).join(", "),
      affectedUsers: chronic.map(u => u.user),
      recommendation: "Review absence patterns and consider wellness check-ins.",
    });
  }

  // Perfect attendance
  const userIds = new Set(currentRecords.map(r => r.userId));
  const perfectUsers: { id: string; name: string; email: string }[] = [];
  for (const uid of userIds) {
    const records = currentRecords.filter(r => r.userId === uid);
    const allPresent = records.every(r => r.status === "PRESENT" || r.status === "HALF_DAY" || r.status === "HOLIDAY" || r.status === "WEEKEND");
    if (allPresent && records.length >= period * 0.6) {
      perfectUsers.push(records[0].user);
    }
  }
  if (perfectUsers.length > 0) {
    insights.push({
      type: "achievement",
      severity: "positive",
      title: `${perfectUsers.length} employees with perfect attendance`,
      description: perfectUsers.slice(0, 5).map(u => u.name).join(", ") + (perfectUsers.length > 5 ? ` and ${perfectUsers.length - 5} more` : ""),
      affectedUsers: perfectUsers.slice(0, 10),
    });
  }

  // Day-of-week patterns
  const dayCount = new Map<number, { total: number; absent: number }>();
  for (const r of currentRecords) {
    const day = r.date.getDay();
    if (!dayCount.has(day)) dayCount.set(day, { total: 0, absent: 0 });
    const d = dayCount.get(day)!;
    d.total++;
    if (r.status === "ABSENT") d.absent++;
  }
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const worstDay = Array.from(dayCount.entries())
    .filter(([, d]) => d.total > 0)
    .map(([day, d]) => ({ day, rate: Math.round((d.absent / d.total) * 100) }))
    .sort((a, b) => b.rate - a.rate)[0];

  if (worstDay && worstDay.rate > 10) {
    insights.push({
      type: "trend",
      severity: "info",
      title: `${dayNames[worstDay.day]}s have highest absence rate`,
      description: `${worstDay.rate}% absence rate on ${dayNames[worstDay.day]}s — consider flexible scheduling.`,
      recommendation: `Review ${dayNames[worstDay.day]} scheduling or offer remote work options.`,
    });
  }

  return { type: "attendance", period, insights };
}

// ── Engagement Insights ──────────────────────────────────────────────

async function getEngagementInsights(
  orgId: string, currentStart: Date, currentEnd: Date, period: number,
) {
  const [summaries, attendance, tasks] = await Promise.all([
    prisma.activitySummary.findMany({
      where: { organizationId: orgId, date: { gte: currentStart, lte: currentEnd }, hour: null },
      include: { user: { select: { id: true, name: true, email: true, department: true } } },
    }),
    prisma.attendanceRecord.findMany({
      where: { organizationId: orgId, date: { gte: currentStart, lte: currentEnd } },
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
  ]);

  const insights: Insight[] = [];

  // Build per-user engagement scores
  const userScores = new Map<string, {
    user: { id: string; name: string; email: string; department: string | null };
    attendanceRate: number;
    productivityScore: number;
    taskCompletion: number;
    engagementScore: number;
  }>();

  // Attendance rates per user
  const userAttendance = new Map<string, { total: number; present: number }>();
  for (const r of attendance) {
    if (!userAttendance.has(r.userId)) userAttendance.set(r.userId, { total: 0, present: 0 });
    const d = userAttendance.get(r.userId)!;
    d.total++;
    if (r.status === "PRESENT" || r.status === "HALF_DAY") d.present++;
  }

  // Productivity per user
  const userProd = new Map<string, { user: { id: string; name: string; email: string; department: string | null }; scores: number[] }>();
  for (const s of summaries) {
    if (s.productivityScore === null) continue;
    if (!userProd.has(s.userId)) userProd.set(s.userId, { user: s.user, scores: [] });
    userProd.get(s.userId)!.scores.push(s.productivityScore);
  }

  // Task completion per user
  const userTasks = new Map<string, number>();
  for (const t of tasks) {
    if (t.assigneeId) {
      userTasks.set(t.assigneeId, (userTasks.get(t.assigneeId) ?? 0) + 1);
    }
  }

  // Compute composite scores
  const maxTasks = Math.max(...Array.from(userTasks.values()), 1);

  for (const [uid, prodData] of userProd) {
    const att = userAttendance.get(uid);
    const attendanceRate = att ? (att.present / att.total) * 100 : 50;
    const productivityScore = prodData.scores.reduce((a, b) => a + b, 0) / prodData.scores.length;
    const taskCount = userTasks.get(uid) ?? 0;
    const taskCompletion = (taskCount / maxTasks) * 100;

    const engagementScore = Math.round(
      attendanceRate * 0.3 +
      productivityScore * 0.4 +
      taskCompletion * 0.2 +
      Math.min(attendanceRate, 100) * 0.1
    );

    userScores.set(uid, {
      user: prodData.user,
      attendanceRate: Math.round(attendanceRate),
      productivityScore: Math.round(productivityScore),
      taskCompletion: Math.round(taskCompletion),
      engagementScore,
    });
  }

  const sorted = Array.from(userScores.values()).sort((a, b) => b.engagementScore - a.engagementScore);

  // Org-wide engagement
  const orgEngagement = sorted.length > 0
    ? Math.round(sorted.reduce((sum, u) => sum + u.engagementScore, 0) / sorted.length)
    : 0;

  insights.push({
    type: "trend",
    severity: orgEngagement >= 70 ? "positive" : orgEngagement >= 50 ? "info" : "warning",
    title: `Org engagement score: ${orgEngagement}%`,
    description: `Composite engagement based on attendance (30%), productivity (40%), task completion (20%), and responsiveness (10%).`,
    metric: { label: "Engagement Score", value: `${orgEngagement}%` },
  });

  // Top engaged
  const topEngaged = sorted.slice(0, 5);
  if (topEngaged.length > 0) {
    insights.push({
      type: "achievement",
      severity: "positive",
      title: "Most engaged employees",
      description: topEngaged.map(u => `${u.user.name} (${u.engagementScore}%)`).join(", "),
      affectedUsers: topEngaged.map(u => u.user),
    });
  }

  // Low engagement
  const lowEngaged = sorted.filter(u => u.engagementScore < 40);
  if (lowEngaged.length > 0) {
    insights.push({
      type: "recommendation",
      severity: "warning",
      title: `${lowEngaged.length} employees with low engagement`,
      description: lowEngaged.slice(0, 5).map(u => `${u.user.name} (${u.engagementScore}%)`).join(", "),
      affectedUsers: lowEngaged.slice(0, 5).map(u => u.user),
      recommendation: "Schedule check-ins to understand blockers and re-engage these team members.",
    });
  }

  // Department breakdown
  const deptEngagement = new Map<string, number[]>();
  for (const u of sorted) {
    const dept = u.user.department || "Unassigned";
    if (!deptEngagement.has(dept)) deptEngagement.set(dept, []);
    deptEngagement.get(dept)!.push(u.engagementScore);
  }
  for (const [dept, scores] of deptEngagement) {
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    insights.push({
      type: "trend",
      severity: avg >= 70 ? "positive" : avg >= 50 ? "info" : "warning",
      title: `${dept} engagement: ${avg}%`,
      description: `${dept} has ${scores.length} employees with an average engagement of ${avg}%.`,
      metric: { label: dept, value: `${avg}%` },
    });
  }

  return { type: "engagement", period, insights, scores: sorted };
}

// ── Anomaly Detection ────────────────────────────────────────────────

async function getAnomalyInsights(
  orgId: string, currentStart: Date, currentEnd: Date,
) {
  const thirtyDaysAgo = startOfDay(subDays(new Date(), 30));

  const [recentSummaries, baselineSummaries, recentAlerts, offlineDevices] = await Promise.all([
    prisma.activitySummary.findMany({
      where: { organizationId: orgId, date: { gte: currentStart, lte: currentEnd }, hour: null },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.activitySummary.findMany({
      where: { organizationId: orgId, date: { gte: thirtyDaysAgo }, hour: null },
    }),
    prisma.securityAlert.findMany({
      where: { organizationId: orgId, createdAt: { gte: currentStart, lte: currentEnd } },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.agentDevice.findMany({
      where: {
        organizationId: orgId,
        status: { in: ["OFFLINE", "STALE"] },
        lastSeenAt: { lt: subDays(new Date(), 2) },
      },
      select: { id: true, hostname: true, userId: true },
    }),
  ]);

  const insights: Insight[] = [];

  // Productivity drops: compare user's recent score to their 30-day baseline
  const baselineByUser = new Map<string, number[]>();
  for (const s of baselineSummaries) {
    if (s.productivityScore === null) continue;
    if (!baselineByUser.has(s.userId)) baselineByUser.set(s.userId, []);
    baselineByUser.get(s.userId)!.push(s.productivityScore);
  }

  const recentByUser = new Map<string, { user: { id: string; name: string; email: string }; scores: number[] }>();
  for (const s of recentSummaries) {
    if (s.productivityScore === null) continue;
    if (!recentByUser.has(s.userId)) recentByUser.set(s.userId, { user: s.user, scores: [] });
    recentByUser.get(s.userId)!.scores.push(s.productivityScore);
  }

  const productivityDrops: { user: { id: string; name: string; email: string }; drop: number; baseline: number; current: number }[] = [];

  for (const [uid, recent] of recentByUser) {
    const baseline = baselineByUser.get(uid);
    if (!baseline || baseline.length < 5) continue;

    const baselineAvg = baseline.reduce((a, b) => a + b, 0) / baseline.length;
    const recentAvg = recent.scores.reduce((a, b) => a + b, 0) / recent.scores.length;
    const drop = ((baselineAvg - recentAvg) / baselineAvg) * 100;

    if (drop > 20) {
      productivityDrops.push({
        user: recent.user,
        drop: Math.round(drop),
        baseline: Math.round(baselineAvg),
        current: Math.round(recentAvg),
      });
    }
  }

  if (productivityDrops.length > 0) {
    productivityDrops.sort((a, b) => b.drop - a.drop);
    for (const pd of productivityDrops.slice(0, 5)) {
      insights.push({
        type: "anomaly",
        severity: pd.drop > 30 ? "critical" : "warning",
        title: `${pd.user.name}: productivity dropped ${pd.drop}%`,
        description: `Dropped from ${pd.baseline}% baseline to ${pd.current}% recently.`,
        affectedUsers: [pd.user],
        recommendation: `Consider a check-in with ${pd.user.name} to identify potential issues.`,
      });
    }
  }

  // Unusual working hours (from hourly summaries)
  const lateHourSummaries = await prisma.activitySummary.findMany({
    where: {
      organizationId: orgId,
      date: { gte: currentStart, lte: currentEnd },
      hour: { gte: 20 }, // 8pm or later
    },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  const lateWorkers = new Map<string, { user: { id: string; name: string; email: string }; count: number }>();
  for (const s of lateHourSummaries) {
    if (s.totalActiveSeconds > 300) { // more than 5 minutes
      if (!lateWorkers.has(s.userId)) lateWorkers.set(s.userId, { user: s.user, count: 0 });
      lateWorkers.get(s.userId)!.count++;
    }
  }

  const frequentLate = Array.from(lateWorkers.values()).filter(u => u.count >= 3);
  if (frequentLate.length > 0) {
    insights.push({
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
    insights.push({
      type: "anomaly",
      severity: offlineDevices.length > 5 ? "warning" : "info",
      title: `${offlineDevices.length} devices offline for 48+ hours`,
      description: offlineDevices.slice(0, 5).map(d => d.hostname).join(", ") + (offlineDevices.length > 5 ? ` and ${offlineDevices.length - 5} more` : ""),
      recommendation: "Verify these devices are operational and agents are running.",
    });
  }

  // Security alert spikes
  const alertsBySeverity = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  for (const a of recentAlerts) {
    if (a.severity in alertsBySeverity) {
      alertsBySeverity[a.severity as keyof typeof alertsBySeverity]++;
    }
  }

  if (recentAlerts.length > 0) {
    const critHigh = alertsBySeverity.CRITICAL + alertsBySeverity.HIGH;
    insights.push({
      type: "anomaly",
      severity: critHigh > 5 ? "critical" : critHigh > 0 ? "warning" : "info",
      title: `${recentAlerts.length} security alerts in this period`,
      description: `Critical: ${alertsBySeverity.CRITICAL}, High: ${alertsBySeverity.HIGH}, Medium: ${alertsBySeverity.MEDIUM}, Low: ${alertsBySeverity.LOW}`,
      metric: { label: "Security Alerts", value: `${recentAlerts.length}` },
    });
  }

  return {
    type: "anomalies",
    insights,
    summary: {
      productivityDrops: productivityDrops.length,
      lateWorkers: frequentLate.length,
      offlineDevices: offlineDevices.length,
      securityAlerts: recentAlerts.length,
    },
  };
}
