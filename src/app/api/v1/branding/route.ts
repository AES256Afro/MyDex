import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET - fetch org branding (any authenticated user)
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const org = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      select: { name: true, settings: true },
    });

    if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const settings = (org.settings as Record<string, unknown>) || {};

    return NextResponse.json({
      companyName: (settings.companyName as string) || org.name || "MyDex",
      logoUrl: (settings.logoUrl as string) || "",
      bannerUrl: (settings.bannerUrl as string) || "",
      primaryColor: (settings.primaryColor as string) || "",
      favicon: (settings.favicon as string) || "",
      brandingMode: (settings.brandingMode as string) || "replace",
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch branding" }, { status: 500 });
  }
}
