import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Role } from "@/generated/prisma";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  version: z.string().max(50).optional(),
  tags: z.array(z.string()).optional(),
  isPublished: z.boolean().optional(),
});

// GET - List patch notes (everyone can read)
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = session.user.organizationId;
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));
  const tag = searchParams.get("tag");

  try {
    const where: Record<string, unknown> = {
      OR: [
        { organizationId: orgId },
        { organizationId: null }, // global/system notes
      ],
      isPublished: true,
    };

    // Admins can also see unpublished
    if (hasPermission(session.user.role as Role, "patch-notes:write")) {
      delete where.isPublished;
    }

    if (tag) {
      where.tags = { array_contains: [tag] };
    }

    const [notes, total] = await Promise.all([
      prisma.patchNote.findMany({
        where,
        include: {
          author: { select: { id: true, name: true, role: true, image: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.patchNote.count({ where }),
    ]);

    return NextResponse.json({
      notes,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Error fetching patch notes:", error);
    return NextResponse.json({ error: "Failed to fetch patch notes" }, { status: 500 });
  }
}

// POST - Create a new patch note (admins only)
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user.role as Role, "patch-notes:write")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const note = await prisma.patchNote.create({
      data: {
        organizationId: session.user.organizationId,
        authorId: session.user.id,
        title: parsed.data.title,
        content: parsed.data.content,
        version: parsed.data.version,
        tags: parsed.data.tags ?? [],
        isPublished: parsed.data.isPublished ?? true,
      },
      include: {
        author: { select: { id: true, name: true, role: true, image: true } },
      },
    });

    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    console.error("Error creating patch note:", error);
    return NextResponse.json({ error: "Failed to create patch note" }, { status: 500 });
  }
}
