import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(200),
  reportType: z.enum(["productivity", "attendance", "security", "time-tracking"]),
  config: z.record(z.string(), z.unknown()).default({}),
  schedule: z.string().min(1).max(100),
  recipients: z.array(z.string().email()).min(1),
  format: z.enum(["pdf", "csv"]).default("pdf"),
  sendToChannel: z.boolean().default(false),
});

const updateSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(200).optional(),
  reportType: z.enum(["productivity", "attendance", "security", "time-tracking"]).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  schedule: z.string().min(1).max(100).optional(),
  recipients: z.array(z.string().email()).optional(),
  format: z.enum(["pdf", "csv"]).optional(),
  isActive: z.boolean().optional(),
  sendToChannel: z.boolean().optional(),
});

const deleteSchema = z.object({
  id: z.string(),
});

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user.role, "reports:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgId = session.user.organizationId;

  try {
    const reports = await prisma.scheduledReport.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ reports });
  } catch (error) {
    console.error("Error fetching scheduled reports:", error);
    return NextResponse.json(
      { error: "Failed to fetch scheduled reports" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user.role, "reports:schedule")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgId = session.user.organizationId;

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, reportType, config, schedule, recipients, format, sendToChannel } =
      parsed.data;

    const report = await prisma.scheduledReport.create({
      data: {
        organizationId: orgId,
        name,
        reportType,
        config: config as object,
        schedule,
        recipients: recipients as string[],
        format,
        sendToChannel,
      },
    });

    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    console.error("Error creating scheduled report:", error);
    return NextResponse.json(
      { error: "Failed to create scheduled report" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user.role, "reports:schedule")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgId = session.user.organizationId;

  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { id, config, recipients, sendToChannel, ...rest } = parsed.data;

    // Verify the report belongs to this org
    const existing = await prisma.scheduledReport.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Scheduled report not found" },
        { status: 404 }
      );
    }

    const report = await prisma.scheduledReport.update({
      where: { id },
      data: {
        ...rest,
        ...(config !== undefined && { config: config as object }),
        ...(recipients !== undefined && { recipients: recipients as string[] }),
        ...(sendToChannel !== undefined && { sendToChannel }),
      },
    });

    return NextResponse.json({ report });
  } catch (error) {
    console.error("Error updating scheduled report:", error);
    return NextResponse.json(
      { error: "Failed to update scheduled report" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user.role, "reports:schedule")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgId = session.user.organizationId;

  try {
    const body = await request.json();
    const parsed = deleteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { id } = parsed.data;

    // Verify the report belongs to this org
    const existing = await prisma.scheduledReport.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Scheduled report not found" },
        { status: 404 }
      );
    }

    await prisma.scheduledReport.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting scheduled report:", error);
    return NextResponse.json(
      { error: "Failed to delete scheduled report" },
      { status: 500 }
    );
  }
}
