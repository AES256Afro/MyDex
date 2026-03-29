import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Role } from "@/generated/prisma";

const EMISSION_FACTOR = 0.42; // kg CO2 per kWh (US average)

const energySchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2050),
  kwhUsed: z.number().min(0),
  costDollars: z.number().min(0).optional(),
  source: z.enum(["utility_bill", "smart_meter", "estimate"]).optional(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role as Role, "settings:read"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year");

  try {
    const where: Record<string, unknown> = { organizationId: session.user.organizationId };
    if (year) where.year = parseInt(year);

    const readings = await prisma.energyReading.findMany({
      where,
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });
    return NextResponse.json({ readings });
  } catch (error) {
    console.error("Error fetching energy readings:", error);
    return NextResponse.json({ error: "Failed to fetch energy readings" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role as Role, "settings:write"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await request.json();
    const parsed = energySchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 400 });

    const carbonKg = parsed.data.kwhUsed * EMISSION_FACTOR;

    const reading = await prisma.energyReading.upsert({
      where: {
        organizationId_month_year: {
          organizationId: session.user.organizationId,
          month: parsed.data.month,
          year: parsed.data.year,
        },
      },
      update: {
        kwhUsed: parsed.data.kwhUsed,
        costDollars: parsed.data.costDollars,
        source: parsed.data.source ?? "estimate",
        carbonKg,
        notes: parsed.data.notes,
      },
      create: {
        organizationId: session.user.organizationId,
        month: parsed.data.month,
        year: parsed.data.year,
        kwhUsed: parsed.data.kwhUsed,
        costDollars: parsed.data.costDollars,
        source: parsed.data.source ?? "estimate",
        carbonKg,
        notes: parsed.data.notes,
      },
    });
    return NextResponse.json({ reading }, { status: 201 });
  } catch (error) {
    console.error("Error saving energy reading:", error);
    return NextResponse.json({ error: "Failed to save energy reading" }, { status: 500 });
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

    const existing = await prisma.energyReading.findFirst({
      where: { id, organizationId: session.user.organizationId },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.energyReading.delete({ where: { id } });
    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    console.error("Error deleting energy reading:", error);
    return NextResponse.json({ error: "Failed to delete energy reading" }, { status: 500 });
  }
}
