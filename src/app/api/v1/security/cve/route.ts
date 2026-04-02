import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createCveSchema = z.object({
  cveId: z.string().regex(/^CVE-\d{4}-\d{4,}$/, "Invalid CVE ID format"),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  cvssScore: z.number().min(0).max(10).optional(),
  description: z.string().optional(),
  affectedSoftware: z.string(),
  affectedVersions: z.string().optional(),
  fixedVersion: z.string().optional(),
});

const updateCveSchema = z.object({
  id: z.string(),
  status: z.enum(["OPEN", "PATCHED", "MITIGATED", "ACCEPTED", "FALSE_POSITIVE"]).optional(),
  fixedVersion: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "security:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgId = session.user.organizationId;
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status");
  const severity = searchParams.get("severity");
  const search = searchParams.get("search");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
  const offset = parseInt(searchParams.get("offset") || "0");

  const where: Record<string, unknown> = { organizationId: orgId };
  if (status) where.status = status;
  if (severity) where.severity = severity;
  if (search) {
    where.OR = [
      { cveId: { contains: search, mode: "insensitive" } },
      { affectedSoftware: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  try {
    const [entries, total, statusCounts] = await Promise.all([
      prisma.cveEntry.findMany({
        where,
        orderBy: [{ severity: "asc" }, { detectedAt: "desc" }],
        take: limit,
        skip: offset,
        include: { _count: { select: { scans: true } } },
      }),
      prisma.cveEntry.count({ where }),
      prisma.cveEntry.groupBy({
        by: ["status"],
        where: { organizationId: orgId },
        _count: { status: true },
      }),
    ]);

    const counts: Record<string, number> = {};
    for (const row of statusCounts) {
      counts[row.status] = row._count.status;
    }

    return NextResponse.json({
      entries,
      counts,
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    });
  } catch (error) {
    console.error("Error fetching CVE entries:", error);
    return NextResponse.json({ error: "Failed to fetch CVE entries" }, { status: 500 });
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
    const parsed = createCveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const entry = await prisma.cveEntry.create({
      data: {
        organizationId: session.user.organizationId,
        ...parsed.data,
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "This CVE already exists for this software" }, { status: 409 });
    }
    console.error("Error creating CVE entry:", error);
    return NextResponse.json({ error: "Failed to create CVE entry" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "security:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = updateCveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.status) {
      data.status = parsed.data.status;
      if (["PATCHED", "MITIGATED", "ACCEPTED", "FALSE_POSITIVE"].includes(parsed.data.status)) {
        data.resolvedAt = new Date();
        data.resolvedBy = session.user.id;
        data.applicability = "NOT_APPLICABLE";
      } else if (parsed.data.status === "OPEN") {
        data.resolvedAt = null;
        data.resolvedBy = null;
      }
    }
    if (parsed.data.fixedVersion) data.fixedVersion = parsed.data.fixedVersion;

    const entry = await prisma.cveEntry.update({
      where: { id: parsed.data.id, organizationId: session.user.organizationId },
      data,
    });

    return NextResponse.json(entry);
  } catch {
    return NextResponse.json({ error: "Failed to update CVE entry" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "security:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = request.nextUrl.searchParams.get("id");
  const ids = request.nextUrl.searchParams.get("ids");
  const all = request.nextUrl.searchParams.get("all");

  try {
    if (all === "true") {
      // Delete all CVEs for this org
      const result = await prisma.cveEntry.deleteMany({
        where: { organizationId: session.user.organizationId },
      });
      return NextResponse.json({ success: true, deleted: result.count });
    }

    if (ids) {
      // Bulk delete by comma-separated IDs
      const idList = ids.split(",").filter(Boolean);
      const result = await prisma.cveEntry.deleteMany({
        where: { id: { in: idList }, organizationId: session.user.organizationId },
      });
      return NextResponse.json({ success: true, deleted: result.count });
    }

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await prisma.cveEntry.delete({
      where: { id, organizationId: session.user.organizationId },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete CVE entry" }, { status: 500 });
  }
}
