import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const ONBOARDING_TEMPLATES = [
  { category: "IT Setup", title: "Create user accounts (email, SSO)", sortOrder: 0 },
  { category: "IT Setup", title: "Provision laptop/workstation", sortOrder: 1 },
  { category: "IT Setup", title: "Install required software & monitoring agent", sortOrder: 2 },
  { category: "IT Setup", title: "Configure VPN and network access", sortOrder: 3 },
  { category: "Access", title: "Grant access to project management tools", sortOrder: 4 },
  { category: "Access", title: "Add to relevant shared drives and folders", sortOrder: 5 },
  { category: "Access", title: "Set up Slack/Teams channels", sortOrder: 6 },
  { category: "HR", title: "Complete employment paperwork", sortOrder: 7 },
  { category: "HR", title: "Add to payroll system", sortOrder: 8 },
  { category: "HR", title: "Schedule orientation meeting", sortOrder: 9 },
  { category: "Training", title: "Security awareness training", sortOrder: 10 },
  { category: "Training", title: "Company policy review", sortOrder: 11 },
  { category: "Training", title: "Role-specific training", sortOrder: 12 },
];

const OFFBOARDING_TEMPLATES = [
  { category: "Access", title: "Revoke SSO and email access", sortOrder: 0 },
  { category: "Access", title: "Remove from all shared drives and folders", sortOrder: 1 },
  { category: "Access", title: "Revoke VPN and network access", sortOrder: 2 },
  { category: "Access", title: "Remove from Slack/Teams channels", sortOrder: 3 },
  { category: "IT", title: "Collect laptop/workstation", sortOrder: 4 },
  { category: "IT", title: "Wipe device and remove monitoring agent", sortOrder: 5 },
  { category: "IT", title: "Transfer file ownership", sortOrder: 6 },
  { category: "IT", title: "Forward email to manager (if needed)", sortOrder: 7 },
  { category: "HR", title: "Process final payroll", sortOrder: 8 },
  { category: "HR", title: "Conduct exit interview", sortOrder: 9 },
  { category: "HR", title: "Remove from benefits/insurance", sortOrder: 10 },
  { category: "Security", title: "Review audit logs for data exfiltration", sortOrder: 11 },
  { category: "Security", title: "Rotate any shared credentials", sortOrder: 12 },
];

const createTaskSchema = z.object({
  type: z.enum(["ONBOARDING", "OFFBOARDING"]),
  category: z.string().min(1).max(100),
  title: z.string().min(1).max(300),
  description: z.string().max(1000).optional(),
  dueDate: z.string().optional(),
});

const updateTaskSchema = z.object({
  completed: z.boolean().optional(),
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(1000).optional(),
  dueDate: z.string().nullable().optional(),
});

// GET - list boarding tasks for an employee
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "employees:read"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const tasks = await prisma.boardingTask.findMany({
    where: { userId: id, organizationId: session.user.organizationId },
    orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    include: { completedBy: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ tasks });
}

// POST - create boarding task(s) or initialize from template
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "employees:write"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const orgId = session.user.organizationId;

  // Verify the employee belongs to this org
  const employee = await prisma.user.findFirst({
    where: { id, organizationId: orgId },
    select: { id: true },
  });
  if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  const body = await request.json();

  // If body has `initTemplate`, create from template
  if (body.initTemplate) {
    const type = body.type as "ONBOARDING" | "OFFBOARDING";
    const templates = type === "OFFBOARDING" ? OFFBOARDING_TEMPLATES : ONBOARDING_TEMPLATES;

    // Check if tasks already exist for this type
    const existing = await prisma.boardingTask.count({
      where: { userId: id, organizationId: orgId, type },
    });
    if (existing > 0) {
      return NextResponse.json({ error: "Tasks already exist for this type" }, { status: 409 });
    }

    const tasks = await prisma.boardingTask.createManyAndReturn({
      data: templates.map((t) => ({
        organizationId: orgId,
        userId: id,
        type,
        category: t.category,
        title: t.title,
        sortOrder: t.sortOrder,
      })),
    });

    return NextResponse.json({ tasks }, { status: 201 });
  }

  // Single task creation
  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 400 });
  }

  const task = await prisma.boardingTask.create({
    data: {
      organizationId: orgId,
      userId: id,
      type: parsed.data.type,
      category: parsed.data.category,
      title: parsed.data.title,
      description: parsed.data.description,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
    },
  });

  return NextResponse.json({ task }, { status: 201 });
}

// PATCH - update a boarding task (toggle completion, edit)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "employees:write"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const taskId = body.taskId as string;
  if (!taskId) return NextResponse.json({ error: "taskId required" }, { status: 400 });

  const parsed = updateTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 400 });
  }

  const task = await prisma.boardingTask.findFirst({
    where: { id: taskId, organizationId: session.user.organizationId },
  });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  const updateData: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
  if (parsed.data.dueDate !== undefined) updateData.dueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate) : null;
  if (parsed.data.completed !== undefined) {
    updateData.completed = parsed.data.completed;
    updateData.completedAt = parsed.data.completed ? new Date() : null;
    updateData.completedById = parsed.data.completed ? session.user.id : null;
  }

  const updated = await prisma.boardingTask.update({
    where: { id: taskId },
    data: updateData,
    include: { completedBy: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ task: updated });
}

// DELETE - delete a boarding task or all tasks of a type
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "employees:write"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get("taskId");
  const type = searchParams.get("type") as "ONBOARDING" | "OFFBOARDING" | null;

  if (taskId) {
    await prisma.boardingTask.deleteMany({
      where: { id: taskId, organizationId: session.user.organizationId },
    });
  } else if (type) {
    await prisma.boardingTask.deleteMany({
      where: { userId: id, organizationId: session.user.organizationId, type },
    });
  } else {
    return NextResponse.json({ error: "taskId or type required" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
