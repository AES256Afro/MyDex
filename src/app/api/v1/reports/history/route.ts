import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user.role, "reports:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const reports = await prisma.reportHistory.findMany({
      where: { organizationId: session.user.organizationId },
      orderBy: { generatedAt: "desc" },
      take: 50,
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ reports });
  } catch (error) {
    console.error("Error fetching report history:", error);
    return NextResponse.json(
      { error: "Failed to fetch report history" },
      { status: 500 }
    );
  }
}
