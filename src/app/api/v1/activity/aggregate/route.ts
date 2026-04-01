import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { hasMinRole } from "@/lib/permissions";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Infer total active seconds from a sorted list of events. */
function inferActiveSeconds(
  events: { durationSeconds: number | null; timestamp: Date }[]
): number {
  let total = 0;
  for (let i = 0; i < events.length; i++) {
    if (events[i].durationSeconds && events[i].durationSeconds! > 0) {
      total += events[i].durationSeconds!;
    } else if (i < events.length - 1) {
      const diff = Math.floor(
        (events[i + 1].timestamp.getTime() - events[i].timestamp.getTime()) /
          1000
      );
      total += Math.min(diff, 600); // Cap at 10 min
    } else {
      total += 30; // Last event default
    }
  }
  return total;
}

/** Count top occurrences from a list of string values. */
function countTop(
  values: (string | null)[],
  limit = 10
): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const v of values) {
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

/**
 * Upsert a daily summary (hour = null).
 * Prisma composite unique doesn't support null, so we findFirst + update/create.
 */
async function upsertDailySummary(data: {
  userId: string;
  organizationId: string;
  date: Date;
  totalActiveSeconds: number;
  totalIdleSeconds: number;
  productivityScore: number;
  topApps: { name: string; count: number }[];
  topDomains: { name: string; count: number }[];
}) {
  const existing = await prisma.activitySummary.findFirst({
    where: { userId: data.userId, date: data.date, hour: null },
    select: { id: true },
  });

  if (existing) {
    await prisma.activitySummary.update({
      where: { id: existing.id },
      data: {
        totalActiveSeconds: data.totalActiveSeconds,
        totalIdleSeconds: data.totalIdleSeconds,
        productivityScore: data.productivityScore,
        topApps: data.topApps,
        topDomains: data.topDomains,
      },
    });
  } else {
    await prisma.activitySummary.create({
      data: {
        userId: data.userId,
        organizationId: data.organizationId,
        date: data.date,
        hour: null,
        totalActiveSeconds: data.totalActiveSeconds,
        totalIdleSeconds: data.totalIdleSeconds,
        productivityScore: data.productivityScore,
        topApps: data.topApps,
        topDomains: data.topDomains,
      },
    });
  }
}

/**
 * Upsert an hourly summary (hour = 0-23).
 * Can use Prisma composite unique since hour is non-null.
 */
async function upsertHourlySummary(data: {
  userId: string;
  organizationId: string;
  date: Date;
  hour: number;
  totalActiveSeconds: number;
  totalIdleSeconds: number;
  productivityScore: number;
  topApps: { name: string; count: number }[];
  topDomains: { name: string; count: number }[];
}) {
  await prisma.activitySummary.upsert({
    where: {
      userId_date_hour: {
        userId: data.userId,
        date: data.date,
        hour: data.hour,
      },
    },
    update: {
      totalActiveSeconds: data.totalActiveSeconds,
      totalIdleSeconds: data.totalIdleSeconds,
      topApps: data.topApps,
      topDomains: data.topDomains,
      productivityScore: data.productivityScore,
    },
    create: {
      userId: data.userId,
      organizationId: data.organizationId,
      date: data.date,
      hour: data.hour,
      totalActiveSeconds: data.totalActiveSeconds,
      totalIdleSeconds: data.totalIdleSeconds,
      topApps: data.topApps,
      topDomains: data.topDomains,
      productivityScore: data.productivityScore,
    },
  });
}

// ─── Core aggregation logic ─────────────────────────────────────────────────

async function runAggregation(): Promise<{
  organizationsProcessed: number;
  summariesCreated: number;
  eventsProcessed: number;
}> {
  const now = new Date();
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 3600 * 1000);

  // Find all organizations that have recent activity events
  const orgsWithEvents = await prisma.activityEvent.groupBy({
    by: ["organizationId"],
    where: {
      timestamp: { gte: twoDaysAgo },
    },
  });

  let summariesCreated = 0;
  let eventsProcessed = 0;

  for (const { organizationId } of orgsWithEvents) {
    // Get all events from the last 2 days for this org
    const events = await prisma.activityEvent.findMany({
      where: {
        organizationId,
        timestamp: { gte: twoDaysAgo },
      },
      orderBy: { timestamp: "asc" },
      select: {
        id: true,
        userId: true,
        eventType: true,
        appName: true,
        domain: true,
        durationSeconds: true,
        timestamp: true,
      },
    });

    eventsProcessed += events.length;

    // Group events by userId + date
    const byUserDate = new Map<string, typeof events>();
    for (const ev of events) {
      const dateStr = ev.timestamp.toISOString().slice(0, 10);
      const key = `${ev.userId}::${dateStr}`;
      if (!byUserDate.has(key)) byUserDate.set(key, []);
      byUserDate.get(key)!.push(ev);
    }

    // Process each user-date group
    for (const [key, userEvents] of byUserDate) {
      const [userId, dateStr] = key.split("::");
      const date = new Date(dateStr + "T00:00:00.000Z");

      // ── Daily summary ───────────────────────────────────────────
      const totalActiveSeconds = inferActiveSeconds(userEvents);
      const totalIdleSeconds = Math.max(0, 8 * 3600 - totalActiveSeconds);
      const productivityScore = Math.min(
        100,
        Math.round((totalActiveSeconds / (8 * 3600)) * 100)
      );

      const topApps = countTop(
        userEvents
          .filter((e) => e.eventType === "APP_SWITCH")
          .map((e) => e.appName)
      );
      const topDomains = countTop(
        userEvents
          .filter((e) => e.eventType === "WEBSITE_VISIT")
          .map((e) => e.domain)
      );

      await upsertDailySummary({
        userId,
        organizationId,
        date,
        totalActiveSeconds,
        totalIdleSeconds,
        productivityScore,
        topApps,
        topDomains,
      });
      summariesCreated++;

      // ── Hourly summaries ────────────────────────────────────────
      const byHour = new Map<number, typeof userEvents>();
      for (const ev of userEvents) {
        const hour = ev.timestamp.getUTCHours();
        if (!byHour.has(hour)) byHour.set(hour, []);
        byHour.get(hour)!.push(ev);
      }

      for (const [hour, hourEvents] of byHour) {
        const activeSeconds = inferActiveSeconds(hourEvents);
        const idleSeconds = Math.max(0, 3600 - activeSeconds);

        const hourTopApps = countTop(
          hourEvents
            .filter((e) => e.eventType === "APP_SWITCH")
            .map((e) => e.appName)
        );
        const hourTopDomains = countTop(
          hourEvents
            .filter((e) => e.eventType === "WEBSITE_VISIT")
            .map((e) => e.domain)
        );

        await upsertHourlySummary({
          userId,
          organizationId,
          date,
          hour,
          totalActiveSeconds: activeSeconds,
          totalIdleSeconds: idleSeconds,
          topApps: hourTopApps,
          topDomains: hourTopDomains,
          productivityScore: Math.min(
            100,
            Math.round((activeSeconds / 3600) * 100)
          ),
        });
        summariesCreated++;
      }
    }
  }

  return {
    organizationsProcessed: orgsWithEvents.length,
    summariesCreated,
    eventsProcessed,
  };
}

// ─── GET: Cron-triggered (Vercel Cron / external scheduler) ─────────────────

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stats = await runAggregation();
    return NextResponse.json({
      ok: true,
      ...stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Activity aggregation cron failed:", error);
    return NextResponse.json(
      { error: "Aggregation failed" },
      { status: 500 }
    );
  }
}

// ─── POST: Manual trigger by admin ──────────────────────────────────────────

export async function POST() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasMinRole(session.user.role, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const stats = await runAggregation();
    return NextResponse.json({
      ok: true,
      ...stats,
      triggeredBy: session.user.email,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Manual activity aggregation failed:", error);
    return NextResponse.json(
      { error: "Aggregation failed" },
      { status: 500 }
    );
  }
}
