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
  User,
  Mail,
  Building2,
  Shield,
  ShieldCheck,
  ShieldX,
  Smartphone,
  Key,
  AlertTriangle,
  Check,
  Loader2,
  Eye,
  EyeOff,
  Copy,
  Lock,
  Briefcase,
} from "lucide-react";

export default function AccountPage() {
  const { data: session } = useSession();

  // Profile state
  const [name, setName] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // MFA state
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaLoading, setMfaLoading] = useState(true);
  const [backupCodesRemaining, setBackupCodesRemaining] = useState(0);
  const [setupStep, setSetupStep] = useState<"idle" | "qr" | "verify" | "done">("idle");
  const [qrCode, setQrCode] = useState("");
  const [mfaSecret, setMfaSecret] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verifyCode, setVerifyCode] = useState("");
  const [mfaError, setMfaError] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [copiedBackup, setCopiedBackup] = useState(false);

  useEffect(() => {
    if (session?.user?.name) setName(session.user.name);
    fetchMfaStatus();
  }, [session]);

  async function fetchMfaStatus() {
    try {
      const res = await fetch("/api/v1/auth/mfa");
      if (res.ok) {
        const data = await res.json();
        setMfaEnabled(data.enabled);
        setBackupCodesRemaining(data.backupCodesRemaining);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setMfaLoading(false);
    }
  }

  async function saveProfile() {
    setProfileSaving(true);
    setProfileSuccess(false);
    try {
      const res = await fetch("/api/v1/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        setProfileSuccess(true);
        setTimeout(() => setProfileSuccess(false), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setProfileSaving(false);
    }
  }

  async function changePassword() {
    setPasswordError("");
    setPasswordSuccess(false);

    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await fetch("/api/v1/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setPasswordSuccess(true);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setPasswordSuccess(false), 3000);
      } else {
        setPasswordError(data.error || "Failed to change password");
      }
    } catch {
      setPasswordError("Failed to change password");
    } finally {
      setPasswordSaving(false);
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
    if (!confirm("Disable two-factor authentication? This makes your account less secure.")) return;
    try {
      await fetch("/api/v1/auth/mfa", { method: "DELETE" });
      setMfaEnabled(false);
      setSetupStep("idle");
      setBackupCodesRemaining(0);
    } catch {
      setMfaError("Failed to disable MFA");
    }
  }

  const role = session?.user?.role || "EMPLOYEE";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">My Account</h1>
        <p className="text-muted-foreground">
          Manage your profile, password, and security settings
        </p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <div className="flex items-center gap-2 rounded-md border px-3 py-2 bg-muted/50">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{session?.user?.email}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Role</Label>
              <div className="flex items-center gap-2 rounded-md border px-3 py-2 bg-muted/50">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <Badge
                  variant="outline"
                  className={
                    role === "ADMIN" || role === "SUPER_ADMIN"
                      ? "border-red-300 text-red-700 dark:text-red-300"
                      : role === "MANAGER"
                      ? "border-amber-300 text-amber-700 dark:text-amber-300"
                      : "border-green-300 text-green-700 dark:text-green-300"
                  }
                >
                  {role.replace("_", " ")}
                </Badge>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Organization</Label>
              <div className="flex items-center gap-2 rounded-md border px-3 py-2 bg-muted/50">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {session?.user?.organizationId?.slice(0, 8)}...
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={saveProfile} disabled={profileSaving}>
              {profileSaving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
              ) : (
                "Save Changes"
              )}
            </Button>
            {profileSuccess && (
              <span className="text-sm text-green-600 flex items-center gap-1">
                <Check className="h-4 w-4" /> Profile updated
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Password Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Change Password
          </CardTitle>
          <CardDescription>
            Update your password. You&apos;ll need your current password to confirm.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {passwordError && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {passwordError}
            </div>
          )}
          {passwordSuccess && (
            <div className="rounded-md bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 p-3 text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
              <Check className="h-4 w-4" />
              Password changed successfully
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Min 8 characters"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>
          <Button
            onClick={changePassword}
            disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}
          >
            {passwordSaving ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Changing...</>
            ) : (
              "Change Password"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* MFA Card */}
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
                <CardTitle>Two-Factor Authentication</CardTitle>
                <CardDescription>
                  Protect your account with a TOTP authenticator app
                </CardDescription>
              </div>
            </div>
            {!mfaLoading && (
              <Badge
                variant={mfaEnabled ? "default" : "outline"}
                className={mfaEnabled ? "bg-green-500" : ""}
              >
                {mfaEnabled ? "Enabled" : "Disabled"}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {mfaLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {mfaError && (
                <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  {mfaError}
                </div>
              )}

              {/* Not set up */}
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
                          We strongly recommend enabling two-factor authentication to secure your account.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Smartphone className="h-4 w-4" />
                    Works with Google Authenticator, Microsoft Authenticator, Authy, or 1Password
                  </div>
                  <Button onClick={startMfaSetup}>
                    <Shield className="mr-2 h-4 w-4" />
                    Enable 2FA
                  </Button>
                </div>
              )}

              {/* QR step */}
              {setupStep === "qr" && (
                <div className="space-y-5">
                  <p className="text-sm text-muted-foreground">
                    <strong>Step 1:</strong> Scan this QR code with your authenticator app
                  </p>
                  <div className="flex justify-center">
                    <div className="rounded-lg border p-4 bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={qrCode} alt="MFA QR" className="h-52 w-52" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Manual entry key:</Label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 rounded bg-muted px-3 py-2 font-mono text-xs break-all">
                        {showSecret ? mfaSecret : "••••••••••••••••••••••••"}
                      </code>
                      <Button variant="outline" size="icon" onClick={() => setShowSecret(!showSecret)}>
                        {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  <p className="text-sm text-muted-foreground">
                    <strong>Step 2:</strong> Enter the 6-digit code from your app
                  </p>
                  <div className="flex items-center gap-3">
                    <Input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="000000"
                      value={verifyCode}
                      onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                      className="w-36 text-center font-mono text-lg tracking-widest"
                    />
                    <Button onClick={confirmMfa} disabled={verifyCode.length !== 6}>
                      Verify & Enable
                    </Button>
                  </div>
                  <Button variant="ghost" onClick={() => setSetupStep("idle")} className="text-muted-foreground">
                    Cancel
                  </Button>
                </div>
              )}

              {/* Done — backup codes */}
              {setupStep === "done" && backupCodes.length > 0 && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 p-4">
                    <p className="font-medium text-green-800 dark:text-green-200 flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5" />
                      2FA is now enabled!
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      Save these backup codes somewhere safe. Each can only be used once.
                    </p>
                  </div>
                  <div className="rounded-lg border p-4 bg-muted/50">
                    <div className="flex items-center justify-between mb-3">
                      <Label className="flex items-center gap-2">
                        <Key className="h-4 w-4" /> Backup Codes
                      </Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(backupCodes.join("\n"));
                          setCopiedBackup(true);
                          setTimeout(() => setCopiedBackup(false), 2000);
                        }}
                      >
                        {copiedBackup ? <><Check className="mr-1 h-3 w-3" /> Copied</> : <><Copy className="mr-1 h-3 w-3" /> Copy All</>}
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {backupCodes.map((code, i) => (
                        <code key={i} className="rounded bg-background px-3 py-1.5 font-mono text-sm text-center">
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
                    <p className="font-medium text-green-800 dark:text-green-200 flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5" />
                      Two-factor authentication is active
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      You have <strong>{backupCodesRemaining}</strong> backup codes remaining.
                    </p>
                  </div>
                  {backupCodesRemaining <= 2 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-3 flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                      <AlertTriangle className="h-4 w-4" />
                      Running low on backup codes. Regenerate to get new ones.
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
