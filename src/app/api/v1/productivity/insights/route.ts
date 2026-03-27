import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { NextResponse } from "next/server";
import { subDays, startOfDay, endOfDay } from "date-fns";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user.role, "activity:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgId = session.user.organizationId;
  const canReadAll = hasPermission(session.user.role, "activity:read-all");

  try {
    const now = new Date();
    const currentStart = startOfDay(subDays(now, 30));
    const currentEnd = endOfDay(now);
    const previousStart = startOfDay(subDays(now, 60));
    const previousEnd = endOfDay(subDays(now, 31));

    const userFilter = canReadAll ? {} : { userId: session.user.id };

    // Current and previous period summaries
    const [currentSummaries, previousSummaries] = await Promise.all([
      prisma.activitySummary.findMany({
        where: {
          organizationId: orgId,
          date: { gte: currentStart, lte: currentEnd },
          hour: null,
          ...userFilter,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, department: true },
          },
        },
      }),
      prisma.activitySummary.findMany({
        where: {
          organizationId: orgId,
          date: { gte: previousStart, lte: previousEnd },
          hour: null,
          ...userFilter,
        },
      }),
    ]);

    // Aggregate by user
    const userMap = new Map<
      string,
      {
        user: { id: string; name: string; email: string; department: string | null };
        scores: number[];
        activeSeconds: number;
        days: number;
      }
    >();

    for (const s of currentSummaries) {
      if (!userMap.has(s.userId)) {
        userMap.set(s.userId, {
          user: s.user,
          scores: [],
          activeSeconds: 0,
          days: 0,
        });
      }
      const entry = userMap.get(s.userId)!;
      if (s.productivityScore !== null) entry.scores.push(s.productivityScore);
      entry.activeSeconds += s.totalActiveSeconds;
      entry.days++;
    }

    const employees = Array.from(userMap.values())
      .map((e) => ({
        userId: e.user.id,
        name: e.user.name,
        email: e.user.email,
        department: e.user.department,
        avgScore:
          e.scores.length > 0
            ? Math.round(e.scores.reduce((a, b) => a + b, 0) / e.scores.length)
            : null,
        totalActiveHours: Math.round((e.activeSeconds / 3600) * 100) / 100,
        daysTracked: e.days,
      }))
      .sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0));

    // Org-wide scores
    const currentScores = currentSummaries
      .filter((s) => s.productivityScore !== null)
      .map((s) => s.productivityScore!);
    const previousScores = previousSummaries
      .filter((s) => s.productivityScore !== null)
      .map((s) => s.productivityScore!);

    const avgScore =
      currentScores.length > 0
        ? Math.round(
            currentScores.reduce((a, b) => a + b, 0) / currentScores.length
          )
        : null;
    const prevAvgScore =
      previousScores.length > 0
        ? Math.round(
            previousScores.reduce((a, b) => a + b, 0) / previousScores.length
          )
        : null;

    const totalActive = currentSummaries.reduce(
      (sum, s) => sum + s.totalActiveSeconds,
      0
    );
    const uniqueDays = new Set(
      currentSummaries.map((s) => `${s.userId}-${s.date.toISOString()}`)
    ).size;
    const avgActiveHoursPerDay =
      uniqueDays > 0
        ? Math.round((totalActive / uniqueDays / 3600) * 10) / 10
        : 0;

    const scoreTrend =
      avgScore !== null && prevAvgScore !== null && prevAvgScore > 0
        ? Math.round(((avgScore - prevAvgScore) / prevAvgScore) * 1000) / 10
        : null;

    return NextResponse.json({
      period: {
        from: currentStart.toISOString(),
        to: currentEnd.toISOString(),
      },
      metrics: {
        avgProductivityScore: avgScore,
        avgActiveHoursPerDay,
        totalEmployees: employees.length,
        scoreTrendPercent: scoreTrend,
      },
      topPerformers: employees.slice(0, 5),
      bottomPerformers: employees
        .filter((e) => e.avgScore !== null)
        .slice(-5)
        .reverse(),
      allEmployees: employees,
    });
  } catch (error) {
    console.error("Error fetching productivity insights:", error);
    return NextResponse.json(
      { error: "Failed to fetch productivity insights" },
      { status: 500 }
    );
  }
}
