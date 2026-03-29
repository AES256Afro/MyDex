import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { createMdmClient } from "@/lib/mdm/factory";
import { NextRequest, NextResponse } from "next/server";

// POST - test MDM provider connection
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "mdm:write"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { providerType, clientId, clientSecret, tenantId, apiToken, instanceUrl } = body;

  if (!providerType) {
    return NextResponse.json({ error: "providerType required" }, { status: 400 });
  }

  try {
    const client = createMdmClient({
      providerType,
      clientId,
      clientSecret,
      tenantId,
      apiToken,
      instanceUrl,
    });

    const result = await client.testConnection();
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({
      success: false,
      error: e instanceof Error ? e.message : "Failed to create MDM client",
    });
  }
}
