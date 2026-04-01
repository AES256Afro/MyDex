import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

const AGENT_JWT_SECRET = process.env.AGENT_JWT_SECRET || process.env.NEXTAUTH_SECRET;
if (!AGENT_JWT_SECRET) {
  throw new Error("AGENT_JWT_SECRET or NEXTAUTH_SECRET environment variable must be set");
}

interface AgentAuthResult {
  deviceId: string;
  organizationId: string;
  permissions: string[];
}

/**
 * Authenticate an agent request via JWT bearer token or API key.
 * Returns agent identity or null if authentication fails.
 */
export async function authenticateAgent(
  request: NextRequest
): Promise<AgentAuthResult | null> {
  const authHeader = request.headers.get("authorization");
  const apiKeyHeader = request.headers.get("x-api-key");

  // Try JWT first
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    return verifyAgentJwt(token);
  }

  // Fall back to API key
  if (apiKeyHeader?.startsWith("mdx_")) {
    return verifyApiKey(apiKeyHeader);
  }

  return null;
}

/**
 * Verify a JWT token and extract agent identity.
 */
async function verifyAgentJwt(token: string): Promise<AgentAuthResult | null> {
  try {
    const secret = new TextEncoder().encode(AGENT_JWT_SECRET);
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });

    if (
      payload.deviceId === undefined ||
      payload.deviceId === null ||
      !payload.organizationId ||
      typeof payload.organizationId !== "string"
    ) {
      return null;
    }

    return {
      deviceId: (payload.deviceId as string) || "",
      organizationId: payload.organizationId as string,
      permissions: Array.isArray(payload.permissions)
        ? (payload.permissions as string[])
        : [],
    };
  } catch {
    return null;
  }
}

/**
 * Verify an API key by hashing it and looking up in the database.
 */
async function verifyApiKey(apiKey: string): Promise<AgentAuthResult | null> {
  try {
    // Look up all active, non-expired keys matching the prefix
    const prefix = apiKey.slice(0, 8);
    const candidates = await prisma.agentApiKey.findMany({
      where: {
        keyPrefix: prefix,
        isActive: true,
        revokedAt: null,
      },
    });

    // Check each candidate against the provided key
    for (const candidate of candidates) {
      const matches = await bcrypt.compare(apiKey, candidate.keyHash);
      if (!matches) continue;

      // Check expiration
      if (candidate.expiresAt && candidate.expiresAt < new Date()) {
        return null;
      }

      // Update lastUsedAt
      await prisma.agentApiKey.update({
        where: { id: candidate.id },
        data: { lastUsedAt: new Date() },
      });

      return {
        deviceId: candidate.deviceId || "",
        organizationId: candidate.organizationId,
        permissions: Array.isArray(candidate.permissions)
          ? (candidate.permissions as string[])
          : [],
      };
    }

    return null;
  } catch (error) {
    console.error("Error verifying API key:", error);
    return null;
  }
}

/**
 * Generate a JWT for an authenticated agent, valid for 1 hour.
 */
export async function generateAgentJwt(
  deviceId: string,
  orgId: string,
  permissions: string[]
): Promise<string> {
  const secret = new TextEncoder().encode(AGENT_JWT_SECRET);

  const token = await new SignJWT({
    deviceId,
    organizationId: orgId,
    permissions,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .setSubject(deviceId)
    .sign(secret);

  return token;
}
