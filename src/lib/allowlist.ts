import { prisma } from "@/lib/prisma";

export type RegistrationMode = "open" | "allowlist" | "closed";

export interface AccessSettings {
  registrationMode?: RegistrationMode;
  allowedEmails?: string[];
  allowedDomains?: string[];
  allowedDevices?: string[];
  deviceAllowlistEnabled?: boolean;
  requireApproval?: boolean;
}

/**
 * Get the global access settings.
 * Uses the first organization's settings as the platform config,
 * or env vars for platform-level control.
 */
export async function getAccessSettings(): Promise<AccessSettings> {
  // Check environment variables first (platform-level override)
  const envMode = process.env.REGISTRATION_MODE as RegistrationMode | undefined;
  const envEmails = process.env.ALLOWED_EMAILS?.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  const envDomains = process.env.ALLOWED_DOMAINS?.split(",").map((d) => d.trim().toLowerCase()).filter(Boolean);
  const envDevices = process.env.ALLOWED_DEVICES?.split(",").map((d) => d.trim().toLowerCase()).filter(Boolean);

  if (envMode) {
    return {
      registrationMode: envMode,
      allowedEmails: envEmails || [],
      allowedDomains: envDomains || [],
      allowedDevices: envDevices || [],
      deviceAllowlistEnabled: process.env.DEVICE_ALLOWLIST_ENABLED === "true",
      requireApproval: process.env.REQUIRE_APPROVAL === "true",
    };
  }

  // Fall back to database settings from the first (primary) organization
  try {
    const org = await prisma.organization.findFirst({
      orderBy: { createdAt: "asc" },
      select: { settings: true },
    });

    const settings = (org?.settings as Record<string, unknown>) || {};
    return {
      registrationMode: (settings.registrationMode as RegistrationMode) || "open",
      allowedEmails: (settings.allowedEmails as string[]) || [],
      allowedDomains: (settings.allowedDomains as string[]) || [],
      allowedDevices: (settings.allowedDevices as string[]) || [],
      deviceAllowlistEnabled: (settings.deviceAllowlistEnabled as boolean) || false,
      requireApproval: (settings.requireApproval as boolean) || false,
    };
  } catch {
    return { registrationMode: "open", allowedEmails: [], allowedDomains: [], allowedDevices: [], deviceAllowlistEnabled: false };
  }
}

/**
 * Check if an email is allowed to register or login.
 */
export async function isEmailAllowed(email: string): Promise<{ allowed: boolean; reason?: string }> {
  const settings = await getAccessSettings();
  const normalizedEmail = email.toLowerCase().trim();
  const domain = normalizedEmail.split("@")[1];

  // Open mode — anyone can register
  if (settings.registrationMode === "open") {
    return { allowed: true };
  }

  // Closed mode — no new registrations at all
  if (settings.registrationMode === "closed") {
    return { allowed: false, reason: "Registration is currently closed" };
  }

  // Allowlist mode — check email and domain
  if (settings.registrationMode === "allowlist") {
    const emails = (settings.allowedEmails || []).map((e) => e.toLowerCase());
    const domains = (settings.allowedDomains || []).map((d) => d.toLowerCase());

    // Check exact email match
    if (emails.includes(normalizedEmail)) {
      return { allowed: true };
    }

    // Check domain match
    if (domain && domains.includes(domain)) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: "Your email is not on the allowed list. Contact your administrator.",
    };
  }

  return { allowed: true };
}

/**
 * Check if a device hostname is allowed to connect.
 */
export async function isDeviceAllowed(hostname: string): Promise<{ allowed: boolean; reason?: string }> {
  const settings = await getAccessSettings();

  // If device allowlist is not enabled, allow all devices
  if (!settings.deviceAllowlistEnabled) {
    return { allowed: true };
  }

  const allowedDevices = (settings.allowedDevices || []).map((d) => d.toLowerCase());

  // If the allowlist is enabled but empty, block all (misconfiguration protection)
  if (allowedDevices.length === 0) {
    return { allowed: false, reason: "Device allowlist is enabled but no devices are configured. Contact your administrator." };
  }

  const normalizedHostname = hostname.toLowerCase().trim();

  // Check exact hostname match
  if (allowedDevices.includes(normalizedHostname)) {
    return { allowed: true };
  }

  // Check wildcard patterns (e.g., "dev-*" matches "dev-pc01")
  for (const pattern of allowedDevices) {
    if (pattern.includes("*")) {
      const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$", "i");
      if (regex.test(normalizedHostname)) {
        return { allowed: true };
      }
    }
  }

  return {
    allowed: false,
    reason: "This device is not on the allowed list. Contact your administrator.",
  };
}

/**
 * Check if a new registration needs admin approval.
 */
export async function needsApproval(): Promise<boolean> {
  const settings = await getAccessSettings();
  return settings.requireApproval || false;
}
