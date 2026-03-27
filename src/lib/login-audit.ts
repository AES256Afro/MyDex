import { prisma } from "@/lib/prisma";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

interface LoginAttemptData {
  email: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  failureReason?: string;
  mfaRequired?: boolean;
  mfaPassed?: boolean;
}

/**
 * Record a login attempt for audit purposes and brute-force detection.
 */
export async function recordLoginAttempt(data: LoginAttemptData) {
  try {
    await prisma.loginAttempt.create({
      data: {
        email: data.email,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
        success: data.success,
        failureReason: data.failureReason || null,
        mfaRequired: data.mfaRequired || false,
        mfaPassed: data.mfaPassed || false,
      },
    });
  } catch (error) {
    console.error("Failed to record login attempt:", error);
  }
}

/**
 * Check if a login attempt should be allowed based on rate limiting.
 * Blocks after too many failed attempts from the same IP or email.
 */
export function isLoginAllowed(email: string, ipAddress?: string): {
  allowed: boolean;
  reason?: string;
  retryAfterSeconds?: number;
} {
  // Check by email
  const emailCheck = checkRateLimit(`login:email:${email}`, RATE_LIMITS.login);
  if (!emailCheck.allowed) {
    return {
      allowed: false,
      reason: "Too many login attempts for this email. Please try again later.",
      retryAfterSeconds: emailCheck.retryAfterSeconds,
    };
  }

  // Check by IP
  if (ipAddress) {
    const ipCheck = checkRateLimit(`login:ip:${ipAddress}`, {
      maxRequests: 15,
      windowSeconds: 900,
    });
    if (!ipCheck.allowed) {
      return {
        allowed: false,
        reason: "Too many login attempts from this IP. Please try again later.",
        retryAfterSeconds: ipCheck.retryAfterSeconds,
      };
    }
  }

  return { allowed: true };
}

/**
 * Check if an account is locked due to excessive failed attempts.
 * Returns true if the account should be locked.
 */
export async function isAccountLocked(email: string): Promise<boolean> {
  const recentFailures = await prisma.loginAttempt.count({
    where: {
      email,
      success: false,
      createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) }, // last 30 min
    },
  });

  return recentFailures >= 10;
}
