import { prisma } from "@/lib/prisma";
import { sendIntegrationMessage } from "@/lib/integrations";
import { NextRequest, NextResponse } from "next/server";
import { startOfDay, endOfDay, subDays, format } from "date-fns";

// GET /api/v1/reports/cron — run scheduled reports
// Called by Vercel Cron or external scheduler
// Authenticated via CRON_SECRET header
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const currentHour = now.getUTCHours();
  const currentDay = now.getUTCDay(); // 0=Sun

  try {
    // Fetch all active scheduled reports
    const reports = await prisma.scheduledReport.findMany({
      where: { isActive: true },
      include: {
        organization: { select: { id: true, name: true } },
      },
    });

    let processed = 0;
    let channelsSent = 0;

    for (const report of reports) {
      // Determine if this report should run now based on schedule
      const shouldRun = shouldRunReport(report.schedule, currentHour, currentDay, report.lastRunAt);
      if (!shouldRun) continue;

      try {
        // Calculate date range based on schedule
        const { from, to } = getDateRange(report.schedule);
        const dateLabel = `${format(from, "MMM d")} – ${format(to, "MMM d, yyyy")}`;

        // Generate report summary
        const summary = await generateReportSummary(report.organizationId, report.reportType, from, to);

        // Update last run time
        await prisma.scheduledReport.update({
          where: { id: report.id },
          data: { lastRunAt: now },
        });

        // Post to Slack/Teams channel if enabled
        if (report.sendToChannel && summary) {
          await sendIntegrationMessage(report.organizationId, {
            title: `📊 ${report.name}`,
            message: summary.message,
            color: summary.color,
            link: `${process.env.NEXTAUTH_URL || "https://mydexnow.com"}/reports`,
            fields: [
              { label: "Period", value: dateLabel },
              ...summary.fields,
            ],
          });
          channelsSent++;
        }

        processed++;
      } catch (err) {
        console.error(`Error processing scheduled report ${report.id}:`, err);
      }
    }

    return NextResponse.json({
      processed,
      channelsSent,
      total: reports.length,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("Error running scheduled reports cron:", error);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}

function shouldRunReport(schedule: string, hour: number, day: number, lastRunAt: Date | null): boolean {
  const s = schedule.toLowerCase();

  // Don't run if already ran today
  if (lastRunAt) {
    const lastRunDate = new Date(lastRunAt);
    const now = new Date();
    if (lastRunDate.toDateString() === now.toDateString()) return false;
  }

  // "daily" — run at 8am UTC
  if (s === "daily" && hour === 8) return true;

  // "weekly" — run Monday at 8am UTC
  if (s === "weekly" && day === 1 && hour === 8) return true;

  // "monthly" — run 1st of month at 8am UTC
  if (s === "monthly" && new Date().getUTCDate() === 1 && hour === 8) return true;

  return false;
}

function getDateRange(schedule: string): { from: Date; to: Date } {
  const s = schedule.toLowerCase();
  const now = new Date();

  if (s === "daily") {
    const yesterday = subDays(now, 1);
    return { from: startOfDay(yesterday), to: endOfDay(yesterday) };
  }
  if (s === "weekly") {
    return { from: startOfDay(subDays(now, 7)), to: endOfDay(subDays(now, 1)) };
  }
  if (s === "monthly") {
    return { from: startOfDay(subDays(now, 30)), to: endOfDay(subDays(now, 1)) };
  }

  // Default to last 7 days
  return { from: startOfDay(subDays(now, 7)), to: endOfDay(subDays(now, 1)) };
}

async function generateReportSummary(
  orgId: string,
  reportType: string,
  from: Date,
  to: Date
): Promise<{ message: string; color: string; fields: { label: string; value: string }[] } | null> {
  switch (reportType) {
    case "productivity": {
      const summaries = await prisma.activitySummary.findMany({
        where: { organizationId: orgId, date: { gte: from, lte: to }, hour: null },
      });
      const scores = summaries.filter(s => s.productivityScore !== null).map(s => s.productivityScore!);
      const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      const totalActive = Math.round(summaries.reduce((s, v) => s + v.totalActiveSeconds, 0) / 3600);
      const uniqueUsers = new Set(summaries.map(s => s.userId)).size;

      return {
        message: `Avg productivity score: *${avgScore}%* across ${uniqueUsers} employees`,
        color: avgScore >= 70 ? "#22C55E" : avgScore >= 50 ? "#F59E0B" : "#EF4444",
        fields: [
          { label: "Avg Score", value: `${avgScore}%` },
          { label: "Total Active Hours", value: `${totalActive}h` },
          { label: "Employees Tracked", value: String(uniqueUsers) },
        ],
      };
    }

    case "attendance": {
      const records = await prisma.attendanceRecord.findMany({
        where: { organizationId: orgId, date: { gte: from, lte: to } },
      });
      const total = records.length;
      const present = records.filter(r => r.status === "PRESENT").length;
      const absent = records.filter(r => r.status === "ABSENT").length;
      const rate = total > 0 ? Math.round((present / total) * 100) : 0;

      return {
        message: `Attendance rate: *${rate}%* — ${present} present, ${absent} absent`,
        color: rate >= 90 ? "#22C55E" : rate >= 75 ? "#F59E0B" : "#EF4444",
        fields: [
          { label: "Attendance Rate", value: `${rate}%` },
          { label: "Present", value: String(present) },
          { label: "Absent", value: String(absent) },
        ],
      };
    }

    case "security": {
      const alerts = await prisma.securityAlert.findMany({
        where: { organizationId: orgId, createdAt: { gte: from, lte: to } },
      });
      const critical = alerts.filter(a => a.severity === "CRITICAL").length;
      const high = alerts.filter(a => a.severity === "HIGH").length;
      const open = alerts.filter(a => a.status === "OPEN").length;

      return {
        message: `${alerts.length} security alerts — ${critical} critical, ${high} high, ${open} still open`,
        color: critical > 0 ? "#EF4444" : high > 0 ? "#F59E0B" : "#22C55E",
        fields: [
          { label: "Total Alerts", value: String(alerts.length) },
          { label: "Critical", value: String(critical) },
          { label: "Open", value: String(open) },
        ],
      };
    }

    case "time-tracking": {
      const entries = await prisma.timeEntry.findMany({
        where: { organizationId: orgId, clockIn: { gte: from, lte: to } },
      });
      const totalSeconds = entries.reduce((sum, e) => {
        const end = e.clockOut ? e.clockOut.getTime() : Date.now();
        return sum + Math.floor((end - e.clockIn.getTime()) / 1000);
      }, 0);
      const totalHours = Math.round(totalSeconds / 3600);
      const uniqueUsers = new Set(entries.map(e => e.userId)).size;
      const avgPerUser = uniqueUsers > 0 ? Math.round(totalHours / uniqueUsers) : 0;

      return {
        message: `${totalHours} total hours logged by ${uniqueUsers} employees (avg ${avgPerUser}h each)`,
        color: "#3B82F6",
        fields: [
          { label: "Total Hours", value: `${totalHours}h` },
          { label: "Employees", value: String(uniqueUsers) },
          { label: "Avg per Employee", value: `${avgPerUser}h` },
        ],
      };
    }

    default:
      return null;
  }
}
