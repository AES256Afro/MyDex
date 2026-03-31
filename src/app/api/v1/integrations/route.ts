import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasMinRole } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasMinRole(session.user.role, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgId = session.user.organizationId;
  const integrations = await prisma.integration.findMany({
    where: { organizationId: orgId },
    orderBy: { provider: "asc" },
  });

  // Mask bot tokens
  const masked = integrations.map((i) => ({
    ...i,
    botToken: i.botToken ? `...${i.botToken.slice(-8)}` : null,
  }));

  return NextResponse.json({ integrations: masked });
}

const upsertSchema = z.object({
  provider: z.enum(["slack", "teams"]),
  webhookUrl: z.string().url().optional().or(z.literal("")),
  botToken: z.string().optional().or(z.literal("")),
  channelId: z.string().optional().or(z.literal("")),
  channelName: z.string().optional().or(z.literal("")),
  enabled: z.boolean(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasMinRole(session.user.role, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgId = session.user.organizationId;
  const body = await request.json();
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 });
  }

  const { provider, webhookUrl, botToken, channelId, channelName, enabled, settings } = parsed.data;

  const integration = await prisma.integration.upsert({
    where: { organizationId_provider: { organizationId: orgId, provider } },
    create: {
      organizationId: orgId,
      provider,
      webhookUrl: webhookUrl || null,
      botToken: botToken || null,
      channelId: channelId || null,
      channelName: channelName || null,
      enabled,
      settings: (settings || {}) as Prisma.InputJsonValue,
    },
    update: {
      webhookUrl: webhookUrl || null,
      ...(botToken && botToken.length > 8 ? { botToken } : {}),
      channelId: channelId || null,
      channelName: channelName || null,
      enabled,
      settings: (settings || {}) as Prisma.InputJsonValue,
    },
  });

  return NextResponse.json({ integration });
}
