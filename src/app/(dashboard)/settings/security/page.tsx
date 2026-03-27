"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Shield,
  ShieldCheck,
  ShieldX,
  Smartphone,
  Key,
  Copy,
  Check,
  AlertTriangle,
  Loader2,
  Eye,
  EyeOff,
  Clock,
  MapPin,
  Monitor,
} from "lucide-react";

interface LoginAttempt {
  id: string;
  email: string;
  ipAddress: string | null;
  userAgent: string | null;
  success: boolean;
  failureReason: string | null;
  mfaRequired: boolean;
  createdAt: string;
}

export default function SecuritySettingsPage() {
  const { data: session } = useSession();

  // MFA state
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaLoading, setMfaLoading] = useState(true);
  const [setupStep, setSetupStep] = useState<"idle" | "qr" | "verify" | "done">("idle");
  const [qrCode, setQrCode] = useState("");
  const [mfaSecret, setMfaSecret] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [backupCodesRemaining, setBackupCodesRemaining] = useState(0);
  const [verifyCode, setVerifyCode] = useState("");
  const [mfaError, setMfaError] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackup, setCopiedBackup] = useState(false);

  // Login history
  const [loginHistory, setLoginHistory] = useState<LoginAttempt[]>([]);
  const [loginStats, setLoginStats] = useState({ failedLast24h: 0, totalLast7d: 0 });

  useEffect(() => {
    fetchMfaStatus();
    fetchLoginHistory();
  }, []);

  async function fetchMfaStatus() {
    try {
      const res = await fetch("/api/v1/auth/mfa");
      if (res.ok) {
        const data = await res.json();
        setMfaEnabled(data.enabled);
        setBackupCodesRemaining(data.backupCodesRemaining);
      }
    } catch (e) {
      console.error("Failed to fetch MFA status:", e);
    } finally {
      setMfaLoading(false);
    }
  }

  async function fetchLoginHistory() {
    try {
      const res = await fetch("/api/v1/auth/login-history?limit=20");
      if (res.ok) {
        const data = await res.json();
        setLoginHistory(data.attempts || []);
        setLoginStats(data.stats || { failedLast24h: 0, totalLast7d: 0 });
      }
    } catch (e) {
      console.error("Failed to fetch login history:", e);
    }
  }

  async function startMfaSetup() {
    setMfaError("");
    try {
      const res = await fetch("/api/v1/auth/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setup" }),
      });
      const data = await res.json();
      if (res.ok) {
        setQrCode(data.qrCode);
        setMfaSecret(data.secret);
        setBackupCodes(data.backupCodes);
        setSetupStep("qr");
      } else {
        setMfaError(data.error || "Setup failed");
      }
    } catch {
      setMfaError("Failed to start MFA setup");
    }
  }

  async function confirmMfa() {
    setMfaError("");
    try {
      const res = await fetch("/api/v1/auth/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm", code: verifyCode }),
      });
      const data = await res.json();
      if (res.ok) {
        setMfaEnabled(true);
        setSetupStep("done");
        setBackupCodesRemaining(backupCodes.length);
      } else {
        setMfaError(data.error || "Invalid code");
      }
    } catch {
      setMfaError("Verification failed");
    }
  }

  async function disableMfa() {
    if (!confirm("Are you sure you want to disable two-factor authentication? This will make your account less secure.")) {
      return;
    }
    try {
      const res = await fetch("/api/v1/auth/mfa", { method: "DELETE" });
      if (res.ok) {
        setMfaEnabled(false);
        setSetupStep("idle");
        setBackupCodes([]);
        setBackupCodesRemaining(0);
      }
    } catch {
      setMfaError("Failed to disable MFA");
    }
  }

  function copyToClipboard(text: string, type: "secret" | "backup") {
    navigator.clipboard.writeText(text);
    if (type === "secret") {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } else {
      setCopiedBackup(true);
      setTimeout(() => setCopiedBackup(false), 2000);
    }
  }

  function parseUserAgent(ua: string | null): string {
    if (!ua) return "Unknown";
    if (ua.includes("Windows")) return "Windows";
    if (ua.includes("Mac")) return "macOS";
    if (ua.includes("Linux")) return "Linux";
    if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
    if (ua.includes("Android")) return "Android";
    return "Unknown";
  }

  if (mfaLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Security Settings</h1>
        <p className="text-muted-foreground">
          Manage two-factor authentication and review login activity
        </p>
      </div>

      {/* MFA Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {mfaEnabled ? (
                <ShieldCheck className="h-6 w-6 text-green-500" />
              ) : (
                <ShieldX className="h-6 w-6 text-amber-500" />
              )}
              <div>
                <CardTitle>Two-Factor Authentication (2FA)</CardTitle>
                <CardDescription>
                  Add an extra layer of security to your account using a TOTP authenticator app
                </CardDescription>
              </div>
            </div>
            <Badge variant={mfaEnabled ? "default" : "outline"} className={mfaEnabled ? "bg-green-500" : ""}>
              {mfaEnabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {mfaError && (
            <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {mfaError}
            </div>
          )}

          {/* Not yet set up */}
          {!mfaEnabled && setupStep === "idle" && (
            <div className="space-y-4">
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-200">
                      Your account is not protected with 2FA
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      Two-factor authentication adds an extra layer of security by requiring a code from your authenticator app in addition to your password.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Smartphone className="h-5 w-5 text-muted-foreground" />
                <div className="text-sm text-muted-foreground">
                  <strong>Compatible apps:</strong> Google Authenticator, Microsoft Authenticator, Authy, 1Password
                </div>
              </div>
              <Button onClick={startMfaSetup}>
                <Shield className="mr-2 h-4 w-4" />
                Enable Two-Factor Authentication
              </Button>
            </div>
          )}

          {/* QR Code step */}
          {setupStep === "qr" && (
            <div className="space-y-6">
              <div className="text-sm text-muted-foreground">
                <strong>Step 1:</strong> Scan this QR code with your authenticator app
              </div>

              <div className="flex justify-center">
                <div className="rounded-lg border p-4 bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrCode} alt="MFA QR Code" className="h-64 w-64" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  Or enter this secret manually:
                </Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded bg-muted px-3 py-2 font-mono text-sm">
                    {showSecret ? mfaSecret : "•".repeat(32)}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowSecret(!showSecret)}
                  >
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(mfaSecret, "secret")}
                  >
                    {copiedSecret ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  <strong>Step 2:</strong> Enter the 6-digit code from your authenticator app
                </div>
                <div className="flex items-center gap-3">
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                    className="w-40 text-center font-mono text-lg tracking-widest"
                  />
                  <Button
                    onClick={confirmMfa}
                    disabled={verifyCode.length !== 6}
                  >
                    Verify & Enable
                  </Button>
                </div>
              </div>

              <Button
                variant="ghost"
                onClick={() => setSetupStep("idle")}
                className="text-muted-foreground"
              >
                Cancel
              </Button>
            </div>
          )}

          {/* Done — show backup codes */}
          {setupStep === "done" && backupCodes.length > 0 && (
            <div className="space-y-4">
              <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-800 dark:text-green-200">
                      Two-factor authentication is now enabled!
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      Save your backup codes below in a secure location. Each code can only be used once.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-4 bg-muted/50">
                <div className="flex items-center justify-between mb-3">
                  <Label className="flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    Backup Codes
                  </Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(backupCodes.join("\n"), "backup")}
                  >
                    {copiedBackup ? (
                      <><Check className="mr-1 h-3 w-3 text-green-500" /> Copied</>
                    ) : (
                      <><Copy className="mr-1 h-3 w-3" /> Copy All</>
                    )}
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {backupCodes.map((code, i) => (
                    <code
                      key={i}
                      className="rounded bg-background px-3 py-1.5 font-mono text-sm text-center"
                    >
                      {code}
                    </code>
                  ))}
                </div>
              </div>

              <Button onClick={() => { setSetupStep("idle"); setBackupCodes([]); }}>
                Done
              </Button>
            </div>
          )}

          {/* Already enabled */}
          {mfaEnabled && setupStep === "idle" && (
            <div className="space-y-4">
              <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-800 dark:text-green-200">
                      Two-factor authentication is active
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      Your account is protected. You have{" "}
                      <strong>{backupCodesRemaining}</strong> backup codes remaining.
                    </p>
                  </div>
                </div>
              </div>

              {backupCodesRemaining <= 2 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-3">
                  <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="h-4 w-4" />
                    Low backup codes. Consider regenerating MFA to get new codes.
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={startMfaSetup}>
                  <Key className="mr-2 h-4 w-4" />
                  Regenerate
                </Button>
                <Button variant="destructive" onClick={disableMfa}>
                  <ShieldX className="mr-2 h-4 w-4" />
                  Disable 2FA
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Login History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Login Activity
          </CardTitle>
          <CardDescription>
            Recent sign-in attempts for {session?.user?.email}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="rounded-lg border p-4 text-center">
              <div className="text-2xl font-bold">{loginStats.totalLast7d}</div>
              <div className="text-sm text-muted-foreground">Sign-ins (7 days)</div>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <div className={`text-2xl font-bold ${loginStats.failedLast24h > 0 ? "text-red-500" : "text-green-500"}`}>
                {loginStats.failedLast24h}
              </div>
              <div className="text-sm text-muted-foreground">Failed (24h)</div>
            </div>
          </div>

          {/* History list */}
          <div className="space-y-2">
            {loginHistory.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                No login history available
              </p>
            ) : (
              loginHistory.map((attempt) => (
                <div
                  key={attempt.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-2.5 w-2.5 rounded-full ${
                        attempt.success ? "bg-green-500" : "bg-red-500"
                      }`}
                    />
                    <div>
                      <div className="text-sm font-medium flex items-center gap-2">
                        {attempt.success ? "Successful sign-in" : "Failed sign-in"}
                        {attempt.mfaRequired && (
                          <Badge variant="outline" className="text-xs">MFA</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {attempt.ipAddress && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {attempt.ipAddress}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Monitor className="h-3 w-3" />
                          {parseUserAgent(attempt.userAgent)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(attempt.createdAt).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Security Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Checklist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              {
                label: "Two-factor authentication",
                done: mfaEnabled,
                description: "Protect your account with TOTP",
              },
              {
                label: "Strong password",
                done: true,
                description: "Use 12+ characters with mixed case, numbers, and symbols",
              },
              {
                label: "SSO configuration",
                done: false,
                description: "Connect Microsoft Entra ID or Okta for enterprise SSO",
                link: "/settings/sso",
              },
              {
                label: "IP allowlisting",
                done: false,
                description: "Restrict access to trusted IP ranges",
              },
              {
                label: "Audit logging",
                done: true,
                description: "All actions are logged for compliance",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  {item.done ? (
                    <Check className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                  )}
                  <div>
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.description}
                    </div>
                  </div>
                </div>
                {!item.done && item.link && (
                  <a href={item.link}>
                    <Button variant="outline" size="sm">
                      Configure
                    </Button>
                  </a>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
