import { NextRequest, NextResponse } from "next/server";
import { applySecurityHeaders } from "@/lib/security-headers";

const publicPaths = [
  "/", "/login", "/register", "/forgot-password", "/demo",
  "/api/auth", "/api/register", "/api/health",
  "/api/v1/agents/auth", "/api/v1/agents/telemetry", "/api/v1/agents/policy",
  "/api/v1/agents/devices", "/api/v1/agents/commands",
  "/api/v1/auth/mfa/verify", // MFA verification during login flow
  "/api/v1/auth/sso/callback", // SSO callbacks
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Apply security headers to all responses
  const isPublic = publicPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );

  if (isPublic) {
    const response = NextResponse.next();
    return applySecurityHeaders(response);
  }

  // Check for session token (set by next-auth)
  const token =
    req.cookies.get("authjs.session-token")?.value ||
    req.cookies.get("__Secure-authjs.session-token")?.value;

  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check for MFA pending cookie — if MFA is required but not yet verified,
  // redirect to MFA verification page (except for MFA-related routes)
  const mfaPending = req.cookies.get("mfa-pending")?.value;
  if (mfaPending === "true" && !pathname.startsWith("/mfa-verify") && !pathname.startsWith("/api/v1/auth/mfa")) {
    const mfaUrl = new URL("/mfa-verify", req.url);
    return NextResponse.redirect(mfaUrl);
  }

  const response = NextResponse.next();
  return applySecurityHeaders(response);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images/).*)"],
};
