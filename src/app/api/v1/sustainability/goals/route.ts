import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Role } from "@/generated/prisma";

const goalSchema = z.object({
  metric: z.enum(["energy_reduction", "carbon_reduction", "sleep_compliance", "green_score"]),
  targetValue: z.number().min(0),
  currentValue: z.number().min(0).optional(),
  unit: z.string().max(20),
  deadline: z.string().optional(),
  status: z.enum(["active", "achieved", "missed"]).optional(),
  notes: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role as Role, "settings:read"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const goals = await prisma.sustainabilityGoal.findMany({
      where: { organizationId: session.user.organizationId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ goals });
  } catch (error) {
    console.error("Error fetching goals:", error);
    return NextResponse.json({ error: "Failed to fetch goals" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role as Role, "settings:write"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await request.json();
    const parsed = goalSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 400 });

    const goal = await prisma.sustainabilityGoal.create({
      data: {
        organizationId: session.user.organizationId,
        metric: parsed.data.metric,
        targetValue: parsed.data.targetValue,
        currentValue: parsed.data.currentValue ?? 0,
        unit: parsed.data.unit,
        deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : null,
        status: parsed.data.status ?? "active",
        notes: parsed.data.notes,
      },
    });
    return NextResponse.json({ goal }, { status: 201 });
  } catch (error) {
    console.error("Error creating goal:", error);
    return NextResponse.json({ error: "Failed to create goal" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role as Role, "settings:write"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await request.json();
    const { id, ...rest } = body;
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const existing = await prisma.sustainabilityGoal.findFirst({
      where: { id, organizationId: session.user.organizationId },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const parsed = goalSchema.partial().safeParse(rest);
    if (!parsed.success)
      return NextResponse.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 400 });

    const data: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.deadline) data.deadline = new Date(parsed.data.deadline);

    const goal = await prisma.sustainabilityGoal.update({ where: { id }, data });
    return NextResponse.json({ goal });
  } catch (error) {
    console.error("Error updating goal:", error);
    return NextResponse.json({ error: "Failed to update goal" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role as Role, "settings:write"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const existing = await prisma.sustainabilityGoal.findFirst({
      where: { id, organizationId: session.user.organizationId },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.sustainabilityGoal.delete({ where: { id } });
    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    console.error("Error deleting goal:", error);
    return NextResponse.json({ error: "Failed to delete goal" }, { status: 500 });
  }
}
