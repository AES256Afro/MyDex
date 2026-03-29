import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { syncMdmProvider } from "@/lib/mdm/sync";
import { NextRequest, NextResponse } from "next/server";

// POST - trigger manual MDM sync
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "mdm:write"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { providerId } = body;

  if (!providerId) {
    return NextResponse.json({ error: "providerId required" }, { status: 400 });
  }

  const provider = await prisma.mdmProvider.findFirst({
    where: { id: providerId, organizationId: session.user.organizationId },
  });
  if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  if (!provider.isActive) return NextResponse.json({ error: "Provider is disabled" }, { status: 400 });

  const result = await syncMdmProvider(providerId);
  return NextResponse.json(result);
}
