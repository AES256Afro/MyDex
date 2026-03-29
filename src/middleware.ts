import { NextRequest, NextResponse } from "next/server";
import { applySecurityHeaders } from "@/lib/security-headers";

const publicPaths = [
  "/", "/login", "/register", "/forgot-password", "/demo", "/licensing", "/contact",
  "/api/auth", "/api/register", "/api/health",
  "/api/v1/agents/auth", "/api/v1/agents/telemetry", "/api/v1/agents/policy",
  "/api/v1/agents/devices", "/api/v1/agents/commands",
  "/api/v1/auth/mfa", // MFA endpoints
  "/api/v1/auth/sso", // SSO callbacks
  "/api/v1/account", // Account APIs (accessible to all authenticated)
  "/mfa-verify", // MFA verification page
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

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

  const response = NextResponse.next();
  return applySecurityHeaders(response);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images|screenshots/).*)"],
};
