"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRequireRole } from "@/hooks/use-require-role";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Shield, Monitor, X, Upload, Plus, AlertTriangle, Key, ChevronRight } from "lucide-react";
import Link from "next/link";

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Australia/Sydney",
  "Pacific/Auckland",
];

interface OrgSettings {
  timezone?: string;
  workHoursStart?: string;
  workHoursEnd?: string;
  registrationMode?: "open" | "allowlist" | "closed";
  allowedEmails?: string[];
  allowedDomains?: string[];
  allowedDevices?: string[];
  deviceAllowlistEnabled?: boolean;
  requireApproval?: boolean;
}

export default function SettingsPage() {
  const { authorized } = useRequireRole("ADMIN");
  const { data: session } = useSession();
  const [orgName, setOrgName] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [workHoursStart, setWorkHoursStart] = useState("09:00");
  const [workHoursEnd, setWorkHoursEnd] = useState("17:00");

  // Access control state
  const [registrationMode, setRegistrationMode] = useState<"open" | "allowlist" | "closed">("open");
  const [allowedEmails, setAllowedEmails] = useState<string[]>([]);
  const [allowedDomains, setAllowedDomains] = useState<string[]>([]);
  const [requireApproval, setRequireApproval] = useState(false);
  const [allowedDevices, setAllowedDevices] = useState<string[]>([]);
  const [deviceAllowlistEnabled, setDeviceAllowlistEnabled] = useState(false);
  const [newDevice, setNewDevice] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [bulkInput, setBulkInput] = useState("");
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkType, setBulkType] = useState<"emails" | "domains" | "devices">("emails");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const res = await fetch("/api/v1/settings");
      if (res.ok) {
        const data = await res.json();
        const org = data.organization || data;
        setOrgName(org.name || "");
        const settings = (org.settings || {}) as OrgSettings;
        setTimezone(settings.timezone || "UTC");
        setWorkHoursStart(settings.workHoursStart || "09:00");
        setWorkHoursEnd(settings.workHoursEnd || "17:00");
        setRegistrationMode(settings.registrationMode || "open");
        setAllowedEmails(settings.allowedEmails || []);
        setAllowedDomains(settings.allowedDomains || []);
        setAllowedDevices(settings.allowedDevices || []);
        setDeviceAllowlistEnabled(settings.deviceAllowlistEnabled || false);
        setRequireApproval(settings.requireApproval || false);
      }
    } catch {
      // fallback to defaults
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/v1/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: orgName,
          settings: {
            timezone,
            workHoursStart,
            workHoursEnd,
            registrationMode,
            allowedEmails,
            allowedDomains,
            allowedDevices,
            deviceAllowlistEnabled,
            requireApproval,
          },
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save settings");
      }
      setMessage({ type: "success", text: "Settings saved successfully." });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setSaving(false);
    }
  }

  function addEmail() {
    const email = newEmail.trim().toLowerCase();
    if (email && email.includes("@") && !allowedEmails.includes(email)) {
      setAllowedEmails([...allowedEmails, email]);
      setNewEmail("");
    }
  }

  function removeEmail(email: string) {
    setAllowedEmails(allowedEmails.filter((e) => e !== email));
  }

  function addDomain() {
    const domain = newDomain.trim().toLowerCase().replace(/^@/, "");
    if (domain && domain.includes(".") && !allowedDomains.includes(domain)) {
      setAllowedDomains([...allowedDomains, domain]);
      setNewDomain("");
    }
  }

  function removeDomain(domain: string) {
    setAllowedDomains(allowedDomains.filter((d) => d !== domain));
  }

  function addDevice() {
    const device = newDevice.trim().toLowerCase();
    if (device && !allowedDevices.includes(device)) {
      setAllowedDevices([...allowedDevices, device]);
      setNewDevice("");
    }
  }

  function removeDevice(device: string) {
    setAllowedDevices(allowedDevices.filter((d) => d !== device));
  }

  function handleBulkImport() {
    const lines = bulkInput
      .split(/[\n,;]+/)
      .map((line) => line.trim().toLowerCase())
      .filter(Boolean);

    if (bulkType === "emails") {
      const validEmails = lines.filter((l) => l.includes("@") && l.includes("."));
      const unique = [...new Set([...allowedEmails, ...validEmails])];
      setAllowedEmails(unique);
    } else if (bulkType === "domains") {
      const validDomains = lines
        .map((l) => l.replace(/^@/, ""))
        .filter((l) => l.includes("."));
      const unique = [...new Set([...allowedDomains, ...validDomains])];
      setAllowedDomains(unique);
    } else {
      // devices — any non-empty string is a valid hostname/pattern
      const validDevices = lines.filter((l) => l.length > 0);
      const unique = [...new Set([...allowedDevices, ...validDevices])];
      setAllowedDevices(unique);
    }

    setBulkInput("");
    setShowBulkImport(false);
  }

  function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setBulkInput(text);
      }
    };
    reader.readAsText(file);
    // Reset input so the same file can be selected again
    e.target.value = "";
  }

  if (!authorized) return null;
  if (!session) return null;

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Organization Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your organization preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>Basic organization information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="orgName">Organization Name</Label>
            <Input
              id="orgName"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="My Organization"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Timezone & Work Hours</CardTitle>
          <CardDescription>
            Configure your organization timezone and standard work hours
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select
              id="timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </Select>
          </div>

          <Separator />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="workStart">Work Hours Start</Label>
              <Input
                id="workStart"
                type="time"
                value={workHoursStart}
                onChange={(e) => setWorkHoursStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workEnd">Work Hours End</Label>
              <Input
                id="workEnd"
                type="time"
                value={workHoursEnd}
                onChange={(e) => setWorkHoursEnd(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Access Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" /> Access Control
          </CardTitle>
          <CardDescription>
            Control who can register and sign in to your platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Registration Mode */}
          <div className="space-y-2">
            <Label htmlFor="regMode">Registration Mode</Label>
            <Select
              id="regMode"
              value={registrationMode}
              onChange={(e) => setRegistrationMode(e.target.value as "open" | "allowlist" | "closed")}
            >
              <option value="open">Open — Anyone can register</option>
              <option value="allowlist">Allowlist — Only approved emails/domains</option>
              <option value="closed">Closed — No new registrations</option>
            </Select>
            {registrationMode === "open" && (
              <p className="text-xs text-yellow-600 flex items-center gap-1 mt-1">
                <AlertTriangle className="h-3 w-3" />
                Anyone with the URL can create an account and organization
              </p>
            )}
            {registrationMode === "closed" && (
              <p className="text-xs text-muted-foreground mt-1">
                Only existing users can sign in. New accounts must be invited via Settings &gt; Team.
              </p>
            )}
          </div>

          {/* Require Approval */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="requireApproval"
              checked={requireApproval}
              onChange={(e) => setRequireApproval(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <div>
              <Label htmlFor="requireApproval" className="cursor-pointer">Require admin approval for new registrations</Label>
              <p className="text-xs text-muted-foreground">New users will be set to Inactive until manually approved</p>
            </div>
          </div>

          {registrationMode === "allowlist" && (
            <>
              <Separator />

              {/* Bulk Import Button */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setShowBulkImport(!showBulkImport); setBulkType("emails"); }}
                >
                  <Upload className="h-4 w-4 mr-1" /> Bulk Import
                </Button>
                {showBulkImport && (
                  <span className="text-xs text-muted-foreground">
                    Paste or upload a list of {bulkType}
                  </span>
                )}
              </div>

              {/* Bulk Import Panel */}
              {showBulkImport && (bulkType === "emails" || bulkType === "domains") && (
                <Card className="border-dashed">
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={bulkType === "emails" ? "default" : "ghost"}
                        onClick={() => setBulkType("emails")}
                      >
                        Emails
                      </Button>
                      <Button
                        size="sm"
                        variant={bulkType === "domains" ? "default" : "ghost"}
                        onClick={() => setBulkType("domains")}
                      >
                        Domains
                      </Button>
                    </div>
                    <textarea
                      className="w-full h-32 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      placeholder={
                        bulkType === "emails"
                          ? "Paste emails, one per line or comma-separated:\nuser1@company.com\nuser2@company.com\nuser3@company.com"
                          : "Paste domains, one per line or comma-separated:\ncompany.com\npartner.org"
                      }
                      value={bulkInput}
                      onChange={(e) => setBulkInput(e.target.value)}
                    />
                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={handleBulkImport} disabled={!bulkInput.trim()}>
                        <Plus className="h-4 w-4 mr-1" /> Add {bulkType === "emails" ? "Emails" : "Domains"}
                      </Button>
                      <label className="cursor-pointer">
                        <span className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 cursor-pointer">
                            <Upload className="h-4 w-4 mr-1" /> Upload CSV/TXT
                          </span>
                        <input
                          type="file"
                          accept=".csv,.txt,.tsv"
                          className="hidden"
                          onChange={handleFileImport}
                        />
                      </label>
                      <Button size="sm" variant="ghost" onClick={() => setShowBulkImport(false)}>
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Allowed Emails */}
              <div className="space-y-2">
                <Label>Allowed Emails ({allowedEmails.length})</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="user@example.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addEmail())}
                  />
                  <Button onClick={addEmail} size="sm" className="flex-shrink-0">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {allowedEmails.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2 max-h-40 overflow-y-auto p-2 border rounded-md bg-muted/30">
                    {allowedEmails.map((email) => (
                      <Badge key={email} variant="secondary" className="gap-1 pr-1">
                        {email}
                        <button
                          onClick={() => removeEmail(email)}
                          className="ml-1 rounded-full hover:bg-destructive/20 p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Allowed Domains */}
              <div className="space-y-2">
                <Label>Allowed Domains ({allowedDomains.length})</Label>
                <p className="text-xs text-muted-foreground">
                  Anyone with an email at these domains can register
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="company.com"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addDomain())}
                  />
                  <Button onClick={addDomain} size="sm" className="flex-shrink-0">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {allowedDomains.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2 max-h-40 overflow-y-auto p-2 border rounded-md bg-muted/30">
                    {allowedDomains.map((domain) => (
                      <Badge key={domain} variant="outline" className="gap-1 pr-1">
                        @{domain}
                        <button
                          onClick={() => removeDomain(domain)}
                          className="ml-1 rounded-full hover:bg-destructive/20 p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Device Allowlist */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" /> Device Allowlist
          </CardTitle>
          <CardDescription>
            Control which devices (by hostname) can connect via the desktop agent. Supports wildcards (e.g., <code>dev-*</code>).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="deviceAllowlistEnabled"
              checked={deviceAllowlistEnabled}
              onChange={(e) => setDeviceAllowlistEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <div>
              <Label htmlFor="deviceAllowlistEnabled" className="cursor-pointer">Enable device allowlist</Label>
              <p className="text-xs text-muted-foreground">When enabled, only listed hostnames can register as agents</p>
            </div>
          </div>

          {!deviceAllowlistEnabled && (
            <p className="text-xs text-yellow-600 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Device allowlist is disabled — any authenticated user can connect an agent from any device
            </p>
          )}

          {deviceAllowlistEnabled && (
            <>
              <Separator />

              {/* Bulk Import for Devices */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setShowBulkImport(!showBulkImport); setBulkType("devices"); }}
                >
                  <Upload className="h-4 w-4 mr-1" /> Bulk Import Devices
                </Button>
              </div>

              {/* Bulk Import Panel (shared, shows when bulkType is devices) */}
              {showBulkImport && bulkType === "devices" && (
                <Card className="border-dashed">
                  <CardContent className="pt-4 space-y-3">
                    <textarea
                      className="w-full h-32 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      placeholder={"Paste hostnames, one per line or comma-separated:\nDESKTOP-ABC123\nLAPTOP-XYZ789\ndev-*"}
                      value={bulkInput}
                      onChange={(e) => setBulkInput(e.target.value)}
                    />
                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={handleBulkImport} disabled={!bulkInput.trim()}>
                        <Plus className="h-4 w-4 mr-1" /> Add Devices
                      </Button>
                      <label className="cursor-pointer">
                        <span className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 cursor-pointer">
                            <Upload className="h-4 w-4 mr-1" /> Upload CSV/TXT
                          </span>
                        <input
                          type="file"
                          accept=".csv,.txt,.tsv"
                          className="hidden"
                          onChange={handleFileImport}
                        />
                      </label>
                      <Button size="sm" variant="ghost" onClick={() => setShowBulkImport(false)}>
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Allowed Devices List */}
              <div className="space-y-2">
                <Label>Allowed Devices ({allowedDevices.length})</Label>
                <p className="text-xs text-muted-foreground">
                  Enter hostnames or wildcard patterns. Use * for wildcards (e.g., DESKTOP-* matches all DESKTOP- prefixed machines).
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="DESKTOP-ABC123 or dev-*"
                    value={newDevice}
                    onChange={(e) => setNewDevice(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addDevice())}
                  />
                  <Button onClick={addDevice} size="sm" className="flex-shrink-0">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {allowedDevices.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2 max-h-40 overflow-y-auto p-2 border rounded-md bg-muted/30">
                    {allowedDevices.map((device) => (
                      <Badge key={device} variant="outline" className="gap-1 pr-1 font-mono text-xs">
                        {device}
                        <button
                          onClick={() => removeDevice(device)}
                          className="ml-1 rounded-full hover:bg-destructive/20 p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Agent API Keys */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" /> Agent API Keys
          </CardTitle>
          <CardDescription>
            Generate and manage API keys for the MyDex desktop agent
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/settings/agent-keys">
            <Button variant="outline" className="gap-2">
              Manage Agent Keys
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      <div className="flex items-center gap-4">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Settings"}
        </Button>
        {message && (
          <p
            className={`text-sm ${
              message.type === "success"
                ? "text-green-600"
                : "text-destructive"
            }`}
          >
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}
