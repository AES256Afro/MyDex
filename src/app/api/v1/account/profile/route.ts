import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const profileSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  monitoringPaused: z.boolean().optional(),
});

// PATCH — Update current user's profile
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { name, monitoringPaused } = parsed.data;

  // Build update data
  const data: Record<string, unknown> = {};

  if (name !== undefined) {
    data.name = name;
  }

  if (monitoringPaused !== undefined) {
    data.monitoringPaused = monitoringPaused;
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
