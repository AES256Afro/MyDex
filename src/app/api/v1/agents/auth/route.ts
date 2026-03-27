import { prisma } from "@/lib/prisma";
import { generateAgentJwt } from "@/lib/agent-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

const authSchema = z.object({
  apiKey: z.string().min(1),
});

// POST - Agent presents API key, gets back JWT + device info
export async function POST(request: NextRequest) {
  // Rate limit agent auth
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateCheck = checkRateLimit(`agent-auth:${ip}`, RATE_LIMITS.agentAuth);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Rate limited. Try again later.", retryAfter: rateCheck.retryAfterSeconds },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const parsed = authSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { apiKey } = parsed.data;

    if (!apiKey.startsWith("mdx_")) {
      return NextResponse.json(
        { error: "Invalid API key format" },
        { status: 400 }
      );
    }

    // Look up candidates by prefix
    const prefix = apiKey.slice(0, 8);
    const candidates = await prisma.agentApiKey.findMany({
      where: {
        keyPrefix: prefix,
        isActive: true,
        revokedAt: null,
      },
    });

    let matchedKey: typeof candidates[0] | null = null;
    for (const candidate of candidates) {
      const matches = await bcrypt.compare(apiKey, candidate.keyHash);
      if (matches) {
        matchedKey = candidate;
        break;
      }
    }

    if (!matchedKey) {
      return NextResponse.json(
        { error: "Invalid or revoked API key" },
        { status: 401 }
      );
    }

    // Check expiration
    if (matchedKey.expiresAt && matchedKey.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "API key has expired" },
        { status: 401 }
      );
    }

    // Update lastUsedAt
    await prisma.agentApiKey.update({
      where: { id: matchedKey.id },
      data: { lastUsedAt: new Date() },
    });

    const deviceId = matchedKey.deviceId || "";
    const organizationId = matchedKey.organizationId;
    const permissions = Array.isArray(matchedKey.permissions)
      ? (matchedKey.permissions as string[])
      : [];

    // Generate JWT
    const token = await generateAgentJwt(deviceId, organizationId, permissions);

    // Get the latest policy version for this org
    const latestPolicy = await prisma.agentPolicy.findFirst({
      where: { organizationId, isActive: true },
      orderBy: { version: "desc" },
      select: { version: true },
    });

    return NextResponse.json({
      token,
      expiresIn: 3600,
      deviceId,
      organizationId,
      policyVersion: latestPolicy?.version ?? null,
    });
  } catch (error) {
    console.error("Error authenticating agent:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to authenticate agent", detail: message },
      { status: 500 }
    );
  }
}
