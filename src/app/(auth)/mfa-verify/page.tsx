"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Shield, Loader2 } from "lucide-react";

export default function MfaVerifyPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <MfaVerifyForm />
    </Suspense>
  );
}

function MfaVerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawCallback = searchParams.get("callbackUrl") || "/dashboard";
  const callbackUrl = rawCallback.startsWith("/") && !rawCallback.startsWith("//") ? rawCallback : "/dashboard";
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [useBackup, setUseBackup] = useState(false);
  const [useRecovery, setUseRecovery] = useState(false);
  const [backupCode, setBackupCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  function handleDigitChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    // Auto-advance to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (value && index === 5 && newCode.every((d) => d !== "")) {
      submitCode(newCode.join(""));
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newCode = [...code];
    for (let i = 0; i < pasted.length; i++) {
      newCode[i] = pasted[i];
    }
    setCode(newCode);
    if (pasted.length === 6) {
      submitCode(pasted);
    } else {
      inputRefs.current[pasted.length]?.focus();
    }
  }

  async function submitCode(codeStr: string) {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/v1/auth/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: codeStr }),
      });

      const data = await res.json();

      if (res.ok) {
        router.push(callbackUrl);
      } else {
        setError(data.error || "Invalid code");
        setCode(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    } catch {
      setError("Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleBackupSubmit(e: React.FormEvent) {
    e.preventDefault();
    await submitCode(backupCode.trim());
  }

  async function handleRecoverySubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/v1/auth/mfa/recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: recoveryCode.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push(callbackUrl);
      } else {
        setError(data.error || "Invalid recovery code");
      }
    } catch {
      setError("Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-xl">Two-Factor Authentication</CardTitle>
          <CardDescription>
            {useRecovery
              ? "Enter one of your recovery codes (XXXX-XXXX)"
              : useBackup
              ? "Enter one of your backup codes"
              : "Enter the 6-digit code from your authenticator app"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive text-center">
              {error}
            </div>
          )}

          {useRecovery ? (
            <form onSubmit={handleRecoverySubmit} className="space-y-4">
              <Input
                type="text"
                placeholder="XXXX-XXXX"
                value={recoveryCode}
                onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
                className="text-center font-mono text-lg tracking-wider"
                disabled={loading}
                autoComplete="off"
              />
              <Button className="w-full" disabled={loading || !recoveryCode.trim()}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify Recovery Code"
                )}
              </Button>
            </form>
          ) : !useBackup ? (
            <>
              <div className="flex justify-center gap-2" onPaste={handlePaste}>
                {code.map((digit, index) => (
                  <Input
                    key={index}
                    ref={(el) => { inputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="h-14 w-12 text-center text-2xl font-mono"
                    disabled={loading}
                    autoComplete="off"
                  />
                ))}
              </div>

              <Button
                className="w-full"
                disabled={loading || code.some((d) => d === "")}
                onClick={() => submitCode(code.join(""))}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify"
                )}
              </Button>
            </>
          ) : (
            <form onSubmit={handleBackupSubmit} className="space-y-4">
              <Input
                type="text"
                placeholder="Enter backup code"
                value={backupCode}
                onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                className="text-center font-mono text-lg tracking-wider"
                disabled={loading}
                autoComplete="off"
              />
              <Button className="w-full" disabled={loading || !backupCode.trim()}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify Backup Code"
                )}
              </Button>
            </form>
          )}

          <div className="text-center space-y-1">
            {!useRecovery && (
              <button
                type="button"
                onClick={() => {
                  setUseBackup(!useBackup);
                  setUseRecovery(false);
                  setError("");
                }}
                className="text-sm text-muted-foreground hover:text-primary underline block mx-auto"
              >
                {useBackup ? "Use authenticator app instead" : "Use a backup code"}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setUseRecovery(!useRecovery);
                setUseBackup(false);
                setError("");
              }}
              className="text-sm text-muted-foreground hover:text-primary underline block mx-auto"
            >
              {useRecovery ? "Use authenticator app instead" : "Use a recovery code"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
