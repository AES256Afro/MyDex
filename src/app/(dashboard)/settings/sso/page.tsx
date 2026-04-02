"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
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
  Plus,
  Trash2,
  Power,
  PowerOff,
  ExternalLink,
  AlertTriangle,
  Check,
  Copy,
  Loader2,
  Building2,
  Globe,
  KeyRound,
} from "lucide-react";

interface SsoProvider {
  id: string;
  providerType: string;
  name: string;
  clientId: string;
  tenantId?: string;
  domain?: string;
  issuerUrl?: string;
  metadataUrl?: string;
  isActive: boolean;
  autoProvision: boolean;
  defaultRole: string;
  createdAt: string;
  updatedAt: string;
}

const PROVIDER_INFO: Record<string, {
  label: string;
  icon: React.ReactNode;
  color: string;
  helpUrl: string;
  fields: { key: string; label: string; placeholder: string; required?: boolean }[];
}> = {
  MICROSOFT_ENTRA: {
    label: "Microsoft Entra ID",
    icon: <Building2 className="h-5 w-5" />,
    color: "bg-blue-500",
    helpUrl: "https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app",
    fields: [
      { key: "tenantId", label: "Tenant ID", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", required: true },
      { key: "clientId", label: "Application (Client) ID", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", required: true },
      { key: "clientSecret", label: "Client Secret Value", placeholder: "Enter client secret", required: true },
    ],
  },
  OKTA: {
    label: "Okta",
    icon: <Shield className="h-5 w-5" />,
    color: "bg-indigo-500",
    helpUrl: "https://developer.okta.com/docs/guides/implement-oauth-for-okta/main/",
    fields: [
      { key: "domain", label: "Okta Domain", placeholder: "your-org.okta.com", required: true },
      { key: "clientId", label: "Client ID", placeholder: "0oaxxxxxxxxxxxxxxxxx", required: true },
      { key: "clientSecret", label: "Client Secret", placeholder: "Enter client secret", required: true },
      { key: "issuerUrl", label: "Issuer URL (optional)", placeholder: "https://your-org.okta.com/oauth2/default" },
    ],
  },
  GOOGLE_WORKSPACE: {
    label: "Google Workspace",
    icon: <Globe className="h-5 w-5" />,
    color: "bg-red-500",
    helpUrl: "https://developers.google.com/identity/protocols/oauth2",
    fields: [
      { key: "domain", label: "Workspace Domain", placeholder: "company.com", required: true },
      { key: "clientId", label: "Client ID", placeholder: "xxxx.apps.googleusercontent.com", required: true },
      { key: "clientSecret", label: "Client Secret", placeholder: "Enter client secret", required: true },
    ],
  },
  GITHUB: {
    label: "GitHub",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
      </svg>
    ),
    color: "bg-gray-800",
    helpUrl: "https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app",
    fields: [
      { key: "clientId", label: "Client ID", placeholder: "Iv1.xxxxxxxxxxxx", required: true },
      { key: "clientSecret", label: "Client Secret", placeholder: "Enter client secret", required: true },
    ],
  },
};

export default function SsoSettingsPage() {
  const [providers, setProviders] = useState<SsoProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // New provider form
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<string>("MICROSOFT_ENTRA");
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [formName, setFormName] = useState("");
  const [autoProvision, setAutoProvision] = useState(false);
  const [defaultRole, setDefaultRole] = useState("EMPLOYEE");

  const [copiedCallback, setCopiedCallback] = useState(false);

  useEffect(() => {
    fetchProviders();
  }, []);

  async function fetchProviders() {
    try {
      const res = await fetch("/api/v1/auth/sso");
      if (res.ok) {
        const data = await res.json();
        setProviders(data.providers || []);
      }
    } catch (e) {
      console.error("Failed to fetch SSO providers:", e);
    } finally {
      setLoading(false);
    }
  }

  async function saveProvider() {
    setError("");
    setSuccess("");
    setSaving(true);

    const info = PROVIDER_INFO[formType];
    // Validate required fields
    for (const field of info.fields) {
      if (field.required && !formData[field.key]?.trim()) {
        setError(`${field.label} is required`);
        setSaving(false);
        return;
      }
    }

    try {
      const res = await fetch("/api/v1/auth/sso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerType: formType,
          name: formName || info.label,
          clientId: formData.clientId,
          clientSecret: formData.clientSecret,
          tenantId: formData.tenantId,
          domain: formData.domain,
          issuerUrl: formData.issuerUrl,
          metadataUrl: formData.metadataUrl,
          autoProvision,
          defaultRole,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(`${info.label} SSO provider configured successfully`);
        setShowForm(false);
        setFormData({});
        setFormName("");
        fetchProviders();
      } else {
        setError(data.error || "Failed to save provider");
      }
    } catch {
      setError("Failed to save SSO provider");
    } finally {
      setSaving(false);
    }
  }

  async function toggleProvider(id: string, isActive: boolean) {
    try {
      await fetch("/api/v1/auth/sso", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !isActive }),
      });
      fetchProviders();
    } catch {
      setError("Failed to update provider");
    }
  }

  async function deleteProvider(id: string) {
    if (!confirm("Are you sure you want to remove this SSO provider? Users who signed in via this provider will need to use password authentication.")) {
      return;
    }
    try {
      await fetch(`/api/v1/auth/sso?id=${id}`, { method: "DELETE" });
      fetchProviders();
    } catch {
      setError("Failed to delete provider");
    }
  }

  const callbackUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/auth/callback`
    : "https://your-domain.com/api/auth/callback";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Single Sign-On (SSO)</h1>
          <p className="text-muted-foreground">
            Configure enterprise identity providers for your organization
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Provider
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 p-3 text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
          <Check className="h-4 w-4" />
          {success}
        </div>
      )}

      {/* Callback URL info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            OAuth Callback URL
          </CardTitle>
          <CardDescription>
            Use this URL when configuring your identity provider&apos;s redirect/callback URI
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-muted px-3 py-2 font-mono text-sm">
              {callbackUrl}
            </code>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                navigator.clipboard.writeText(callbackUrl);
                setCopiedCallback(true);
                setTimeout(() => setCopiedCallback(false), 2000);
              }}
            >
              {copiedCallback ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Add Provider Form */}
      {showForm && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle>Configure SSO Provider</CardTitle>
            <CardDescription>
              Connect an enterprise identity provider for single sign-on
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Provider type selector */}
            <div className="space-y-2">
              <Label>Identity Provider</Label>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(PROVIDER_INFO).map(([key, info]) => (
                  <button
                    key={key}
                    onClick={() => { setFormType(key); setFormData({}); }}
                    className={`flex items-center gap-3 rounded-lg border p-4 text-left transition-colors ${
                      formType === key
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <div className={`${info.color} text-white p-2 rounded-lg`}>
                      {info.icon}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{info.label}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Provider-specific fields */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">
                  {PROVIDER_INFO[formType].label} Configuration
                </Label>
                <a
                  href={PROVIDER_INFO[formType].helpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  Setup Guide <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <div className="space-y-2">
                <Label htmlFor="providerName">Display Name</Label>
                <Input
                  id="providerName"
                  placeholder={PROVIDER_INFO[formType].label}
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>

              {PROVIDER_INFO[formType].fields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={field.key}>
                    {field.label}
                    {field.required && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  <Input
                    id={field.key}
                    type={field.key.includes("secret") || field.key.includes("Secret") ? "password" : "text"}
                    placeholder={field.placeholder}
                    value={formData[field.key] || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, [field.key]: e.target.value })
                    }
                  />
                </div>
              ))}
            </div>

            <Separator />

            {/* Provisioning options */}
            <div className="space-y-4">
              <Label className="text-base font-medium">User Provisioning</Label>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="autoProvision"
                  checked={autoProvision}
                  onChange={(e) => setAutoProvision(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 dark:border-gray-600"
                />
                <Label htmlFor="autoProvision" className="text-sm font-normal">
                  Auto-provision new users (JIT) — automatically create accounts when users sign in for the first time
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultRole">Default Role for New Users</Label>
                <Select
                  id="defaultRole"
                  value={defaultRole}
                  onChange={(e) => setDefaultRole(e.target.value)}
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Admin</option>
                </Select>
              </div>
            </div>

            {/* Setup instructions for Entra ID */}
            {formType === "MICROSOFT_ENTRA" && (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                <Label className="text-sm font-medium">Quick Setup Steps:</Label>
                <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                  <li>Go to <strong>Azure Portal</strong> → Microsoft Entra ID → App registrations</li>
                  <li>Click <strong>New registration</strong>, name it &quot;MyDex SSO&quot;</li>
                  <li>Set Redirect URI to: <code className="bg-muted px-1 rounded">{callbackUrl}/microsoft-entra-id</code></li>
                  <li>Copy the <strong>Application (client) ID</strong> and <strong>Directory (tenant) ID</strong></li>
                  <li>Under Certificates & secrets, create a <strong>New client secret</strong></li>
                  <li>Paste all values above</li>
                </ol>
              </div>
            )}

            {formType === "OKTA" && (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                <Label className="text-sm font-medium">Quick Setup Steps:</Label>
                <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                  <li>Go to <strong>Okta Admin Console</strong> → Applications → Create App Integration</li>
                  <li>Select <strong>OIDC - OpenID Connect</strong>, then <strong>Web Application</strong></li>
                  <li>Set Sign-in redirect URI to: <code className="bg-muted px-1 rounded">{callbackUrl}/okta</code></li>
                  <li>Copy the <strong>Client ID</strong> and <strong>Client Secret</strong></li>
                  <li>Your Okta domain is visible in the URL (e.g., dev-12345.okta.com)</li>
                  <li>Paste all values above</li>
                </ol>
              </div>
            )}

            <div className="flex gap-3">
              <Button onClick={saveProvider} disabled={saving}>
                {saving ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                ) : (
                  <><Check className="mr-2 h-4 w-4" /> Save Provider</>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setFormData({});
                  setFormName("");
                  setError("");
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configured Providers */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Configured Providers</h2>

        {providers.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Shield className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">No SSO providers configured</h3>
              <p className="text-sm text-muted-foreground mt-1 text-center max-w-md">
                Add an identity provider to enable single sign-on for your organization.
                Supports Microsoft Entra ID, Okta, Google Workspace, and GitHub.
              </p>
              {!showForm && (
                <Button className="mt-4" onClick={() => setShowForm(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Provider
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          providers.map((provider) => {
            const info = PROVIDER_INFO[provider.providerType] || {
              label: provider.providerType,
              icon: <Shield className="h-5 w-5" />,
              color: "bg-gray-500",
            };
            return (
              <Card key={provider.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4">
                    <div className={`${info.color} text-white p-2.5 rounded-lg`}>
                      {info.icon}
                    </div>
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {provider.name}
                        <Badge variant={provider.isActive ? "default" : "outline"} className={provider.isActive ? "bg-green-500" : ""}>
                          {provider.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground space-x-3">
                        <span>Client ID: {provider.clientId.slice(0, 8)}...</span>
                        {provider.tenantId && (
                          <span>Tenant: {provider.tenantId.slice(0, 8)}...</span>
                        )}
                        {provider.domain && (
                          <span>Domain: {provider.domain}</span>
                        )}
                        {provider.autoProvision && (
                          <Badge variant="outline" className="text-xs">JIT Provisioning</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => toggleProvider(provider.id, provider.isActive)}
                      title={provider.isActive ? "Disable" : "Enable"}
                    >
                      {provider.isActive ? (
                        <PowerOff className="h-4 w-4 text-amber-500" />
                      ) : (
                        <Power className="h-4 w-4 text-green-500" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => deleteProvider(provider.id)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
