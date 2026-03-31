import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasMinRole } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";

// GET - list workflow execution logs
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasMinRole(session.user.role, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgId = session.user.organizationId;
  const workflowId = request.nextUrl.searchParams.get("workflowId");
  const limit = Math.min(Number(request.nextUrl.searchParams.get("limit")) || 50, 200);

  try {
    const where: Record<string, unknown> = { organizationId: orgId };
    if (workflowId) where.workflowId = workflowId;

    const logs = await prisma.workflowLog.findMany({
      where,
      include: {
        workflow: { select: { id: true, name: true } },
      },
      orderBy: { executedAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Error fetching workflow logs:", error);
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}
