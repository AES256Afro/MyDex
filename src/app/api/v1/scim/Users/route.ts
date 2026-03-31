import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";

// SCIM 2.0 /Users endpoint — provisioning from Slack/Teams
// Spec: RFC 7644 https://tools.ietf.org/html/rfc7644

async function authenticateScim(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const scimToken = await prisma.scimToken.findUnique({
    where: { token },
  });

  if (!scimToken || !scimToken.isActive) return null;

  // Update last used
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

// GET /scim/Users — list users (with filter support)
export async function GET(request: NextRequest) {
  const scimToken = await authenticateScim(request);
  if (!scimToken) {
    return NextResponse.json({ schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"], detail: "Unauthorized", status: 401 }, { status: 401 });
  }

  const orgId = scimToken.organizationId;
  const filter = request.nextUrl.searchParams.get("filter");
  const startIndex = parseInt(request.nextUrl.searchParams.get("startIndex") || "1");
  const count = Math.min(parseInt(request.nextUrl.searchParams.get("count") || "100"), 200);

  // Parse simple SCIM filter: userName eq "email@example.com"
  const where: Record<string, unknown> = { organizationId: orgId };
  if (filter) {
    const match = filter.match(/userName\s+eq\s+"([^"]+)"/i);
    if (match) {
      where.email = match[1];
    }
  }

  const [users, totalResults] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: startIndex - 1,
      take: count,
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({
    schemas: ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
    totalResults,
    startIndex,
    itemsPerPage: users.length,
    Resources: users.map(toScimUser),
  });
}

// POST /scim/Users — create (provision) a user
export async function POST(request: NextRequest) {
  const scimToken = await authenticateScim(request);
  if (!scimToken) {
    return NextResponse.json({ schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"], detail: "Unauthorized", status: 401 }, { status: 401 });
  }

  const orgId = scimToken.organizationId;

  try {
    const body = await request.json();
    const email = body.userName || body.emails?.[0]?.value;
    if (!email) {
      return NextResponse.json({
        schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
        detail: "userName (email) is required",
        status: 400,
      }, { status: 400 });
    }

    // Check if user already exists in this org
    const existing = await prisma.user.findFirst({
      where: { email: email.toLowerCase(), organizationId: orgId },
    });

    if (existing) {
      // Log duplicate attempt
      await logScimEvent(orgId, scimToken.provider, "CREATE_USER", body.externalId, existing.id, email, false, "User already exists");
      return NextResponse.json({
        schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
        detail: "User already exists",
        status: 409,
      }, { status: 409 });
    }

    const givenName = body.name?.givenName || "";
    const familyName = body.name?.familyName || "";
    const displayName = body.displayName || `${givenName} ${familyName}`.trim() || email.split("@")[0];
    const department = body["urn:ietf:params:scim:schemas:extension:enterprise:2.0:User"]?.department;
    const title = body.title;

    // Create with a random password (user will need to set via SSO or password reset)
    const randomPassword = randomBytes(32).toString("hex");
    const passwordHash = await bcrypt.hash(randomPassword, 12);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name: displayName,
        passwordHash,
        organizationId: orgId,
        role: "EMPLOYEE",
        status: body.active !== false ? "ACTIVE" : "INACTIVE",
        department: department || null,
        jobTitle: title || null,
      },
    });

    await logScimEvent(orgId, scimToken.provider, "CREATE_USER", body.externalId, user.id, email, true);

    return NextResponse.json(toScimUser(user), { status: 201 });
  } catch (error) {
    console.error("SCIM create user error:", error);
    return NextResponse.json({
      schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
      detail: "Failed to create user",
      status: 500,
    }, { status: 500 });
  }
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
