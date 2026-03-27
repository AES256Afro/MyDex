import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// PATCH — Update current user's profile
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name } = body;

  if (!name || typeof name !== "string" || name.trim().length < 1) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: { name: name.trim() },
    select: { id: true, name: true, email: true },
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
      createdAt: true,
    },
  });

  return NextResponse.json({ user });
}
