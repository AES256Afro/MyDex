import { prisma } from "@/lib/prisma";
import * as OTPAuth from "otpauth";
import bcrypt from "bcryptjs";
import crypto from "crypto";

/**
 * Generate a new TOTP secret for a user.
 * Returns the secret and a provisioning URI for QR code generation.
 */
export async function generateMfaSecret(userId: string, userEmail: string) {
  const totp = new OTPAuth.TOTP({
    issuer: "MyDex",
    label: userEmail,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: new OTPAuth.Secret({ size: 20 }),
  });

  const secret = totp.secret.base32;
  const uri = totp.toString();

  // Generate 10 backup codes
  const backupCodes: string[] = [];
  const hashedBackupCodes: string[] = [];
  for (let i = 0; i < 10; i++) {
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    backupCodes.push(code);
    hashedBackupCodes.push(await bcrypt.hash(code, 10));
  }

  // Upsert MFA credential (unverified until user confirms with a valid code)
  await prisma.mfaCredential.upsert({
    where: { userId },
    update: {
      secret,
      verified: false,
      backupCodes: hashedBackupCodes,
    },
    create: {
      userId,
      secret,
      verified: false,
      backupCodes: hashedBackupCodes,
    },
  });

  return { secret, uri, backupCodes };
}

/**
 * Verify a TOTP code against the user's stored secret.
 */
export async function verifyMfaCode(userId: string, code: string): Promise<boolean> {
  const credential = await prisma.mfaCredential.findUnique({
    where: { userId },
  });

  if (!credential) return false;

  // Try TOTP first
  const totp = new OTPAuth.TOTP({
    issuer: "MyDex",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(credential.secret),
  });

  const delta = totp.validate({ token: code, window: 1 });
  if (delta !== null) return true;

  // Try backup codes
  for (let i = 0; i < credential.backupCodes.length; i++) {
    const matches = await bcrypt.compare(code, credential.backupCodes[i]);
    if (matches) {
      // Remove used backup code
      const updatedCodes = [...credential.backupCodes];
      updatedCodes.splice(i, 1);
      await prisma.mfaCredential.update({
        where: { userId },
        data: { backupCodes: updatedCodes },
      });
      return true;
    }
  }

  return false;
}

/**
 * Confirm MFA setup by verifying a code and marking as verified.
 */
export async function confirmMfaSetup(userId: string, code: string): Promise<boolean> {
  const isValid = await verifyMfaCode(userId, code);
  if (!isValid) return false;

  await prisma.mfaCredential.update({
    where: { userId },
    data: { verified: true },
  });

  return true;
}

/**
 * Disable MFA for a user.
 */
export async function disableMfa(userId: string): Promise<void> {
  await prisma.mfaCredential.deleteMany({
    where: { userId },
  });
}

/**
 * Check if a user has MFA enabled (verified).
 */
export async function isMfaEnabled(userId: string): Promise<boolean> {
  const credential = await prisma.mfaCredential.findUnique({
    where: { userId },
  });
  return credential?.verified ?? false;
}

/**
 * Get remaining backup codes count.
 */
export async function getBackupCodesCount(userId: string): Promise<number> {
  const credential = await prisma.mfaCredential.findUnique({
    where: { userId },
  });
  return credential?.backupCodes.length ?? 0;
}
