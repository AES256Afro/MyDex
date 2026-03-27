import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { addToAllowlist } from "@/lib/allowlist";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";

const createEmployeeSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(200),
  password: z.string().min(8).max(128),
  role: z.enum(["EMPLOYEE", "MANAGER", "ADMIN"]).default("EMPLOYEE"),
  department: z.string().max(100).optional(),
  jobTitle: z.string().max(100).optional(),
  managerId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user.role, "employees:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgId = session.user.organizationId;

  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const department = searchParams.get("department");
    const role = searchParams.get("role");

    const where: Record<string, unknown> = {
      organizationId: orgId,
    };

    if (status && ["ACTIVE", "INACTIVE", "SUSPENDED"].includes(status)) {
      where.status = status;
    }
    if (department) {
      where.department = department;
    }
    if (role && ["SUPER_ADMIN", "ADMIN", "MANAGER", "EMPLOYEE"].includes(role)) {
      where.role = role;
    }

    const employees = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        status: true,
        department: true,
        jobTitle: true,
        managerId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ employees });
  } catch (error) {
    console.error("Error fetching employees:", error);
    return NextResponse.json(
      { error: "Failed to fetch employees" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user.role, "employees:invite")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgId = session.user.organizationId;

  try {
    const body = await request.json();
    const parsed = createEmployeeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email, name, password, role, department, jobTitle, managerId } =
      parsed.data;

    // Check if email is already taken
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    // Validate managerId belongs to same org if provided
    if (managerId) {
      const manager = await prisma.user.findFirst({
        where: { id: managerId, organizationId: orgId },
      });
      if (!manager) {
        return NextResponse.json(
          { error: "Manager not found in organization" },
          { status: 400 }
        );
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Auto-add invited email to the org's allowlist
    await addToAllowlist(orgId, email);

    const employee = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role,
        department,
        jobTitle,
        managerId,
        organizationId: orgId,
        status: "ACTIVE",
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        department: true,
        jobTitle: true,
        managerId: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ employee }, { status: 201 });
  } catch (error) {
    console.error("Error creating employee:", error);
    return NextResponse.json(
      { error: "Failed to create employee" },
      { status: 500 }
    );
  }
}
