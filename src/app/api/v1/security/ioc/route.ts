import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createIocSchema = z.object({
  hashType: z.enum(["MD5", "SHA1", "SHA256"]),
  hashValue: z.string().min(1),
  source: z.string().default("manual"),
  threatName: z.string().optional(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  description: z.string().optional(),
  isBlocked: z.boolean().default(false),
});

const bulkLookupSchema = z.object({
  hashes: z.array(z.object({
    hashType: z.enum(["MD5", "SHA1", "SHA256"]),
    hashValue: z.string(),
  })).min(1).max(500),
  hostname: z.string().optional(),
  userId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "security:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgId = session.user.organizationId;
  const searchParams = request.nextUrl.searchParams;
  const severity = searchParams.get("severity");
  const blocked = searchParams.get("blocked");
  const search = searchParams.get("search");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
  const offset = parseInt(searchParams.get("offset") || "0");

  const where: Record<string, unknown> = { organizationId: orgId };
  if (severity) where.severity = severity;
  if (blocked === "true") where.isBlocked = true;
  if (blocked === "false") where.isBlocked = false;
  if (search) {
    where.OR = [
      { hashValue: { contains: search, mode: "insensitive" } },
      { threatName: { contains: search, mode: "insensitive" } },
    ];
  }

  try {
    const [entries, total] = await Promise.all([
      prisma.iocEntry.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: { _count: { select: { matches: true } } },
      }),
      prisma.iocEntry.count({ where }),
    ]);

    return NextResponse.json({ entries, pagination: { total, limit, offset, hasMore: offset + limit < total } });
  } catch (error) {
    console.error("Error fetching IOC entries:", error);
    return NextResponse.json({ error: "Failed to fetch IOC entries" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "security:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = createIocSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const entry = await prisma.iocEntry.create({
      data: {
        organizationId: session.user.organizationId,
        ...parsed.data,
        hashValue: parsed.data.hashValue.toLowerCase(),
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "This hash already exists in your IOC database" }, { status: 409 });
    }
    console.error("Error creating IOC entry:", error);
    return NextResponse.json({ error: "Failed to create IOC entry" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "security:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  try {
    await prisma.iocEntry.delete({
      where: { id, organizationId: session.user.organizationId },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete IOC entry" }, { status: 500 });
  }
}
