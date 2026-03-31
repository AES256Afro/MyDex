import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { sendIntegrationMessage } from "@/lib/integrations";
import { notifyAdmins } from "@/lib/notifications";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// ── Industry-standard SLA response/resolution times (in minutes) ──
// Based on ITIL/HDI best practices for internal IT support
const SLA_TARGETS: Record<string, { responseMinutes: number; resolutionMinutes: number }> = {
  URGENT: { responseMinutes: 15, resolutionMinutes: 240 },      // 15min / 4hr
  HIGH:   { responseMinutes: 60, resolutionMinutes: 480 },      // 1hr / 8hr
  MEDIUM: { responseMinutes: 240, resolutionMinutes: 1440 },    // 4hr / 24hr
  LOW:    { responseMinutes: 480, resolutionMinutes: 2880 },     // 8hr / 48hr
};

function calculateSlaDue(createdAt: Date, minutes: number): Date {
  return new Date(createdAt.getTime() + minutes * 60000);
}

const createTicketSchema = z.object({
  subject: z.string().min(1).max(200),
  category: z.string(),
  reason: z.string().optional(),
  appName: z.string().optional(),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  deviceId: z.string().optional(),
  deviceInfo: z.any().optional(),
  networkInfo: z.any().optional(),
  assignedTo: z.string().optional(),
});

// GET - list tickets + optional metrics mode
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = session.user.organizationId;
  const isAdmin = hasPermission(session.user.role, "employees:read");
  const status = request.nextUrl.searchParams.get("status");
  const mine = request.nextUrl.searchParams.get("mine");
  const metrics = request.nextUrl.searchParams.get("metrics");

  // ── Metrics mode: return IT staff performance data ──
  if (metrics === "true" && isAdmin) {
    try {
      const allTickets = await prisma.supportTicket.findMany({
        where: { organizationId: orgId },
        select: {
          id: true, status: true, priority: true,
          createdAt: true, resolvedAt: true, closedAt: true,
          firstResponseAt: true,
          slaResponseDue: true, slaResolutionDue: true,
          slaResponseBreached: true, slaResolutionBreached: true,
          satisfactionRating: true,
          assignedTo: true,
          assignee: { select: { id: true, name: true, email: true, image: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      // Aggregate per-agent metrics
      const agentMap = new Map<string, {
        id: string; name: string; email: string; image: string | null;
        totalAssigned: number; resolved: number; closed: number;
        avgResponseMinutes: number; avgResolutionMinutes: number;
        responseTimes: number[]; resolutionTimes: number[];
        ratings: number[]; slaBreaches: number;
      }>();

      for (const t of allTickets) {
        if (!t.assignedTo || !t.assignee) continue;
        if (!agentMap.has(t.assignedTo)) {
          agentMap.set(t.assignedTo, {
            id: t.assignee.id, name: t.assignee.name, email: t.assignee.email,
            image: t.assignee.image, totalAssigned: 0, resolved: 0, closed: 0,
            avgResponseMinutes: 0, avgResolutionMinutes: 0,
            responseTimes: [], resolutionTimes: [], ratings: [], slaBreaches: 0,
          });
        }
        const agent = agentMap.get(t.assignedTo)!;
        agent.totalAssigned++;
        if (t.status === "RESOLVED" || t.status === "CLOSED") agent.resolved++;
        if (t.status === "CLOSED") agent.closed++;
        if (t.firstResponseAt) {
          agent.responseTimes.push((t.firstResponseAt.getTime() - t.createdAt.getTime()) / 60000);
        }
        if (t.resolvedAt) {
          agent.resolutionTimes.push((t.resolvedAt.getTime() - t.createdAt.getTime()) / 60000);
        }
        if (t.satisfactionRating) agent.ratings.push(t.satisfactionRating);
        if (t.slaResponseBreached || t.slaResolutionBreached) agent.slaBreaches++;
      }

      const agentMetrics = Array.from(agentMap.values()).map(a => ({
        id: a.id, name: a.name, email: a.email, image: a.image,
        totalAssigned: a.totalAssigned,
        resolved: a.resolved,
        closed: a.closed,
        avgResponseMinutes: a.responseTimes.length > 0
          ? Math.round(a.responseTimes.reduce((s, v) => s + v, 0) / a.responseTimes.length)
          : null,
        avgResolutionMinutes: a.resolutionTimes.length > 0
          ? Math.round(a.resolutionTimes.reduce((s, v) => s + v, 0) / a.resolutionTimes.length)
          : null,
        avgSatisfaction: a.ratings.length > 0
          ? Math.round((a.ratings.reduce((s, v) => s + v, 0) / a.ratings.length) * 10) / 10
          : null,
        totalRatings: a.ratings.length,
        slaBreaches: a.slaBreaches,
        resolutionRate: a.totalAssigned > 0
          ? Math.round((a.resolved / a.totalAssigned) * 100)
          : 0,
      }));

      // Overall org metrics
      const totalTickets = allTickets.length;
      const resolvedTickets = allTickets.filter(t => t.status === "RESOLVED" || t.status === "CLOSED").length;
      const activeTickets = allTickets.filter(t => ["OPEN", "IN_PROGRESS", "WAITING_ON_USER", "WAITING_ON_IT"].includes(t.status)).length;
      const breachedTickets = allTickets.filter(t => t.slaResponseBreached || t.slaResolutionBreached).length;
      const allRatings = allTickets.filter(t => t.satisfactionRating).map(t => t.satisfactionRating!);
      const avgSatisfaction = allRatings.length > 0
        ? Math.round((allRatings.reduce((s, v) => s + v, 0) / allRatings.length) * 10) / 10
        : null;

      // Overdue tickets (SLA breached but not yet resolved)
      const now = new Date();
      const overdueResponse = allTickets.filter(t =>
        !t.firstResponseAt && t.slaResponseDue && new Date(t.slaResponseDue) < now &&
        ["OPEN", "IN_PROGRESS"].includes(t.status)
      ).length;
      const overdueResolution = allTickets.filter(t =>
        !t.resolvedAt && t.slaResolutionDue && new Date(t.slaResolutionDue) < now &&
        ["OPEN", "IN_PROGRESS", "WAITING_ON_USER", "WAITING_ON_IT"].includes(t.status)
      ).length;

      return NextResponse.json({
        metrics: {
          totalTickets, resolvedTickets, activeTickets, breachedTickets,
          avgSatisfaction, totalRatings: allRatings.length,
          overdueResponse, overdueResolution,
          slaTargets: SLA_TARGETS,
        },
        agentMetrics,
      });
    } catch (error) {
      console.error("Error fetching metrics:", error);
      return NextResponse.json({ error: "Failed to fetch metrics" }, { status: 500 });
    }
  }

  // ── Standard ticket list ──
  const where: Record<string, unknown> = { organizationId: orgId };

  if (!isAdmin || mine === "true") {
    where.submittedBy = session.user.id;
  }

  if (status) {
    if (status === "active") {
      where.status = { in: ["OPEN", "IN_PROGRESS", "WAITING_ON_USER", "WAITING_ON_IT"] };
    } else {
      where.status = status;
    }
  }

  try {
    const tickets = await prisma.supportTicket.findMany({
      where,
      include: {
        submitter: { select: { id: true, name: true, email: true, image: true } },
        assignee: { select: { id: true, name: true, email: true } },
        device: { select: { id: true, hostname: true, platform: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { user: { select: { name: true } } },
        },
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ tickets });
  } catch (error) {
    console.error("Error fetching tickets:", error);
    return NextResponse.json({ error: "Failed to fetch tickets" }, { status: 500 });
  }
}

// POST - create a new ticket (with SLA deadlines)
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = createTicketSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const priority = parsed.data.priority || "MEDIUM";
    const now = new Date();
    const sla = SLA_TARGETS[priority];

    const ticket = await prisma.supportTicket.create({
      data: {
        organizationId: session.user.organizationId,
        submittedBy: session.user.id,
        subject: parsed.data.subject,
        category: parsed.data.category,
        reason: parsed.data.reason,
        appName: parsed.data.appName,
        description: parsed.data.description,
        priority,
        deviceId: parsed.data.deviceId,
        deviceInfo: parsed.data.deviceInfo || null,
        networkInfo: parsed.data.networkInfo || null,
        assignedTo: parsed.data.assignedTo || null,
        slaResponseDue: calculateSlaDue(now, sla.responseMinutes),
        slaResolutionDue: calculateSlaDue(now, sla.resolutionMinutes),
      },
      include: {
        submitter: { select: { id: true, name: true, email: true } },
        device: { select: { id: true, hostname: true, platform: true } },
      },
    });

    // Send Slack/Teams notification for new ticket
    sendIntegrationMessage(session.user.organizationId, {
      title: "🎫 New Support Ticket",
      message: `*${parsed.data.subject}*\n${(parsed.data.description || "").slice(0, 200)}`,
      color: priority === "URGENT" ? "#EF4444" : priority === "HIGH" ? "#F59E0B" : "#3B82F6",
      link: `${process.env.NEXTAUTH_URL || "https://mydexnow.com"}/it-support?ticket=${ticket.id}`,
      fields: [
        { label: "Priority", value: priority },
        { label: "Category", value: parsed.data.category || "General" },
        { label: "Submitted By", value: session.user.name || session.user.email || "Unknown" },
      ],
    }).catch(() => {});

    // Notify admins in-app
    notifyAdmins({
      organizationId: session.user.organizationId,
      type: "TICKET_UPDATE",
      title: "New Support Ticket",
      message: `${session.user.name} submitted: ${parsed.data.subject}`,
      link: `/it-support?ticket=${ticket.id}`,
    }).catch(() => {});

    return NextResponse.json(ticket, { status: 201 });
  } catch (error) {
    console.error("Error creating ticket:", error);
    return NextResponse.json({ error: "Failed to create ticket" }, { status: 500 });
  }
}

// PATCH - update ticket (status, assignment, priority, satisfaction rating)
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { id, status, assignedTo, priority, satisfactionRating, satisfactionComment, confirmResolved } = body;

    if (!id) return NextResponse.json({ error: "Ticket ID required" }, { status: 400 });

    const existing = await prisma.supportTicket.findFirst({
      where: { id, organizationId: session.user.organizationId },
    });
    if (!existing) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    const isAdmin = hasPermission(session.user.role, "employees:read");
    if (!isAdmin && existing.submittedBy !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data: Record<string, unknown> = {};

    // Status changes
    if (status) {
      data.status = status;
      if (status === "RESOLVED") data.resolvedAt = new Date();
      if (status === "CLOSED") data.closedAt = new Date();

      // Check SLA breaches on resolution
      if (status === "RESOLVED" || status === "CLOSED") {
        const now = new Date();
        if (existing.slaResolutionDue && now > existing.slaResolutionDue) {
          data.slaResolutionBreached = true;
        }
      }
    }

    // User confirms resolution
    if (confirmResolved && existing.submittedBy === session.user.id) {
      data.status = "CLOSED";
      data.closedAt = new Date();
    }

    // Satisfaction rating (only ticket submitter can rate)
    if (satisfactionRating && existing.submittedBy === session.user.id) {
      const rating = Math.min(5, Math.max(1, Math.round(satisfactionRating)));
      data.satisfactionRating = rating;
      data.satisfactionComment = satisfactionComment || null;
      data.ratedAt = new Date();
      // Auto-close after rating
      if (!data.status) {
        data.status = "CLOSED";
        data.closedAt = new Date();
      }
    }

    if (assignedTo !== undefined && isAdmin) data.assignedTo = assignedTo || null;

    // Priority change recalculates SLA
    if (priority && isAdmin) {
      data.priority = priority;
      const sla = SLA_TARGETS[priority];
      if (sla) {
        data.slaResponseDue = calculateSlaDue(existing.createdAt, sla.responseMinutes);
        data.slaResolutionDue = calculateSlaDue(existing.createdAt, sla.resolutionMinutes);
      }
    }

    const ticket = await prisma.supportTicket.update({
      where: { id },
      data,
      include: {
        submitter: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(ticket);
  } catch (error) {
    console.error("Error updating ticket:", error);
    return NextResponse.json({ error: "Failed to update ticket" }, { status: 500 });
  }
}
