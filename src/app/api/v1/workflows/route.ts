import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasMinRole } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma";

const conditionSchema = z.object({
  field: z.string().min(1),
  operator: z.enum(["equals", "not_equals", "contains", "greater_than", "less_than", "in"]),
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
});

const actionSchema = z.object({
  type: z.enum(["send_notification", "send_channel_message", "create_ticket", "assign_ticket", "send_email"]),
  config: z.record(z.string(), z.string()),
});

const VALID_TRIGGERS = [
  "device_offline",
  "security_alert",
  "ticket_created",
  "compliance_drop",
  "clock_missed",
  "leave_approved",
] as const;

const createWorkflowSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  trigger: z.enum(VALID_TRIGGERS),
  conditions: z.array(conditionSchema).default([]),
  actions: z.array(actionSchema).min(1, "At least one action is required"),
  isActive: z.boolean().default(true),
});

const updateWorkflowSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional().nullable(),
  trigger: z.enum(VALID_TRIGGERS).optional(),
  conditions: z.array(conditionSchema).optional(),
  actions: z.array(actionSchema).min(1).optional(),
  isActive: z.boolean().optional(),
});

// GET - list workflows for organization
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasMinRole(session.user.role, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgId = session.user.organizationId;

  try {
    const workflows = await prisma.workflow.findMany({
      where: { organizationId: orgId },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        _count: { select: { logs: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ workflows });
  } catch (error) {
    console.error("Error fetching workflows:", error);
    return NextResponse.json({ error: "Failed to fetch workflows" }, { status: 500 });
  }
}

// POST - create a new workflow
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasMinRole(session.user.role, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = createWorkflowSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const workflow = await prisma.workflow.create({
      data: {
        organizationId: session.user.organizationId,
        createdBy: session.user.id,
        name: parsed.data.name,
        description: parsed.data.description,
        trigger: parsed.data.trigger,
        conditions: parsed.data.conditions as unknown as Prisma.InputJsonValue,
        actions: parsed.data.actions as unknown as Prisma.InputJsonValue,
        isActive: parsed.data.isActive,
      },
      include: {
        creator: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(workflow, { status: 201 });
  } catch (error) {
    console.error("Error creating workflow:", error);
    return NextResponse.json({ error: "Failed to create workflow" }, { status: 500 });
  }
}

// PATCH - update a workflow
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasMinRole(session.user.role, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = updateWorkflowSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await prisma.workflow.findFirst({
      where: { id: parsed.data.id, organizationId: session.user.organizationId },
    });
    if (!existing) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });

    const data: Prisma.WorkflowUpdateInput = {};
    if (parsed.data.name !== undefined) data.name = parsed.data.name;
    if (parsed.data.description !== undefined) data.description = parsed.data.description;
    if (parsed.data.trigger !== undefined) data.trigger = parsed.data.trigger;
    if (parsed.data.conditions !== undefined) data.conditions = parsed.data.conditions as unknown as Prisma.InputJsonValue;
    if (parsed.data.actions !== undefined) data.actions = parsed.data.actions as unknown as Prisma.InputJsonValue;
    if (parsed.data.isActive !== undefined) data.isActive = parsed.data.isActive;

    const workflow = await prisma.workflow.update({
      where: { id: parsed.data.id },
      data,
      include: {
        creator: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(workflow);
  } catch (error) {
    console.error("Error updating workflow:", error);
    return NextResponse.json({ error: "Failed to update workflow" }, { status: 500 });
  }
}

// DELETE - delete a workflow
export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasMinRole(session.user.role, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = request.nextUrl;
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Workflow ID required" }, { status: 400 });

    const existing = await prisma.workflow.findFirst({
      where: { id, organizationId: session.user.organizationId },
    });
    if (!existing) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });

    await prisma.workflow.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting workflow:", error);
    return NextResponse.json({ error: "Failed to delete workflow" }, { status: 500 });
  }
}
