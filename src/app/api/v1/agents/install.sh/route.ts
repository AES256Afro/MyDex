import { NextRequest, NextResponse } from "next/server";

/**
 * Convenience endpoint that always returns the Bash install script.
 * GET /api/v1/agents/install.sh?key=mdx_xxx
 *
 * Usage: curl -fsSL 'https://server/api/v1/agents/install.sh?key=KEY' | sudo bash
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const apiKey = searchParams.get("key") || "YOUR_API_KEY";
  const serverUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}`;

  // Redirect to the main install endpoint with os=bash
  const installUrl = new URL("/api/v1/agents/install", serverUrl);
  installUrl.searchParams.set("key", apiKey);
  installUrl.searchParams.set("os", "bash");

  // Fetch from the main endpoint and return
  const response = await fetch(installUrl.toString());
  const script = await response.text();

  return new NextResponse(script, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": "inline; filename=install-mydex.sh",
      "Cache-Control": "no-cache",
    },
  });
}
