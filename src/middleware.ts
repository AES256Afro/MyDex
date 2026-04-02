import { NextRequest, NextResponse } from "next/server";

/**
 * Auth-only middleware. Security headers are handled by next.config.ts headers()
 * at the CDN level, avoiding per-request overhead in middleware.
 */

const publicPaths = [
  "/", "/login", "/register", "/forgot-password", "/reset-password", "/demo", "/licensing", "/contact",
  "/api/auth", "/api/register", "/api/health",
  "/api/v1/auth/forgot-password", "/api/v1/auth/reset-password",
  "/api/v1/agents/auth", "/api/v1/agents/telemetry", "/api/v1/agents/policy",
  "/api/v1/agents/devices", "/api/v1/agents/commands",
  "/api/v1/auth/mfa", // MFA endpoints
  "/api/v1/auth/sso", // SSO callbacks
  "/api/v1/account", // Account APIs (accessible to all authenticated)
  "/api/v1/integrations/webhook", // Slack/Teams incoming webhooks
  "/api/v1/security/cve/scan", // Agent CVE scanning (uses agent JWT)
  "/api/v1/security/ioc/lookup", // Agent IOC lookups (uses agent JWT)
  "/api/v1/agents/update-check", // Agent auto-update check
  "/mfa-verify", // MFA verification page
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public paths don't require session auth
  const isPublic = publicPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );

  if (isPublic) {
    return NextResponse.next();
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

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon\\.png|icon\\.svg|apple-icon\\.png|manifest\\.json|images|screenshots/).*)"],
};
