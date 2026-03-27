import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  category: z.string().optional(),
  domains: z.array(z.string().min(1)).min(1),
  isActive: z.boolean().optional(),
});

const policySchema = z.object({
  hostGroupId: z.string(),
  blocklistId: z.string().optional(),
  policyType: z.enum(["DOMAIN_BLOCK", "FIREWALL"]),
  action: z.enum(["BLOCK", "LOG", "WARN"]).optional(),
  direction: z.string().optional(),
  protocol: z.string().optional(),
  port: z.string().optional(),
  remoteAddress: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "security:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgId = session.user.organizationId;

  try {
    const blocklists = await prisma.domainBlocklist.findMany({
      where: { organizationId: orgId },
      include: {
        _count: { select: { policies: true } },
        policies: {
          include: {
            hostGroup: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ blocklists });
  } catch (error) {
    console.error("Error fetching blocklists:", error);
    return NextResponse.json({ error: "Failed to fetch blocklists" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "security:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgId = session.user.organizationId;

  try {
    const body = await request.json();

    // Check if this is a policy creation
    if (body.policyType) {
      const parsed = policySchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 });
      }

      const policy = await prisma.hostGroupPolicy.create({
        data: {
          hostGroupId: parsed.data.hostGroupId,
          blocklistId: parsed.data.blocklistId || null,
          policyType: parsed.data.policyType,
          action: parsed.data.action || "LOG",
          direction: parsed.data.direction || null,
          protocol: parsed.data.protocol || null,
          port: parsed.data.port || null,
          remoteAddress: parsed.data.remoteAddress || null,
          description: parsed.data.description || null,
          isActive: parsed.data.isActive ?? true,
        },
        include: {
          hostGroup: { select: { id: true, name: true } },
          blocklist: { select: { id: true, name: true } },
        },
      });

      return NextResponse.json({ policy }, { status: 201 });
    }

    // Otherwise, create a blocklist
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 });
    }

    const { name, description, category, domains, isActive } = parsed.data;

    // Normalize domains
    const normalizedDomains = domains.map((d) => d.toLowerCase().trim().replace(/^https?:\/\//, "").replace(/\/.*$/, ""));

    const blocklist = await prisma.domainBlocklist.create({
      data: {
        organizationId: orgId,
        name,
        description,
        category: category || "Custom",
        domains: normalizedDomains,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json({ blocklist }, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && (error as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "Blocklist name already exists" }, { status: 409 });
    }
    console.error("Error creating blocklist:", error);
    return NextResponse.json({ error: "Failed to create blocklist" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "security:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgId = session.user.organizationId;

  try {
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    // Normalize domains if provided
    if (updates.domains && Array.isArray(updates.domains)) {
      updates.domains = updates.domains.map((d: string) =>
        d.toLowerCase().trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "")
      );
    }

    const blocklist = await prisma.domainBlocklist.update({
      where: { id, organizationId: orgId },
      data: updates,
    });

    return NextResponse.json({ blocklist });
  } catch (error) {
    console.error("Error updating blocklist:", error);
    return NextResponse.json({ error: "Failed to update blocklist" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "security:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgId = session.user.organizationId;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const policyId = searchParams.get("policyId");

    if (policyId) {
      await prisma.hostGroupPolicy.delete({ where: { id: policyId } });
      return NextResponse.json({ success: true });
    }

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await prisma.domainBlocklist.delete({
      where: { id, organizationId: orgId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
