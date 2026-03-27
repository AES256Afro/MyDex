import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { verifyMfaCode } from "@/lib/mfa";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

/**
 * POST /api/v1/auth/mfa/verify
 * Verify MFA code during login flow. This is a public route
 * (user has authenticated with password but not yet passed MFA).
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const rateCheck = checkRateLimit(`mfa-login:${ip}`, RATE_LIMITS.mfa);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later.", retryAfter: rateCheck.retryAfterSeconds },
      { status: 429 }
    );
  }

  const body = await request.json();
  const { code } = body;

  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "MFA code required" }, { status: 400 });
  }

  const valid = await verifyMfaCode(session.user.id, code);
  if (!valid) {
    return NextResponse.json({ error: "Invalid MFA code" }, { status: 400 });
  }

  // MFA verified — clear pending, set verified cookie
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
