import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createMessageSchema = z.object({
  message: z.string().min(1).max(5000),
  isInternal: z.boolean().optional(),
});

// GET - list messages for a ticket
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: ticketId } = await params;
  const isAdmin = hasPermission(session.user.role, "employees:read");

  // Verify ticket belongs to org and user has access
  const ticket = await prisma.supportTicket.findFirst({
    where: {
      id: ticketId,
      organizationId: session.user.organizationId,
      ...(!isAdmin ? { submittedBy: session.user.id } : {}),
    },
  });

  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  const messages = await prisma.ticketMessage.findMany({
    where: {
      ticketId,
      // Non-admins can't see internal notes
      ...(!isAdmin ? { isInternal: false } : {}),
    },
    include: {
      user: { select: { id: true, name: true, email: true, image: true, role: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ messages, ticket });
}

// POST - add a message to a ticket
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: ticketId } = await params;
  const isAdmin = hasPermission(session.user.role, "employees:read");

  // Verify ticket belongs to org and user has access
  const ticket = await prisma.supportTicket.findFirst({
    where: {
      id: ticketId,
      organizationId: session.user.organizationId,
      ...(!isAdmin ? { submittedBy: session.user.id } : {}),
    },
  });

  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  try {
    const body = await request.json();
    const parsed = createMessageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    // Only admins can create internal notes
    const isInternal = isAdmin ? (parsed.data.isInternal || false) : false;

    const message = await prisma.ticketMessage.create({
      data: {
        ticketId,
        userId: session.user.id,
        message: parsed.data.message,
        isInternal,
      },
      include: {
        user: { select: { id: true, name: true, email: true, image: true, role: true } },
      },
    });

    // Auto-update ticket status based on who replied
    const isSubmitter = ticket.submittedBy === session.user.id;
    const newStatus = isSubmitter ? "WAITING_ON_IT" : "IN_PROGRESS";

    const ticketUpdate: Record<string, unknown> = {};

    // Track first response time (when IT first replies, not internal notes)
    if (!isSubmitter && !isInternal && !ticket.firstResponseAt) {
      ticketUpdate.firstResponseAt = new Date();
      // Check if SLA response was breached
      if (ticket.slaResponseDue && new Date() > ticket.slaResponseDue) {
        ticketUpdate.slaResponseBreached = true;
      }
    }

    // Only update status if currently in a waiting state or open
    if (["OPEN", "WAITING_ON_USER", "WAITING_ON_IT"].includes(ticket.status)) {
      ticketUpdate.status = newStatus;
    }

    if (Object.keys(ticketUpdate).length > 0) {
      await prisma.supportTicket.update({
        where: { id: ticketId },
        data: ticketUpdate,
      });
    }

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error("Error creating message:", error);
    return NextResponse.json({ error: "Failed to create message" }, { status: 500 });
  }
}
