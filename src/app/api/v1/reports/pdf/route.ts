import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { generateReportHTML } from "@/lib/report-template";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { startOfDay, endOfDay, format } from "date-fns";

const pdfSchema = z.object({
  type: z.enum(["productivity", "attendance", "security", "time-tracking"]),
  dateRange: z.object({
    from: z.string(),
    to: z.string(),
  }),
});

function formatHours(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user.role, "reports:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgId = session.user.organizationId;

  try {
    const body = await request.json();
    const parsed = pdfSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { type, dateRange } = parsed.data;
    const from = startOfDay(new Date(dateRange.from));
    const to = endOfDay(new Date(dateRange.to));
    const dateLabel = `${format(from, "MMM d, yyyy")} – ${format(to, "MMM d, yyyy")}`;

    // Fetch organization branding
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true, settings: true },
    });

    const orgName = org?.name || "Organization";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const settings = (org?.settings as Record<string, any>) || {};
    const logoUrl: string | undefined = settings.logoUrl || undefined;

    // Generate report data (same logic as the generate route)
    const summary = await generateReportData(orgId, type, from, to);

    const reportTitle =
      type === "productivity"
        ? "Productivity Report"
        : type === "attendance"
          ? "Attendance Report"
          : type === "security"
            ? "Security Report"
            : "Time Tracking Report";

    const html = generateReportHTML({
      title: reportTitle,
      orgName,
      logoUrl,
      dateRange: dateLabel,
      generatedAt: format(new Date(), "MMM d, yyyy 'at' h:mm a"),
      summary,
      reportType: type,
    });

    // Save report history
    const fileName = `${type}-report-${format(from, "yyyyMMdd")}-${format(to, "yyyyMMdd")}.pdf`;
    await prisma.reportHistory.create({
      data: {
        organizationId: orgId,
        reportType: type,
        dateFrom: from,
        dateTo: to,
        format: "pdf",
        generatedBy: session.user.id,
        fileName,
        fileSize: Buffer.byteLength(html, "utf-8"),
        recordCount: (summary.totalRecords as number) || (summary.totalAlerts as number) || (summary.totalEntries as number) || 0,
        summary: {
          title: reportTitle,
          totalEmployees: (summary.totalEmployees as number) || (summary.uniqueEmployees as number) || 0,
          totalRecords: (summary.totalRecords as number) || 0,
          avgScore: (summary.avgProductivityScore as number) || null,
          attendanceRate: (summary.attendanceRate as number) || null,
          totalAlerts: (summary.totalAlerts as number) || null,
          totalHours: (summary.totalHoursOrg as number) || null,
        },
        status: "completed",
      },
    });

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": "inline",
      },
    });
  } catch (error) {
    console.error("Error generating PDF report:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}

async function generateReportData(
  orgId: string,
  type: string,
  from: Date,
  to: Date
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<Record<string, any>> {
  switch (type) {
    case "productivity": {
      const summaries = await prisma.activitySummary.findMany({
        where: { organizationId: orgId, date: { gte: from, lte: to }, hour: null },
        include: { user: { select: { id: true, name: true, department: true } } },
      });

      const userMap = new Map<
        string,
        { name: string; department: string | null; scores: number[]; activeSeconds: number; days: number }
      >();
      for (const s of summaries) {
        if (!userMap.has(s.userId)) {
          userMap.set(s.userId, { name: s.user.name, department: s.user.department, scores: [], activeSeconds: 0, days: 0 });
        }
        const entry = userMap.get(s.userId)!;
        if (s.productivityScore !== null) entry.scores.push(s.productivityScore);
        entry.activeSeconds += s.totalActiveSeconds;
        entry.days++;
      }

      const employees = Array.from(userMap.entries()).map(([id, data]) => ({
        userId: id,
        name: data.name,
        department: data.department || "--",
        avgScore: data.scores.length > 0
          ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length)
          : null,
        totalActiveHours: Math.round((data.activeSeconds / 3600) * 100) / 100,
        activeFormatted: formatHours(data.activeSeconds),
        daysTracked: data.days,
      }));

      const allScores = employees.filter((e) => e.avgScore !== null).map((e) => e.avgScore!);

      return {
        title: "Productivity Report",
        totalEmployees: employees.length,
        avgProductivityScore: allScores.length > 0
          ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
          : null,
        totalRecords: summaries.length,
        employees: employees.sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0)),
      };
    }

    case "attendance": {
      const records = await prisma.attendanceRecord.findMany({
        where: { organizationId: orgId, date: { gte: from, lte: to } },
        include: { user: { select: { id: true, name: true, department: true } } },
      });

      const statusCounts: Record<string, number> = {};
      const userStats = new Map<string, { name: string; department: string | null; present: number; absent: number; late: number; total: number }>();

      for (const r of records) {
        statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
        if (!userStats.has(r.userId)) {
          userStats.set(r.userId, { name: r.user.name, department: r.user.department, present: 0, absent: 0, late: 0, total: 0 });
        }
        const u = userStats.get(r.userId)!;
        u.total++;
        if (r.status === "PRESENT") u.present++;
        else if (r.status === "ABSENT") u.absent++;
        else if (r.status === "HALF_DAY") u.late++;
      }

      const totalRecords = records.length;
      const presentCount = statusCounts["PRESENT"] || 0;

      const employeeAttendance = Array.from(userStats.entries()).map(([, data]) => ({
        ...data,
        department: data.department || "--",
        rate: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0,
      }));

      return {
        title: "Attendance Report",
        totalRecords,
        attendanceRate: totalRecords > 0 ? Math.round((presentCount / totalRecords) * 10000) / 100 : 0,
        statusBreakdown: statusCounts,
        uniqueEmployees: userStats.size,
        employees: employeeAttendance.sort((a, b) => b.rate - a.rate),
      };
    }

    case "security": {
      const alerts = await prisma.securityAlert.findMany({
        where: { organizationId: orgId, createdAt: { gte: from, lte: to } },
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      });

      const severityCounts: Record<string, number> = {};
      const typeCounts: Record<string, number> = {};
      const sCounts: Record<string, number> = {};
      for (const a of alerts) {
        severityCounts[a.severity] = (severityCounts[a.severity] || 0) + 1;
        typeCounts[a.alertType] = (typeCounts[a.alertType] || 0) + 1;
        sCounts[a.status] = (sCounts[a.status] || 0) + 1;
      }

      return {
        title: "Security Report",
        totalAlerts: alerts.length,
        bySeverity: severityCounts,
        byType: typeCounts,
        byStatus: sCounts,
        recentAlerts: alerts.slice(0, 50).map((a) => ({
          id: a.id,
          title: a.title,
          severity: a.severity,
          status: a.status,
          user: a.user.name,
          createdAt: a.createdAt,
        })),
      };
    }

    case "time-tracking": {
      const entries = await prisma.timeEntry.findMany({
        where: { organizationId: orgId, clockIn: { gte: from, lte: to } },
        include: { user: { select: { id: true, name: true, department: true } } },
      });

      const userMap = new Map<
        string,
        { name: string; department: string | null; totalSeconds: number; entries: number; activeSeconds: number; idleSeconds: number }
      >();
      for (const e of entries) {
        if (!userMap.has(e.userId)) {
          userMap.set(e.userId, { name: e.user.name, department: e.user.department, totalSeconds: 0, entries: 0, activeSeconds: 0, idleSeconds: 0 });
        }
        const entry = userMap.get(e.userId)!;
        const end = e.clockOut ? e.clockOut.getTime() : Date.now();
        entry.totalSeconds += Math.floor((end - e.clockIn.getTime()) / 1000);
        entry.activeSeconds += e.activeSeconds || 0;
        entry.idleSeconds += e.idleSeconds || 0;
        entry.entries++;
      }

      const employees = Array.from(userMap.entries()).map(([, data]) => ({
        name: data.name,
        department: data.department || "--",
        totalHours: Math.round((data.totalSeconds / 3600) * 100) / 100,
        totalFormatted: formatHours(data.totalSeconds),
        activeFormatted: formatHours(data.activeSeconds),
        idleFormatted: formatHours(data.idleSeconds),
        entries: data.entries,
      }));

      return {
        title: "Time Tracking Report",
        totalEntries: entries.length,
        totalEmployees: employees.length,
        totalHoursOrg: Math.round(employees.reduce((sum, e) => sum + e.totalHours, 0) * 100) / 100,
        totalOrgFormatted: formatHours(employees.reduce((sum, e) => sum + e.totalHours * 3600, 0)),
        employees: employees.sort((a, b) => b.totalHours - a.totalHours),
      };
    }

    default:
      return {};
  }
}
