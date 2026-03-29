import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma";

const MAX_FILE_SIZE = 512 * 1024; // 512KB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/svg+xml", "image/webp", "image/gif"];

// POST - Upload a logo or banner image (stored as base64 data URL in org settings)
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user.role, "settings:write")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgId = session.user.organizationId;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const field = formData.get("field") as string | null; // "logoUrl" or "bannerUrl" or "favicon"

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!["logoUrl", "bannerUrl", "favicon"].includes(field || "")) {
      return NextResponse.json({ error: "Invalid field. Must be logoUrl, bannerUrl, or favicon" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: PNG, JPEG, SVG, WebP, GIF" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 512KB" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;

    // Update org settings with the data URL
    const existing = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { settings: true },
    });

    const existingSettings = (existing?.settings as Record<string, unknown>) || {};
    const updatedSettings = { ...existingSettings, [field!]: dataUrl };

    await prisma.organization.update({
      where: { id: orgId },
      data: { settings: updatedSettings as Prisma.InputJsonValue },
    });

    return NextResponse.json({ url: dataUrl, field });
  } catch (error) {
    console.error("Error uploading branding image:", error);
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
  }
}
