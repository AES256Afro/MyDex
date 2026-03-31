import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { verifyRecoveryCode } from "@/lib/mfa";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

/**
 * POST /api/v1/auth/mfa/recovery
 * Verify a recovery code during login flow (user has authenticated but not passed MFA).
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const rateCheck = checkRateLimit(`mfa-recovery:${ip}`, RATE_LIMITS.mfa);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later.", retryAfter: rateCheck.retryAfterSeconds },
      { status: 429 }
    );
  }

  const body = await request.json();
  const { code } = body;

  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "Recovery code required" }, { status: 400 });
  }

  const valid = await verifyRecoveryCode(session.user.id, code);
  if (!valid) {
    return NextResponse.json({ error: "Invalid recovery code" }, { status: 401 });
  }

  // Recovery code verified -- clear pending, set verified cookie (same as MFA verify)
  const response = NextResponse.json({ success: true });
  response.cookies.set("mfa-pending", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  response.cookies.set("mfa-verified", "true", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  });
  return response;
}
