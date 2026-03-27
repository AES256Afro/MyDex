import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const ssoProviderSchema = z.object({
  providerType: z.enum(["MICROSOFT_ENTRA", "OKTA", "GOOGLE_WORKSPACE", "GITHUB"]),
  name: z.string().min(1),
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  tenantId: z.string().optional(),
  domain: z.string().optional(),
  issuerUrl: z.string().url().optional(),
  metadataUrl: z.string().url().optional(),
  autoProvision: z.boolean().optional(),
  defaultRole: z.enum(["EMPLOYEE", "MANAGER", "ADMIN"]).optional(),
});

// GET — List SSO providers for the organization
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "settings:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const providers = await prisma.ssoProvider.findMany({
    where: { organizationId: session.user.organizationId },
    select: {
      id: true,
      providerType: true,
      name: true,
      clientId: true,
      tenantId: true,
      domain: true,
      issuerUrl: true,
      metadataUrl: true,
      isActive: true,
      autoProvision: true,
      defaultRole: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ providers });
}

// POST — Create/update an SSO provider
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "settings:write")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = ssoProviderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const orgId = session.user.organizationId;
  const data = parsed.data;

  // Validate provider-specific fields
  if (data.providerType === "MICROSOFT_ENTRA" && !data.tenantId) {
    return NextResponse.json({ error: "Tenant ID is required for Microsoft Entra ID" }, { status: 400 });
  }
  if (data.providerType === "OKTA" && !data.domain) {
    return NextResponse.json({ error: "Okta domain is required" }, { status: 400 });
  }

  // Build issuer URL if not provided
  let issuerUrl = data.issuerUrl;
  if (!issuerUrl) {
    if (data.providerType === "MICROSOFT_ENTRA") {
      issuerUrl = `https://login.microsoftonline.com/${data.tenantId}/v2.0`;
    } else if (data.providerType === "OKTA") {
      issuerUrl = `https://${data.domain}/oauth2/default`;
    }
  }

  const provider = await prisma.ssoProvider.upsert({
    where: {
      organizationId_providerType: {
        organizationId: orgId,
        providerType: data.providerType,
      },
    },
    update: {
      name: data.name,
      clientId: data.clientId,
      clientSecret: data.clientSecret,
      tenantId: data.tenantId,
      domain: data.domain,
      issuerUrl,
      metadataUrl: data.metadataUrl,
      autoProvision: data.autoProvision ?? false,
      defaultRole: data.defaultRole ?? "EMPLOYEE",
    },
    create: {
      organizationId: orgId,
      providerType: data.providerType,
      name: data.name,
      clientId: data.clientId,
      clientSecret: data.clientSecret,
      tenantId: data.tenantId,
      domain: data.domain,
      issuerUrl,
      metadataUrl: data.metadataUrl,
      autoProvision: data.autoProvision ?? false,
      defaultRole: data.defaultRole ?? "EMPLOYEE",
    },
  });

  return NextResponse.json({ provider: { ...provider, clientSecret: "***" } });
}

// PATCH — Toggle SSO provider active/inactive
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "settings:write")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { id, isActive } = body;

  if (!id) {
    return NextResponse.json({ error: "Provider ID required" }, { status: 400 });
  }

  const provider = await prisma.ssoProvider.findFirst({
    where: { id, organizationId: session.user.organizationId },
  });

  if (!provider) {
    return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  }

  const updated = await prisma.ssoProvider.update({
    where: { id },
    data: { isActive: isActive ?? !provider.isActive },
  });

  return NextResponse.json({ provider: { ...updated, clientSecret: "***" } });
}

// DELETE — Remove an SSO provider
export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "settings:write")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Provider ID required" }, { status: 400 });
  }

  const provider = await prisma.ssoProvider.findFirst({
    where: { id, organizationId: session.user.organizationId },
  });

  if (!provider) {
    return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  }

  await prisma.ssoProvider.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
