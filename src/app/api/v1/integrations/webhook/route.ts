import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// POST /api/v1/integrations/webhook — receive events from Slack/Teams
export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";

  try {
    // Detect provider based on request shape
    if (contentType.includes("application/x-www-form-urlencoded")) {
      // Slack sends URL-encoded payloads for interactive messages
      const formData = await request.formData();
      const payloadStr = formData.get("payload");
      if (payloadStr) {
        const payload = JSON.parse(payloadStr as string);
        return handleSlackInteraction(request, payload);
      }
      // Slack slash commands
      const command = formData.get("command");
      if (command) {
        return handleSlackCommand(request, Object.fromEntries(formData));
      }
    }

    const body = await request.json();

    // Slack Events API challenge
    if (body.type === "url_verification" && body.challenge) {
      return NextResponse.json({ challenge: body.challenge });
    }

    // Slack Events API
    if (body.type === "event_callback" && body.event) {
      return handleSlackEvent(request, body);
    }

    // Teams webhook (Adaptive Card action)
    if (body.type === "message" || body.type === "invoke") {
      return handleTeamsAction(request, body);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

async function handleSlackCommand(
  request: NextRequest,
  data: Record<string, FormDataEntryValue>
) {
  const command = String(data.command || "");
  const text = String(data.text || "").trim();
  const teamId = String(data.team_id || "");

  // Find integration by team context
  const integration = await prisma.integration.findFirst({
    where: { provider: "slack", enabled: true },
  });

  if (!integration) {
    return NextResponse.json({
      response_type: "ephemeral",
      text: "MyDex integration is not configured for this workspace.",
    });
  }

  switch (command) {
    case "/mydex-status": {
      // Return device status for user
      const userEmail = String(data.user_name || "") + "@" + String(data.team_domain || "");
      const user = await prisma.user.findFirst({
        where: { email: { contains: String(data.user_name || ""), mode: "insensitive" }, organizationId: integration.organizationId },
      });

      if (!user) {
        return NextResponse.json({
          response_type: "ephemeral",
          text: "Your account was not found in MyDex. Contact your admin.",
        });
      }

      const devices = await prisma.agentDevice.findMany({
        where: { userId: user.id, organizationId: integration.organizationId },
        take: 5,
        orderBy: { lastSeenAt: "desc" },
      });

      const deviceList = devices.length > 0
        ? devices.map(d => `• *${d.hostname}* — ${d.status} (last seen: ${d.lastSeenAt?.toISOString().split("T")[0] || "never"})`).join("\n")
        : "No devices found.";

      return NextResponse.json({
        response_type: "ephemeral",
        blocks: [
          { type: "header", text: { type: "plain_text", text: "Your MyDex Devices" } },
          { type: "section", text: { type: "mrkdwn", text: deviceList } },
        ],
      });
    }

    case "/mydex-lock": {
      if (!text) {
        return NextResponse.json({
          response_type: "ephemeral",
          text: "Usage: `/mydex-lock <device-hostname>`",
        });
      }

      return NextResponse.json({
        response_type: "ephemeral",
        text: `Device lock request for *${text}* received. An admin will review this action.`,
      });
    }

    default:
      return NextResponse.json({
        response_type: "ephemeral",
        text: `Unknown command: ${command}. Available: /mydex-status, /mydex-lock`,
      });
  }
}

async function handleSlackEvent(request: NextRequest, body: Record<string, unknown>) {
  const event = body.event as Record<string, unknown>;

  // Handle user deactivation events from Slack
  if (event.type === "team_member_deactivated" || event.type === "user_change") {
    console.log("[webhook] Slack user event:", event.type, event.user);
  }

  return NextResponse.json({ ok: true });
}

async function handleSlackInteraction(request: NextRequest, payload: Record<string, unknown>) {
  console.log("[webhook] Slack interaction:", payload.type);
  return NextResponse.json({ ok: true });
}

async function handleTeamsAction(request: NextRequest, body: Record<string, unknown>) {
  console.log("[webhook] Teams action:", body.type);
  return NextResponse.json({ ok: true });
}
