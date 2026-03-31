import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

async function authenticateScim(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const scimToken = await prisma.scimToken.findUnique({
    where: { token },
  });

  if (!scimToken || !scimToken.isActive) return null;

  await prisma.scimToken.update({
    where: { id: scimToken.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {});

  return scimToken;
}

function toScimUser(user: { id: string; email: string; name: string; status: string; role: string; department?: string | null; jobTitle?: string | null; createdAt: Date }) {
  const nameParts = user.name.split(" ");
  return {
    schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
    id: user.id,
    userName: user.email,
    name: {
      givenName: nameParts[0] || "",
      familyName: nameParts.slice(1).join(" ") || "",
      formatted: user.name,
    },
    emails: [{ value: user.email, primary: true, type: "work" }],
    active: user.status === "ACTIVE",
    displayName: user.name,
    title: user.jobTitle || undefined,
    ...(user.department ? {
      "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User": {
        department: user.department,
      },
    } : {}),
    meta: {
      resourceType: "User",
      created: user.createdAt.toISOString(),
      location: `/api/v1/scim/Users/${user.id}`,
    },
  };
}

// GET /scim/Users/:id — get single user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const scimToken = await authenticateScim(request);
  if (!scimToken) {
    return NextResponse.json({ schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"], detail: "Unauthorized", status: 401 }, { status: 401 });
  }

  const { id } = await params;
  const user = await prisma.user.findFirst({
    where: { id, organizationId: scimToken.organizationId },
  });

  if (!user) {
    return NextResponse.json({
      schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
      detail: "User not found",
      status: 404,
    }, { status: 404 });
  }

  return NextResponse.json(toScimUser(user));
}

// PUT /scim/Users/:id — full replace
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const scimToken = await authenticateScim(request);
  if (!scimToken) {
    return NextResponse.json({ schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"], detail: "Unauthorized", status: 401 }, { status: 401 });
  }

  const { id } = await params;
  const orgId = scimToken.organizationId;

  const existing = await prisma.user.findFirst({
    where: { id, organizationId: orgId },
  });

  if (!existing) {
    return NextResponse.json({
      schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
      detail: "User not found",
      status: 404,
    }, { status: 404 });
  }

  try {
    const body = await request.json();
    const givenName = body.name?.givenName || "";
    const familyName = body.name?.familyName || "";
    const displayName = body.displayName || `${givenName} ${familyName}`.trim() || existing.name;
    const department = body["urn:ietf:params:scim:schemas:extension:enterprise:2.0:User"]?.department;
    const newStatus = body.active === false ? "INACTIVE" : "ACTIVE";
    const action = newStatus !== existing.status
      ? (newStatus === "INACTIVE" ? "DEACTIVATE_USER" : "REACTIVATE_USER")
      : "UPDATE_USER";

    const user = await prisma.user.update({
      where: { id },
      data: {
        name: displayName,
        status: newStatus,
        department: department !== undefined ? (department || null) : existing.department,
        jobTitle: body.title !== undefined ? (body.title || null) : existing.jobTitle,
      },
    });

    await logScimEvent(orgId, scimToken.provider, action, body.externalId, id, user.email);

    return NextResponse.json(toScimUser(user));
  } catch (error) {
    console.error("SCIM update user error:", error);
    return NextResponse.json({
      schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
      detail: "Failed to update user",
      status: 500,
    }, { status: 500 });
  }
}

// PATCH /scim/Users/:id — partial update (used by Slack/Teams for deactivation)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const scimToken = await authenticateScim(request);
  if (!scimToken) {
    return NextResponse.json({ schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"], detail: "Unauthorized", status: 401 }, { status: 401 });
  }

  const { id } = await params;
  const orgId = scimToken.organizationId;

  const existing = await prisma.user.findFirst({
    where: { id, organizationId: orgId },
  });

  if (!existing) {
    return NextResponse.json({
      schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
      detail: "User not found",
      status: 404,
    }, { status: 404 });
  }

  try {
    const body = await request.json();
    const data: Record<string, unknown> = {};
    let action = "UPDATE_USER";

    // SCIM PATCH operations format
    if (body.Operations) {
      for (const op of body.Operations) {
        if (op.op === "replace" || op.op === "Replace") {
          if (op.path === "active" || op.value?.active !== undefined) {
            const active = op.path === "active" ? op.value : op.value.active;
            data.status = active ? "ACTIVE" : "INACTIVE";
            action = active ? "REACTIVATE_USER" : "DEACTIVATE_USER";
          }
          if (op.path === "displayName" || op.value?.displayName) {
            data.name = op.path === "displayName" ? op.value : op.value.displayName;
          }
          if (op.path === "name.givenName" || op.path === "name.familyName") {
            // Reconstruct full name
            const parts = existing.name.split(" ");
            if (op.path === "name.givenName") parts[0] = op.value;
            if (op.path === "name.familyName") parts[parts.length > 1 ? 1 : parts.length] = op.value;
            data.name = parts.join(" ");
          }
          if (op.path === "title" || op.value?.title) {
            data.jobTitle = op.path === "title" ? op.value : op.value.title;
          }
        }
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(toScimUser(existing));
    }

    const user = await prisma.user.update({
      where: { id },
      data,
    });

    await logScimEvent(orgId, scimToken.provider, action, undefined, id, user.email);

    return NextResponse.json(toScimUser(user));
  } catch (error) {
    console.error("SCIM patch user error:", error);
    return NextResponse.json({
      schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
      detail: "Failed to patch user",
      status: 500,
    }, { status: 500 });
  }
}

// DELETE /scim/Users/:id — deactivate (we soft-delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const scimToken = await authenticateScim(request);
  if (!scimToken) {
    return NextResponse.json({ schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"], detail: "Unauthorized", status: 401 }, { status: 401 });
  }

  const { id } = await params;
  const orgId = scimToken.organizationId;

  const existing = await prisma.user.findFirst({
    where: { id, organizationId: orgId },
  });

  if (!existing) {
    return NextResponse.json({
      schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
      detail: "User not found",
      status: 404,
    }, { status: 404 });
  }

  await prisma.user.update({
    where: { id },
    data: { status: "INACTIVE" },
  });

  await logScimEvent(orgId, scimToken.provider, "DEACTIVATE_USER", undefined, id, existing.email);

  return new NextResponse(null, { status: 204 });
}

async function logScimEvent(
  orgId: string, provider: string, action: string,
  externalId?: string, userId?: string, email?: string,
  success = true, errorMessage?: string
) {
  await prisma.scimEvent.create({
    data: {
      organizationId: orgId,
      provider,
      action,
      externalId: externalId || null,
      userId: userId || null,
      email: email || null,
      success,
      errorMessage: errorMessage || null,
    },
  }).catch(() => {});
}
