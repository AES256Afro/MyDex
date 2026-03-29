import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Role } from "@/generated/prisma";

const budgetSchema = z.object({
  category: z.enum(["software", "hardware", "services", "personnel", "infrastructure", "other"]),
  description: z.string().min(1).max(500),
  amount: z.number().min(0),
  type: z.enum(["actual", "forecast", "budget"]),
  period: z.string().min(4).max(10), // "2026-01", "2026-Q1", "2026"
  isRecurring: z.boolean().optional(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role as Role, "settings:read"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period");

  try {
    const where: Record<string, unknown> = { organizationId: session.user.organizationId };
    if (period) where.period = period;

    const entries = await prisma.itBudgetEntry.findMany({
      where,
      orderBy: [{ period: "desc" }, { category: "asc" }],
    });
    return NextResponse.json({ entries });
  } catch (error) {
    console.error("Error fetching budget entries:", error);
    return NextResponse.json({ error: "Failed to fetch budget entries" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role as Role, "settings:write"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await request.json();
    const parsed = budgetSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 400 });

    const entry = await prisma.itBudgetEntry.create({
      data: {
        organizationId: session.user.organizationId,
        ...parsed.data,
        isRecurring: parsed.data.isRecurring ?? false,
      },
    });
    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    console.error("Error creating budget entry:", error);
    return NextResponse.json({ error: "Failed to create budget entry" }, { status: 500 });
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

    const existing = await prisma.itBudgetEntry.findFirst({
      where: { id, organizationId: session.user.organizationId },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.itBudgetEntry.delete({ where: { id } });
    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    console.error("Error deleting budget entry:", error);
    return NextResponse.json({ error: "Failed to delete budget entry" }, { status: 500 });
  }
}
