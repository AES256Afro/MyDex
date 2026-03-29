import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const providerSchema = z.object({
  providerType: z.enum(["MICROSOFT_INTUNE", "JAMF_PRO", "KANDJI"]),
  name: z.string().min(1).max(100),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  tenantId: z.string().optional(),
  apiToken: z.string().optional(),
  instanceUrl: z.string().url().optional().or(z.literal("")),
  autoAssign: z.boolean().optional(),
  syncIntervalMinutes: z.number().min(15).max(1440).optional(),
});

function maskSecret(s: string | null): string {
  if (!s) return "";
  if (s.length <= 8) return "***";
  return s.slice(0, 4) + "***" + s.slice(-4);
}

// GET - list MDM providers
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "mdm:read"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const providers = await prisma.mdmProvider.findMany({
    where: { organizationId: session.user.organizationId },
    include: { _count: { select: { mdmDevices: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    providers: providers.map((p) => ({
      ...p,
      clientSecret: maskSecret(p.clientSecret),
      apiToken: maskSecret(p.apiToken),
    })),
  });
}

// POST - create or update MDM provider
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "mdm:write"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const parsed = providerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 400 });
  }

  const { providerType, name, clientId, clientSecret, tenantId, apiToken, instanceUrl, autoAssign, syncIntervalMinutes } = parsed.data;

  // Provider-specific validation
  if (providerType === "MICROSOFT_INTUNE") {
    if (!tenantId || !clientId || !clientSecret) {
      return NextResponse.json({ error: "Intune requires tenantId, clientId, and clientSecret" }, { status: 400 });
    }
  } else if (providerType === "JAMF_PRO") {
    if (!instanceUrl) {
      return NextResponse.json({ error: "Jamf requires instanceUrl" }, { status: 400 });
    }
    if (!apiToken && (!clientId || !clientSecret)) {
      return NextResponse.json({ error: "Jamf requires apiToken or clientId/clientSecret" }, { status: 400 });
    }
  } else if (providerType === "KANDJI") {
    if (!instanceUrl || !apiToken) {
      return NextResponse.json({ error: "Kandji requires instanceUrl and apiToken" }, { status: 400 });
    }
  }

  const orgId = session.user.organizationId;

  const provider = await prisma.mdmProvider.upsert({
    where: {
      organizationId_providerType: { organizationId: orgId, providerType },
    },
    create: {
      organizationId: orgId,
      providerType,
      name,
      clientId: clientId || null,
      clientSecret: clientSecret || null,
      tenantId: tenantId || null,
      apiToken: apiToken || null,
      instanceUrl: instanceUrl || null,
      autoAssign: autoAssign ?? true,
      syncIntervalMinutes: syncIntervalMinutes ?? 60,
    },
    update: {
      name,
      clientId: clientId || null,
      clientSecret: clientSecret || null,
      tenantId: tenantId || null,
      apiToken: apiToken || null,
      instanceUrl: instanceUrl || null,
      autoAssign: autoAssign ?? true,
      syncIntervalMinutes: syncIntervalMinutes ?? 60,
    },
  });

  return NextResponse.json({
    provider: {
      ...provider,
      clientSecret: maskSecret(provider.clientSecret),
      apiToken: maskSecret(provider.apiToken),
    },
  }, { status: 201 });
}

// PATCH - toggle active or update settings
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "mdm:write"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { providerId, isActive, autoAssign, syncIntervalMinutes } = body;

  if (!providerId) return NextResponse.json({ error: "providerId required" }, { status: 400 });

  const provider = await prisma.mdmProvider.findFirst({
    where: { id: providerId, organizationId: session.user.organizationId },
  });
  if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 });

  const updateData: Record<string, unknown> = {};
  if (typeof isActive === "boolean") updateData.isActive = isActive;
  if (typeof autoAssign === "boolean") updateData.autoAssign = autoAssign;
  if (typeof syncIntervalMinutes === "number") updateData.syncIntervalMinutes = syncIntervalMinutes;

  const updated = await prisma.mdmProvider.update({
    where: { id: providerId },
    data: updateData,
  });

  return NextResponse.json({
    provider: {
      ...updated,
      clientSecret: maskSecret(updated.clientSecret),
      apiToken: maskSecret(updated.apiToken),
    },
  });
}

// DELETE - remove MDM provider
export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "mdm:write"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const providerId = searchParams.get("providerId");
  if (!providerId) return NextResponse.json({ error: "providerId required" }, { status: 400 });

  const provider = await prisma.mdmProvider.findFirst({
    where: { id: providerId, organizationId: session.user.organizationId },
  });
  if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 });

  await prisma.mdmProvider.delete({ where: { id: providerId } });

  return NextResponse.json({ success: true });
}
