import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Role } from "@/generated/prisma";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  version: z.string().max(50).nullable().optional(),
  tags: z.array(z.string()).optional(),
  isPublished: z.boolean().optional(),
});

// GET - Get a single patch note
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const note = await prisma.patchNote.findFirst({
      where: {
        id,
        OR: [
          { organizationId: session.user.organizationId },
          { organizationId: null },
        ],
      },
      include: {
        author: { select: { id: true, name: true, role: true, image: true } },
      },
    });

    if (!note) {
      return NextResponse.json({ error: "Patch note not found" }, { status: 404 });
    }

    return NextResponse.json({ note });
  } catch (error) {
    console.error("Error fetching patch note:", error);
    return NextResponse.json({ error: "Failed to fetch patch note" }, { status: 500 });
  }
}

// PATCH - Update a patch note
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user.role as Role, "patch-notes:write")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const existing = await prisma.patchNote.findFirst({
      where: { id, organizationId: session.user.organizationId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Patch note not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const note = await prisma.patchNote.update({
      where: { id },
      data: parsed.data,
      include: {
        author: { select: { id: true, name: true, role: true, image: true } },
      },
    });

    return NextResponse.json({ note });
  } catch (error) {
    console.error("Error updating patch note:", error);
    return NextResponse.json({ error: "Failed to update patch note" }, { status: 500 });
  }
}

// DELETE - Delete a patch note
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user.role as Role, "patch-notes:write")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const existing = await prisma.patchNote.findFirst({
      where: { id, organizationId: session.user.organizationId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Patch note not found" }, { status: 404 });
    }

    await prisma.patchNote.delete({ where: { id } });

    return NextResponse.json({ message: "Patch note deleted" });
  } catch (error) {
    console.error("Error deleting patch note:", error);
    return NextResponse.json({ error: "Failed to delete patch note" }, { status: 500 });
  }
}
