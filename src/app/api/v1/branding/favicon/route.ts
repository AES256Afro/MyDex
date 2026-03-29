import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";

// GET - Fetch a favicon from a given domain URL
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user.role, "settings:write")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "URL parameter required" }, { status: 400 });
  }

  try {
    // Extract domain from URL
    let domain: string;
    try {
      const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
      domain = parsed.hostname;
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // Try Google's favicon service (returns high quality favicons)
    const googleUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    const response = await fetch(googleUrl, { signal: AbortSignal.timeout(10000) });

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch favicon" }, { status: 502 });
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get("content-type") || "image/png";
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${contentType};base64,${base64}`;

    return NextResponse.json({ faviconUrl: dataUrl, domain });
  } catch (error) {
    console.error("Error fetching favicon:", error);
    return NextResponse.json({ error: "Failed to fetch favicon" }, { status: 500 });
  }
}
