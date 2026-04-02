"use client";

import { useRequireRole } from "@/hooks/use-require-role";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ShieldCheck, Plus, Pencil, Trash2, X, ChevronRight,
  FileWarning, CreditCard, Mail, Database, KeyRound, Globe,
  FileText, HardDrive, AlertTriangle, Lightbulb, BookOpen,
  Loader2, Copy, CheckCircle, Info,
} from "lucide-react";

interface DlpPolicy {
  id: string;
  name: string;
  description: string | null;
  rules: unknown;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Example Policy Templates ───────────────────────────────────────────────

interface PolicyTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  category: "pii" | "financial" | "credentials" | "compliance" | "ip";
  rules: object[];
  severity: "high" | "medium" | "low";
}

const POLICY_TEMPLATES: PolicyTemplate[] = [
  {
    id: "tpl-ssn",
    name: "Social Security Numbers",
    description: "Detect SSN patterns (XXX-XX-XXXX) in files, messages, and clipboard activity to prevent PII leaks.",
    icon: FileWarning,
    color: "text-red-600 bg-red-100 dark:bg-red-900/40",
    category: "pii",
    severity: "high",
    rules: [
      { type: "regex", pattern: "\\b\\d{3}-\\d{2}-\\d{4}\\b", label: "SSN Format (XXX-XX-XXXX)" },
      { type: "regex", pattern: "\\b\\d{9}\\b", label: "SSN without dashes (9 digits)", context: "near keywords: SSN, social security" },
      { type: "action", on_match: "block_and_alert", notify: ["admin", "security_team"] },
    ],
  },
  {
    id: "tpl-credit-card",
    name: "Credit Card Numbers",
    description: "Flag credit card numbers (Visa, MasterCard, Amex) using Luhn-validated regex patterns.",
    icon: CreditCard,
    color: "text-orange-600 bg-orange-100 dark:bg-orange-900/40",
    category: "financial",
    severity: "high",
    rules: [
      { type: "regex", pattern: "\\b4[0-9]{12}(?:[0-9]{3})?\\b", label: "Visa card number" },
      { type: "regex", pattern: "\\b5[1-5][0-9]{14}\\b", label: "MasterCard number" },
      { type: "regex", pattern: "\\b3[47][0-9]{13}\\b", label: "American Express number" },
      { type: "regex", pattern: "\\b6(?:011|5[0-9]{2})[0-9]{12}\\b", label: "Discover card number" },
      { type: "action", on_match: "block_and_alert", notify: ["admin", "finance_team"] },
    ],
  },
  {
    id: "tpl-api-keys",
    name: "API Keys & Secrets",
    description: "Catch exposed API keys, tokens, and secrets from AWS, GitHub, Slack, Stripe, and other services.",
    icon: KeyRound,
    color: "text-purple-600 bg-purple-100 dark:bg-purple-900/40",
    category: "credentials",
    severity: "high",
    rules: [
      { type: "regex", pattern: "AKIA[0-9A-Z]{16}", label: "AWS Access Key ID" },
      { type: "regex", pattern: "ghp_[a-zA-Z0-9]{36}", label: "GitHub Personal Access Token" },
      { type: "regex", pattern: "xox[baprs]-[a-zA-Z0-9-]+", label: "Slack Token" },
      { type: "regex", pattern: "sk_live_[a-zA-Z0-9]{24,}", label: "Stripe Secret Key" },
      { type: "regex", pattern: "-----BEGIN (RSA |EC )?PRIVATE KEY-----", label: "Private Key File" },
      { type: "keyword", keywords: ["api_key", "api_secret", "access_token", "secret_key", "private_key"], context: "near assignment operators" },
      { type: "action", on_match: "block_and_alert", notify: ["admin", "security_team"], auto_revoke: false },
    ],
  },
  {
    id: "tpl-email-exfil",
    name: "Email Data Exfiltration",
    description: "Detect bulk email address extraction or forwarding of internal contacts to external destinations.",
    icon: Mail,
    color: "text-blue-600 bg-blue-100 dark:bg-blue-900/40",
    category: "pii",
    severity: "medium",
    rules: [
      { type: "threshold", pattern: "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}", min_matches: 10, label: "Bulk email addresses (10+ in single action)" },
      { type: "keyword", keywords: ["@company.com", "@corp.internal"], context: "in outbound transfers" },
      { type: "action", on_match: "alert", notify: ["admin"] },
    ],
  },
  {
    id: "tpl-hipaa",
    name: "HIPAA - Protected Health Info",
    description: "Monitor for medical record numbers, diagnosis codes, and patient identifiers to maintain HIPAA compliance.",
    icon: FileText,
    color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40",
    category: "compliance",
    severity: "high",
    rules: [
      { type: "keyword", keywords: ["patient id", "medical record", "diagnosis", "prescription", "health record", "PHI", "HIPAA"], case_sensitive: false },
      { type: "regex", pattern: "\\b[A-Z]{1,3}\\d{2,4}\\.?\\d{0,4}\\b", label: "ICD-10 diagnosis code pattern" },
      { type: "regex", pattern: "MRN[:\\s#]*\\d{6,10}", label: "Medical Record Number" },
      { type: "action", on_match: "block_and_alert", notify: ["admin", "compliance_officer"], log_full_content: true },
    ],
  },
  {
    id: "tpl-source-code",
    name: "Source Code & IP Theft",
    description: "Prevent proprietary source code from being uploaded to unauthorized cloud storage, paste sites, or personal repos.",
    icon: Database,
    color: "text-amber-600 bg-amber-100 dark:bg-amber-900/40",
    category: "ip",
    severity: "medium",
    rules: [
      { type: "file_extension", extensions: [".py", ".js", ".ts", ".java", ".go", ".rs", ".cpp", ".c", ".h", ".cs"], label: "Source code files" },
      { type: "keyword", keywords: ["proprietary", "confidential", "trade secret", "internal only", "do not distribute"], case_sensitive: false },
      { type: "destination", blocked_domains: ["pastebin.com", "hastebin.com", "ghostbin.com", "github.com/personal", "mega.nz", "mediafire.com"], label: "Unauthorized upload destinations" },
      { type: "action", on_match: "block_and_alert", notify: ["admin", "engineering_lead"] },
    ],
  },
  {
    id: "tpl-financial-docs",
    name: "Financial Documents",
    description: "Detect sensitive financial data like bank account numbers, routing numbers, and financial statements.",
    icon: Globe,
    color: "text-teal-600 bg-teal-100 dark:bg-teal-900/40",
    category: "financial",
    severity: "medium",
    rules: [
      { type: "keyword", keywords: ["bank account", "routing number", "wire transfer", "ACH", "SWIFT", "IBAN", "balance sheet", "P&L", "income statement"], case_sensitive: false },
      { type: "regex", pattern: "\\b\\d{9}\\b", label: "ABA Routing Number (9 digits)", context: "near banking keywords" },
      { type: "regex", pattern: "\\b[A-Z]{2}\\d{2}[A-Z0-9]{4}\\d{7}([A-Z0-9]?){0,16}\\b", label: "IBAN number" },
      { type: "action", on_match: "alert", notify: ["admin", "finance_team"] },
    ],
  },
  {
    id: "tpl-usb-block",
    name: "USB & Removable Media",
    description: "Monitor or block file transfers to USB drives and removable storage devices.",
    icon: HardDrive,
    color: "text-gray-600 bg-gray-100 dark:bg-gray-900/40",
    category: "ip",
    severity: "low",
    rules: [
      { type: "channel", channels: ["usb", "removable_media", "external_drive"], label: "Removable storage devices" },
      { type: "file_size", max_mb: 50, label: "Files larger than 50 MB" },
      { type: "action", on_match: "alert", notify: ["admin"], log_file_metadata: true },
    ],
  },
];

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  pii: { label: "PII Protection", color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
  financial: { label: "Financial", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300" },
  credentials: { label: "Credentials", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300" },
  compliance: { label: "Compliance", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" },
  ip: { label: "IP Protection", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
};

export default function DlpPoliciesPage() {
  const { authorized } = useRequireRole("ADMIN");

  const [policies, setPolicies] = useState<DlpPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formRules, setFormRules] = useState("[]");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Template state
  const [showTemplates, setShowTemplates] = useState(false);
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null);

  const fetchPolicies = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/security/dlp-policies");
      if (!res.ok) throw new Error("Failed to fetch policies");
      const data = await res.json();
      setPolicies(data.policies);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setFormName("");
    setFormDescription("");
    setFormRules("[]");
    setFormError(null);
  }

  function startEdit(policy: DlpPolicy) {
    setEditingId(policy.id);
    setFormName(policy.name);
    setFormDescription(policy.description ?? "");
    setFormRules(JSON.stringify(policy.rules, null, 2));
    setShowForm(true);
    setShowTemplates(false);
    setFormError(null);
  }

  function useTemplate(template: PolicyTemplate) {
    setFormName(template.name);
    setFormDescription(template.description);
    setFormRules(JSON.stringify(template.rules, null, 2));
    setShowForm(true);
    setShowTemplates(false);
    setEditingId(null);
    setFormError(null);
    setCopiedTemplate(template.id);
    setTimeout(() => setCopiedTemplate(null), 2000);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    let parsedRules: unknown;
    try {
      parsedRules = JSON.parse(formRules);
    } catch {
      setFormError("Rules must be valid JSON. Check for missing commas or brackets.");
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        name: formName,
        description: formDescription || undefined,
        rules: parsedRules,
      };

      let res: Response;
      if (editingId) {
        res = await fetch("/api/v1/security/dlp-policies", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingId, ...body }),
        });
      } else {
        res = await fetch("/api/v1/security/dlp-policies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save policy");
      }

      resetForm();
      fetchPolicies();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this policy?")) return;

    try {
      const res = await fetch("/api/v1/security/dlp-policies", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete policy");
      }

      fetchPolicies();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  async function handleToggleActive(id: string, currentActive: boolean) {
    try {
      const res = await fetch("/api/v1/security/dlp-policies", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !currentActive }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update policy");
      }

      fetchPolicies();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/security" className="hover:text-foreground transition-colors">Security</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">DLP Policies</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-blue-600" />
            DLP Policies
          </h1>
          <p className="text-muted-foreground mt-1 max-w-2xl">
            Data Loss Prevention policies monitor and protect sensitive data from leaving your organization.
            Define rules to detect PII, credentials, financial data, and intellectual property across your endpoints.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {!showForm && (
            <>
              <Button variant="outline" onClick={() => { setShowTemplates(!showTemplates); setShowForm(false); }}>
                <BookOpen className="h-4 w-4 mr-2" />
                Templates
              </Button>
              <Button onClick={() => { setShowForm(true); setShowTemplates(false); }}>
                <Plus className="h-4 w-4 mr-2" />
                New Policy
              </Button>
            </>
          )}
        </div>
      </div>

      {/* How it works explainer */}
      <Card className="border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20">
        <CardContent className="py-4">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200">How DLP Policies Work</h3>
              <div className="grid md:grid-cols-3 gap-4 text-xs text-blue-800 dark:text-blue-300">
                <div className="flex gap-2">
                  <span className="font-bold text-blue-600 shrink-0">1.</span>
                  <div><strong>Define Rules</strong> &mdash; Create patterns using regex, keywords, file types, or data thresholds to identify sensitive content.</div>
                </div>
                <div className="flex gap-2">
                  <span className="font-bold text-blue-600 shrink-0">2.</span>
                  <div><strong>Monitor Activity</strong> &mdash; The agent scans clipboard, file transfers, browser uploads, and app activity against your rules.</div>
                </div>
                <div className="flex gap-2">
                  <span className="font-bold text-blue-600 shrink-0">3.</span>
                  <div><strong>Alert or Block</strong> &mdash; When a match is found, the system can log it, send alerts, or block the action in real-time.</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto underline hover:no-underline text-xs">Dismiss</button>
        </div>
      )}

      {/* ═══ TEMPLATE PICKER ═══ */}
      {showTemplates && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                Policy Templates
              </span>
              <Button variant="ghost" size="sm" onClick={() => setShowTemplates(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Start from a pre-built template. Click &quot;Use Template&quot; to load it into the editor where you can customize it before saving.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {POLICY_TEMPLATES.map((tpl) => {
                const catInfo = CATEGORY_LABELS[tpl.category];
                return (
                  <div key={tpl.id} className="rounded-xl border overflow-hidden hover:border-blue-300 hover:shadow-sm transition-all">
                    <div className="p-4 space-y-2.5">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${tpl.color}`}>
                          <tpl.icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold">{tpl.name}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Badge className={`text-[9px] px-1.5 ${catInfo.color}`}>{catInfo.label}</Badge>
                            <Badge variant="outline" className={`text-[9px] px-1.5 ${
                              tpl.severity === "high" ? "text-red-700 border-red-300 dark:text-red-400" :
                              tpl.severity === "medium" ? "text-amber-700 border-amber-300 dark:text-amber-400" :
                              "text-gray-700 border-gray-300 dark:text-gray-400"
                            }`}>
                              {tpl.severity === "high" ? "High" : tpl.severity === "medium" ? "Medium" : "Low"} Severity
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{tpl.description}</p>
                      <details className="group">
                        <summary className="text-[11px] text-muted-foreground cursor-pointer hover:text-foreground flex items-center gap-1">
                          <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
                          Preview rules ({tpl.rules.length})
                        </summary>
                        <div className="mt-1.5 bg-gray-950 text-green-400 rounded-md px-3 py-2 font-mono text-[10px] overflow-x-auto max-h-32">
                          <pre className="whitespace-pre-wrap">{JSON.stringify(tpl.rules, null, 2)}</pre>
                        </div>
                      </details>
                    </div>
                    <div className="px-4 py-2.5 bg-muted/20 border-t">
                      <Button
                        size="sm"
                        className="w-full text-xs h-8"
                        onClick={() => useTemplate(tpl)}
                      >
                        {copiedTemplate === tpl.id ? (
                          <><CheckCircle className="h-3 w-3 mr-1.5" />Loaded into Editor</>
                        ) : (
                          <><Copy className="h-3 w-3 mr-1.5" />Use Template</>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-lg border border-dashed p-4 text-center bg-muted/10 mt-4">
              <p className="text-sm font-medium">Need a custom policy?</p>
              <p className="text-xs text-muted-foreground mt-1">Start from scratch with the blank editor.</p>
              <Button size="sm" className="mt-3" onClick={() => { setShowForm(true); setShowTemplates(false); }}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />Create Blank Policy
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ CREATE / EDIT FORM ═══ */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{editingId ? "Edit Policy" : "Create New Policy"}</span>
              <Button variant="ghost" size="sm" onClick={resetForm}>
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
            {!editingId && (
              <p className="text-sm text-muted-foreground">
                Define your policy rules below, or{" "}
                <button
                  className="text-blue-600 hover:underline font-medium"
                  onClick={() => { setShowTemplates(true); setShowForm(false); }}
                >
                  start from a template
                </button>.
              </p>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="policy-name">Policy Name</Label>
                  <Input
                    id="policy-name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g., Credit Card Number Detection"
                    required
                  />
                  <p className="text-[11px] text-muted-foreground">A short, descriptive name for this policy.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="policy-description">Description</Label>
                  <Input
                    id="policy-description"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="What this policy protects against"
                  />
                  <p className="text-[11px] text-muted-foreground">Explain what data this policy monitors and why.</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="policy-rules">Rules (JSON)</Label>
                  <button
                    type="button"
                    className="text-[11px] text-blue-600 hover:underline font-medium"
                    onClick={() => { setShowTemplates(true); setShowForm(false); }}
                  >
                    Browse templates
                  </button>
                </div>
                <textarea
                  id="policy-rules"
                  value={formRules}
                  onChange={(e) => setFormRules(e.target.value)}
                  rows={10}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
                  placeholder='[{"type": "keyword", "keywords": ["confidential", "secret"]}]'
                  required
                />
                <div className="rounded-md bg-muted/50 border p-3 space-y-1.5">
                  <p className="text-xs font-medium flex items-center gap-1.5"><Lightbulb className="h-3 w-3 text-amber-500" /> Rule Types Reference</p>
                  <div className="grid md:grid-cols-2 gap-x-6 gap-y-1 text-[11px] text-muted-foreground">
                    <div><code className="bg-muted px-1 rounded text-[10px]">regex</code> &mdash; Match content using regular expressions</div>
                    <div><code className="bg-muted px-1 rounded text-[10px]">keyword</code> &mdash; Match specific words or phrases</div>
                    <div><code className="bg-muted px-1 rounded text-[10px]">file_extension</code> &mdash; Match by file type (.docx, .csv, etc.)</div>
                    <div><code className="bg-muted px-1 rounded text-[10px]">threshold</code> &mdash; Trigger when N+ matches found at once</div>
                    <div><code className="bg-muted px-1 rounded text-[10px]">destination</code> &mdash; Block specific upload sites/domains</div>
                    <div><code className="bg-muted px-1 rounded text-[10px]">channel</code> &mdash; Monitor USB, email, cloud, or clipboard</div>
                    <div><code className="bg-muted px-1 rounded text-[10px]">action</code> &mdash; Define response: <em>alert</em>, <em>block</em>, or <em>block_and_alert</em></div>
                    <div><code className="bg-muted px-1 rounded text-[10px]">file_size</code> &mdash; Flag files above a size threshold</div>
                  </div>
                </div>
              </div>

              {formError && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {formError}
                </div>
              )}

              <div className="flex gap-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
                  ) : editingId ? (
                    "Update Policy"
                  ) : (
                    "Create Policy"
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ═══ POLICIES LIST ═══ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="h-5 w-5" />
            Active Policies
            <span className="text-sm font-normal text-muted-foreground">
              ({policies.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {policies.length === 0 ? (
            <div className="text-center py-12">
              <ShieldCheck className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium">No DLP policies configured</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                Create your first policy to start monitoring for sensitive data. Use a template to get started quickly.
              </p>
              <div className="flex gap-2 justify-center mt-4">
                <Button size="sm" variant="outline" onClick={() => { setShowTemplates(true); setShowForm(false); }}>
                  <BookOpen className="h-3.5 w-3.5 mr-1.5" />Browse Templates
                </Button>
                <Button size="sm" onClick={() => { setShowForm(true); setShowTemplates(false); }}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" />Create Policy
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {policies.map((policy) => (
                <div
                  key={policy.id}
                  className={`rounded-lg border p-4 transition-colors ${policy.isActive ? "border-l-4 border-l-green-500" : "opacity-60"}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{policy.name}</h3>
                        <Badge variant={policy.isActive ? "success" : "secondary"}>
                          {policy.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      {policy.description && (
                        <p className="text-sm text-muted-foreground">{policy.description}</p>
                      )}
                      <div className="text-[11px] text-muted-foreground">
                        Created {new Date(policy.createdAt).toLocaleDateString()} &bull; Updated {new Date(policy.updatedAt).toLocaleDateString()}
                      </div>
                      <details className="text-sm group">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs">
                          <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
                          View rules
                        </summary>
                        <pre className="mt-2 p-3 rounded-md bg-gray-950 text-green-400 text-[10px] font-mono overflow-x-auto max-h-48">
                          {JSON.stringify(policy.rules, null, 2)}
                        </pre>
                      </details>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleActive(policy.id, policy.isActive)}
                      >
                        {policy.isActive ? "Disable" : "Enable"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => startEdit(policy)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(policy.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
