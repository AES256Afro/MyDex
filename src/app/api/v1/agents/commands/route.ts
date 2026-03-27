import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createCommandSchema = z.object({
  deviceId: z.string(),
  cveEntryId: z.string().optional(),
  commandType: z.enum([
    "UPDATE_SOFTWARE", "UNINSTALL_SOFTWARE", "RUN_SCRIPT", "RESTART_SERVICE",
    "FORCE_REBOOT", "CUSTOM", "ISOLATE_HOST", "UNISOLATE_HOST",
    "COLLECT_LOGS", "UPDATE_AGENT", "CHANGE_POLICY",
  ]),
  command: z.string().optional().default("auto"),
  description: z.string().optional(),
});

const updateCommandSchema = z.object({
  id: z.string(),
  status: z.enum(["SENT", "EXECUTING", "COMPLETED", "FAILED", "CANCELLED"]),
  result: z.string().optional(),
  exitCode: z.number().optional(),
});

// GET - list commands (for admin: all org commands, for agent: pending commands for their devices)
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = session.user.organizationId;
  const deviceId = request.nextUrl.searchParams.get("deviceId");
  const status = request.nextUrl.searchParams.get("status");
  const pending = request.nextUrl.searchParams.get("pending");

  const where: Record<string, unknown> = { organizationId: orgId };

  if (deviceId) {
    where.deviceId = deviceId;
  } else if (pending === "true") {
    // Agent polling for their pending commands
    where.device = { userId: session.user.id };
    where.status = { in: ["PENDING", "SENT"] };
  }

  if (status) where.status = status;

  try {
    const commands = await prisma.remediationCommand.findMany({
      where,
      include: {
        device: {
          select: { id: true, hostname: true, user: { select: { name: true, email: true } } },
        },
        cveEntry: {
          select: { cveId: true, affectedSoftware: true },
        },
      },
      orderBy: { issuedAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ commands });
  } catch (error) {
    console.error("Error fetching commands:", error);
    return NextResponse.json({ error: "Failed to fetch commands" }, { status: 500 });
  }
}

// POST - create a new command (admin only)
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "security:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = createCommandSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const command = await prisma.remediationCommand.create({
      data: {
        organizationId: session.user.organizationId,
        deviceId: parsed.data.deviceId,
        cveEntryId: parsed.data.cveEntryId || null,
        commandType: parsed.data.commandType,
        command: parsed.data.command,
        description: parsed.data.description,
        issuedBy: session.user.id,
      },
    });

    return NextResponse.json(command, { status: 201 });
  } catch (error) {
    console.error("Error creating command:", error);
    return NextResponse.json({ error: "Failed to create command" }, { status: 500 });
  }
}

// PATCH - update command status (agent reports back)
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = updateCommandSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const data: Record<string, unknown> = { status: parsed.data.status };
    if (parsed.data.result) data.result = parsed.data.result;
    if (parsed.data.exitCode !== undefined) data.exitCode = parsed.data.exitCode;
    if (["COMPLETED", "FAILED"].includes(parsed.data.status)) {
      data.executedAt = new Date();
    }

    const command = await prisma.remediationCommand.update({
      where: { id: parsed.data.id, organizationId: session.user.organizationId },
      data,
    });

    return NextResponse.json(command);
  } catch {
    return NextResponse.json({ error: "Failed to update command" }, { status: 500 });
  }
}
