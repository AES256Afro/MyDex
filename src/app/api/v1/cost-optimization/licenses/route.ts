import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Role } from "@/generated/prisma";

const licenseSchema = z.object({
  application: z.string().min(1).max(200),
  vendor: z.string().max(200).optional(),
  totalSeats: z.number().int().min(1),
  usedSeats: z.number().int().min(0),
  costPerSeat: z.number().min(0),
  billingCycle: z.enum(["monthly", "annual"]).optional(),
  renewalDate: z.string().optional(), // ISO date
  category: z.string().max(50).optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role as Role, "settings:read"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const licenses = await prisma.softwareLicense.findMany({
      where: { organizationId: session.user.organizationId },
      orderBy: { application: "asc" },
    });
    return NextResponse.json({ licenses });
  } catch (error) {
    console.error("Error fetching licenses:", error);
    return NextResponse.json({ error: "Failed to fetch licenses" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role as Role, "settings:write"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await request.json();
    const parsed = licenseSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 400 });

    const license = await prisma.softwareLicense.create({
      data: {
        organizationId: session.user.organizationId,
        application: parsed.data.application,
        vendor: parsed.data.vendor,
        totalSeats: parsed.data.totalSeats,
        usedSeats: parsed.data.usedSeats,
        costPerSeat: parsed.data.costPerSeat,
        billingCycle: parsed.data.billingCycle ?? "monthly",
        renewalDate: parsed.data.renewalDate ? new Date(parsed.data.renewalDate) : null,
        category: parsed.data.category,
        notes: parsed.data.notes,
        isActive: parsed.data.isActive ?? true,
      },
    });
    return NextResponse.json({ license }, { status: 201 });
  } catch (error) {
    console.error("Error creating license:", error);
    return NextResponse.json({ error: "Failed to create license" }, { status: 500 });
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

    const existing = await prisma.softwareLicense.findFirst({
      where: { id, organizationId: session.user.organizationId },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const parsed = licenseSchema.partial().safeParse(rest);
    if (!parsed.success)
      return NextResponse.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 400 });

    const data: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.renewalDate) data.renewalDate = new Date(parsed.data.renewalDate);

    const license = await prisma.softwareLicense.update({ where: { id }, data });
    return NextResponse.json({ license });
  } catch (error) {
    console.error("Error updating license:", error);
    return NextResponse.json({ error: "Failed to update license" }, { status: 500 });
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

    const existing = await prisma.softwareLicense.findFirst({
      where: { id, organizationId: session.user.organizationId },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.softwareLicense.delete({ where: { id } });
    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    console.error("Error deleting license:", error);
    return NextResponse.json({ error: "Failed to delete license" }, { status: 500 });
  }
}
