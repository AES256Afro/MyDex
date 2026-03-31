import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { createMdmClient } from "@/lib/mdm/factory";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const actionSchema = z.object({
  mdmProviderId: z.string(),
  mdmDeviceId: z.string(),
  agentDeviceId: z.string().optional(),
  actionType: z.enum(["lock", "wipe", "restart", "deploy_app", "retire", "sync"]),
  payload: z.record(z.string(), z.unknown()).optional(),
});

// POST - execute MDM action
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "mdm:actions"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 400 });
  }

  const { mdmProviderId, mdmDeviceId, agentDeviceId, actionType, payload } = parsed.data;

  const provider = await prisma.mdmProvider.findFirst({
    where: { id: mdmProviderId, organizationId: session.user.organizationId },
  });
  if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  if (!provider.isActive) return NextResponse.json({ error: "Provider is disabled" }, { status: 400 });

  // Create action record
  const action = await prisma.mdmAction.create({
    data: {
      organizationId: session.user.organizationId,
      mdmProviderId,
      mdmDeviceId,
      agentDeviceId: agentDeviceId || null,
      actionType,
      payload: payload ? JSON.parse(JSON.stringify(payload)) : undefined,
      status: "SENT",
      issuedBy: session.user.id,
    },
  });

  try {
    const client = createMdmClient({
      providerType: provider.providerType,
      clientId: provider.clientId || undefined,
      clientSecret: provider.clientSecret || undefined,
      tenantId: provider.tenantId || undefined,
      apiToken: provider.apiToken || undefined,
      instanceUrl: provider.instanceUrl || undefined,
    });

    let result: { success: boolean; error?: string };

    switch (actionType) {
      case "lock":
        result = await client.lockDevice(mdmDeviceId);
        break;
      case "wipe":
        result = await client.wipeDevice(mdmDeviceId);
        break;
      case "restart":
        result = await client.restartDevice(mdmDeviceId);
        break;
      case "retire":
        result = await client.retireDevice(mdmDeviceId);
        break;
      case "sync":
        result = await client.syncDevice(mdmDeviceId);
        break;
      case "deploy_app":
        if (!payload?.appId) throw new Error("appId required for deploy_app");
        result = await client.deployApp(mdmDeviceId, payload.appId as string);
        break;
    }

    if (!result!.success) {
      throw new Error(result!.error || `${actionType} failed`);
    }

    await prisma.mdmAction.update({
      where: { id: action.id },
      data: { status: "COMPLETED", completedAt: new Date(), result: "Success" },
    });

    return NextResponse.json({ action: { ...action, status: "COMPLETED" } });
  } catch (e) {
    const error = e instanceof Error ? e.message : "Unknown error";
    await prisma.mdmAction.update({
      where: { id: action.id },
      data: { status: "FAILED", completedAt: new Date(), errorMessage: error },
    });

    return NextResponse.json({ action: { ...action, status: "FAILED", errorMessage: error } }, { status: 500 });
  }
}

// GET - list recent MDM actions
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "mdm:read"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const providerId = searchParams.get("providerId");

  const where: Record<string, unknown> = {
    organizationId: session.user.organizationId,
  };
  if (providerId) where.mdmProviderId = providerId;

  const actions = await prisma.mdmAction.findMany({
    where,
    orderBy: { issuedAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ actions });
}
