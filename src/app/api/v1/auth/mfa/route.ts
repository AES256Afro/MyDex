import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { generateMfaSecret, confirmMfaSetup, disableMfa, isMfaEnabled, verifyMfaCode, getBackupCodesCount, getRecoveryCodesCount } from "@/lib/mfa";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import QRCode from "qrcode";

// GET — Check MFA status for the current user
export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const enabled = await isMfaEnabled(session.user.id);
  const backupCodesRemaining = enabled ? await getBackupCodesCount(session.user.id) : 0;
  const recoveryCodesRemaining = enabled ? await getRecoveryCodesCount(session.user.id) : 0;

  return NextResponse.json({
    enabled,
    backupCodesRemaining,
    recoveryCodesRemaining,
  });
}

// POST — Setup MFA (generate secret + QR code) or verify/confirm setup
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { action, code } = body;

  if (action === "setup") {
    // Generate new TOTP secret
    const { secret, uri, backupCodes, recoveryCodes } = await generateMfaSecret(
      session.user.id,
      session.user.email!
    );

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(uri, {
      width: 256,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    });

    return NextResponse.json({
      secret,
      qrCode: qrCodeDataUrl,
      backupCodes,
      recoveryCodes,
    });
  }

  if (action === "confirm") {
    // Rate limit MFA verification
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const rateCheck = checkRateLimit(`mfa:${ip}`, RATE_LIMITS.mfa);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Try again later.", retryAfter: rateCheck.retryAfterSeconds },
        { status: 429 }
      );
    }

    if (!code) {
      return NextResponse.json({ error: "Code required" }, { status: 400 });
    }

    const confirmed = await confirmMfaSetup(session.user.id, code);
    if (!confirmed) {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "MFA enabled successfully" });
  }

  if (action === "verify") {
    // Rate limit
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const rateCheck = checkRateLimit(`mfa:${ip}`, RATE_LIMITS.mfa);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many attempts", retryAfter: rateCheck.retryAfterSeconds },
        { status: 429 }
      );
    }

    if (!code) {
      return NextResponse.json({ error: "Code required" }, { status: 400 });
    }

    const valid = await verifyMfaCode(session.user.id, code);
    if (!valid) {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }

    // Set MFA verified — clear the mfa-pending cookie
    const response = NextResponse.json({ success: true });
    response.cookies.set("mfa-pending", "false", {
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

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

// DELETE — Disable MFA
export async function DELETE() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await disableMfa(session.user.id);
  return NextResponse.json({ success: true, message: "MFA disabled" });
}
