import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { startOfDay, endOfDay } from "date-fns";

const generateSchema = z.object({
  type: z.enum(["productivity", "attendance", "security", "time-tracking"]),
  dateRange: z.object({
    from: z.string(),
    to: z.string(),
  }),
  format: z.enum(["pdf", "csv"]).default("pdf"),
});

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
    const parsed = generateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { type, dateRange, format } = parsed.data;
    const from = startOfDay(new Date(dateRange.from));
    const to = endOfDay(new Date(dateRange.to));

    let summary: Record<string, unknown> = {};

    switch (type) {
      case "productivity": {
        const summaries = await prisma.activitySummary.findMany({
          where: {
            organizationId: orgId,
            date: { gte: from, lte: to },
            hour: null,
          },
          include: {
            user: { select: { id: true, name: true, department: true } },
          },
        });

        const userMap = new Map<
          string,
          { name: string; department: string | null; scores: number[]; activeSeconds: number }
        >();
        for (const s of summaries) {
          if (!userMap.has(s.userId)) {
            userMap.set(s.userId, {
              name: s.user.name,
              department: s.user.department,
              scores: [],
              activeSeconds: 0,
            });
          }
          const entry = userMap.get(s.userId)!;
          if (s.productivityScore !== null) entry.scores.push(s.productivityScore);
          entry.activeSeconds += s.totalActiveSeconds;
        }

        const employees = Array.from(userMap.entries()).map(([id, data]) => ({
          userId: id,
          name: data.name,
          department: data.department,
          avgProductivityScore:
            data.scores.length > 0
              ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length)
              : null,
          totalActiveHours: Math.round((data.activeSeconds / 3600) * 100) / 100,
        }));

        const allScores = employees
          .filter((e) => e.avgProductivityScore !== null)
          .map((e) => e.avgProductivityScore!);

        summary = {
          totalEmployees: employees.length,
          avgProductivityScore:
            allScores.length > 0
              ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
              : null,
          totalRecords: summaries.length,
          employees: employees.sort(
            (a, b) => (b.avgProductivityScore ?? 0) - (a.avgProductivityScore ?? 0)
          ),
        };
        break;
      }

      case "attendance": {
        const records = await prisma.attendanceRecord.findMany({
          where: {
            organizationId: orgId,
            date: { gte: from, lte: to },
          },
          include: {
            user: { select: { id: true, name: true, department: true } },
          },
        });

        const statusCounts: Record<string, number> = {};
        for (const r of records) {
          statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
        }

        const totalRecords = records.length;
        const presentCount = statusCounts["PRESENT"] || 0;
        const attendanceRate =
          totalRecords > 0
            ? Math.round((presentCount / totalRecords) * 10000) / 100
            : 0;

        summary = {
          totalRecords,
          attendanceRate,
          statusBreakdown: statusCounts,
          uniqueEmployees: new Set(records.map((r) => r.userId)).size,
        };
        break;
      }

      case "security": {
        const alerts = await prisma.securityAlert.findMany({
          where: {
            organizationId: orgId,
            createdAt: { gte: from, lte: to },
          },
          include: {
            user: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
        });

        const severityCounts: Record<string, number> = {};
        const typeCounts: Record<string, number> = {};
        const statusCounts: Record<string, number> = {};
        for (const a of alerts) {
          severityCounts[a.severity] = (severityCounts[a.severity] || 0) + 1;
          typeCounts[a.alertType] = (typeCounts[a.alertType] || 0) + 1;
          statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
        }

        summary = {
          totalAlerts: alerts.length,
          bySeverity: severityCounts,
          byType: typeCounts,
          byStatus: statusCounts,
          recentAlerts: alerts.slice(0, 10).map((a) => ({
            id: a.id,
            title: a.title,
            severity: a.severity,
            status: a.status,
            user: a.user.name,
            createdAt: a.createdAt,
          })),
        };
        break;
      }

      case "time-tracking": {
        const entries = await prisma.timeEntry.findMany({
          where: {
            organizationId: orgId,
            clockIn: { gte: from, lte: to },
          },
          include: {
            user: { select: { id: true, name: true, department: true } },
          },
        });

        const userMap = new Map<
          string,
          { name: string; department: string | null; totalSeconds: number; entries: number }
        >();
        for (const e of entries) {
          if (!userMap.has(e.userId)) {
            userMap.set(e.userId, {
              name: e.user.name,
              department: e.user.department,
              totalSeconds: 0,
              entries: 0,
            });
          }
          const entry = userMap.get(e.userId)!;
          const end = e.clockOut ? e.clockOut.getTime() : Date.now();
          entry.totalSeconds += Math.floor(
            (end - e.clockIn.getTime()) / 1000
          );
          entry.entries++;
        }

        const employees = Array.from(userMap.entries()).map(([id, data]) => ({
          userId: id,
          name: data.name,
          department: data.department,
          totalHours: Math.round((data.totalSeconds / 3600) * 100) / 100,
          totalEntries: data.entries,
        }));

        summary = {
          totalEntries: entries.length,
          totalEmployees: employees.length,
          totalHoursOrg: Math.round(
            employees.reduce((sum, e) => sum + e.totalHours, 0) * 100
          ) / 100,
          employees: employees.sort((a, b) => b.totalHours - a.totalHours),
        };
        break;
      }
    }

    return NextResponse.json({
      reportType: type,
      dateRange: { from: dateRange.from, to: dateRange.to },
      format,
      generatedAt: new Date().toISOString(),
      summary,
    });
  } catch (error) {
    console.error("Error generating report:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}
