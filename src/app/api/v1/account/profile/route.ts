import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// PATCH — Update current user's profile
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, monitoringPaused } = body;

  // Build update data
  const data: Record<string, unknown> = {};

  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length < 1) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    data.name = name.trim();
  }

  if (monitoringPaused !== undefined) {
    data.monitoringPaused = Boolean(monitoringPaused);
    data.monitoringPausedAt = monitoringPaused ? new Date() : null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data,
    select: { id: true, name: true, email: true, monitoringPaused: true, monitoringPausedAt: true },
  });

  return NextResponse.json({ user: updated });
}

// GET — Get current user's profile
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true,
      jobTitle: true,
      image: true,
      monitoringPaused: true,
      monitoringPausedAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ user });
}
