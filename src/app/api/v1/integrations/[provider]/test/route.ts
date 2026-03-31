import { auth } from "@/lib/auth";
import { hasMinRole } from "@/lib/permissions";
import { sendSlackMessage, sendTeamsMessage } from "@/lib/integrations";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasMinRole(session.user.role, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { provider } = await params;
  const orgId = session.user.organizationId;

  const payload = {
    title: "🔔 MyDex Test Notification",
    message: `This is a test message from MyDex, sent by ${session.user.name}. If you see this, the integration is working correctly!`,
    color: "#22C55E",
    fields: [
      { label: "Organization", value: session.user.name || "MyDex" },
      { label: "Status", value: "✅ Connected" },
    ],
  };

  let success = false;
  if (provider === "slack") {
    success = await sendSlackMessage(orgId, payload);
  } else if (provider === "teams") {
    success = await sendTeamsMessage(orgId, payload);
  } else {
    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  }

  if (success) {
    return NextResponse.json({ success: true, message: "Test message sent successfully" });
  }
  return NextResponse.json({ error: "Failed to send test message. Check your webhook URL." }, { status: 400 });
}
