import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const ALL_EVENT_TYPES = [
  "APP_SWITCH",
  "WEBSITE_VISIT",
  "IDLE_START",
  "IDLE_END",
  "FOCUS_GAINED",
  "FOCUS_LOST",
  "HEARTBEAT",
  "FILE_CREATE",
  "FILE_DELETE",
  "FILE_COPY",
  "FILE_MOVE",
  "FILE_RENAME",
] as const;

const querySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  userId: z.string().optional(),
  eventType: z.enum(ALL_EVENT_TYPES).optional(),
  appName: z.string().optional(),
  domain: z.string().optional(),
  limit: z.coerce.number().min(1).max(500).default(100),
  offset: z.coerce.number().min(0).default(0),
});

const eventSchema = z.object({
  eventType: z.enum(ALL_EVENT_TYPES),
  appName: z.string().optional(),
  windowTitle: z.string().optional(),
  url: z.string().optional(),
  domain: z.string().optional(),
  category: z.string().optional(),
  durationSeconds: z.number().int().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  timestamp: z.string().datetime().optional(),
});

const bulkCreateSchema = z.object({
  events: z.array(eventSchema).min(1).max(1000),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = session.user.organizationId;
  const canReadAll = hasPermission(session.user.role, "activity:read-all");

  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const parsed = querySchema.safeParse(searchParams);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { from, to, userId, eventType, appName, domain, limit, offset } =
      parsed.data;

    const where: Record<string, unknown> = {
      organizationId: orgId,
    };

    if (!canReadAll) {
      where.userId = session.user.id;
    } else if (userId) {
      where.userId = userId;
    }

    if (eventType) where.eventType = eventType;
    if (appName) where.appName = { contains: appName, mode: "insensitive" };
    if (domain) where.domain = { contains: domain, mode: "insensitive" };

    if (from || to) {
      where.timestamp = {};
      if (from)
        (where.timestamp as Record<string, unknown>).gte = new Date(from);
      if (to) (where.timestamp as Record<string, unknown>).lte = new Date(to);
    }

    const [events, total] = await Promise.all([
      prisma.activityEvent.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { timestamp: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.activityEvent.count({ where }),
    ]);

    return NextResponse.json({
      events,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error("Error fetching activity events:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity events" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = bulkCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { events } = parsed.data;

    const created = await prisma.activityEvent.createMany({
      data: events.map((event) => ({
        userId: session.user.id,
        organizationId: session.user.organizationId,
        eventType: event.eventType,
        appName: event.appName,
        windowTitle: event.windowTitle,
        url: event.url,
        domain: event.domain,
        category: event.category,
        durationSeconds: event.durationSeconds,
        metadata: event.metadata ? (event.metadata as Record<string, string>) : undefined,
        timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
      })),
    });

    return NextResponse.json(
      { created: created.count },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error ingesting activity events:", error);
    return NextResponse.json(
      { error: "Failed to ingest activity events" },
      { status: 500 }
    );
  }
}
