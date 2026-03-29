import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const updateSettingsSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  settings: z
    .object({
      timezone: z.string().optional(),
      workHoursStart: z.string().optional(),
      workHoursEnd: z.string().optional(),
      // Access control
      registrationMode: z.enum(["open", "allowlist", "closed"]).optional(),
      allowedEmails: z.array(z.string().email()).optional(),
      allowedDomains: z.array(z.string()).optional(),
      allowedDevices: z.array(z.string()).optional(),
      deviceAllowlistEnabled: z.boolean().optional(),
      requireApproval: z.boolean().optional(),
      // Module access control per role
      moduleAccess: z.record(z.string(), z.object({
        enabled: z.boolean(),
        minRole: z.string().optional(),
      })).optional(),
      // Branding
      companyName: z.string().max(100).optional(),
      logoUrl: z.string().optional().or(z.literal("")),
      bannerUrl: z.string().optional().or(z.literal("")),
      primaryColor: z.string().max(30).optional(),
      favicon: z.string().optional().or(z.literal("")),
      brandingMode: z.enum(["replace", "alongside"]).optional(),
    })
    .optional(),
});

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user.role, "settings:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgId = session.user.organizationId;

  try {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        settings: true,
        createdAt: true,
      },
    });

    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ organization: org });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user.role, "settings:write")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgId = session.user.organizationId;

  try {
    const body = await request.json();
    const parsed = updateSettingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, settings } = parsed.data;

    // If settings are provided, merge with existing
    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name;

    if (settings) {
      const existing = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { settings: true },
      });
      const existingSettings =
        (existing?.settings as Record<string, unknown>) || {};
      updateData.settings = { ...existingSettings, ...settings };
    }

    const org = await prisma.organization.update({
      where: { id: orgId },
      data: updateData,
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        settings: true,
      },
    });

    return NextResponse.json(org);
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
