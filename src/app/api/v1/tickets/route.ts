import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

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
});

// GET - list tickets
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = session.user.organizationId;
  const isAdmin = hasPermission(session.user.role, "employees:read");
  const status = request.nextUrl.searchParams.get("status");
  const mine = request.nextUrl.searchParams.get("mine");

  const where: Record<string, unknown> = { organizationId: orgId };

  // Non-admins can only see their own tickets
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

// POST - create a new ticket
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = createTicketSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        organizationId: session.user.organizationId,
        submittedBy: session.user.id,
        subject: parsed.data.subject,
        category: parsed.data.category,
        reason: parsed.data.reason,
        appName: parsed.data.appName,
        description: parsed.data.description,
        priority: parsed.data.priority || "MEDIUM",
        deviceId: parsed.data.deviceId,
        deviceInfo: parsed.data.deviceInfo || null,
        networkInfo: parsed.data.networkInfo || null,
      },
      include: {
        submitter: { select: { id: true, name: true, email: true } },
        device: { select: { id: true, hostname: true, platform: true } },
      },
    });

    return NextResponse.json(ticket, { status: 201 });
  } catch (error) {
    console.error("Error creating ticket:", error);
    return NextResponse.json({ error: "Failed to create ticket" }, { status: 500 });
  }
}

// PATCH - update ticket (status, assignment, priority)
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { id, status, assignedTo, priority } = body;

    if (!id) return NextResponse.json({ error: "Ticket ID required" }, { status: 400 });

    // Verify ticket belongs to org
    const existing = await prisma.supportTicket.findFirst({
      where: { id, organizationId: session.user.organizationId },
    });
    if (!existing) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    // Non-admins can only update their own tickets and only certain fields
    const isAdmin = hasPermission(session.user.role, "employees:read");
    if (!isAdmin && existing.submittedBy !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data: Record<string, unknown> = {};
    if (status) {
      data.status = status;
      if (status === "RESOLVED") data.resolvedAt = new Date();
      if (status === "CLOSED") data.closedAt = new Date();
    }
    if (assignedTo !== undefined && isAdmin) data.assignedTo = assignedTo || null;
    if (priority && isAdmin) data.priority = priority;

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
