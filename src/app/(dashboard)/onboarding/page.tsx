"use client";

import { useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  User,
  Users,
  Mail,
  Plus,
  X,
  Download,
  Monitor,
  Apple,
  Terminal,
  Copy,
  Check,
  CheckCircle2,
  Shield,
  Eye,
  Camera,
  Globe,
  ArrowLeft,
  ArrowRight,
  Rocket,
  PartyPopper,
  LayoutDashboard,
  MonitorSmartphone,
  Settings,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface InvitedMember {
  id: string;
  email: string;
  role: string;
}

interface PolicyToggle {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const STEPS = [
  { number: 1, label: "Welcome" },
  { number: 2, label: "Invite Team" },
  { number: 3, label: "Deploy Agent" },
  { number: 4, label: "Configure Policies" },
  { number: 5, label: "Complete" },
];

const INSTALL_COMMANDS: Record<string, string> = {
  Windows: `# Run in PowerShell as Administrator
Invoke-WebRequest -Uri "https://dl.antifascist.work/agent/mydex-agent-latest.msi" -OutFile "$env:TEMP\\mydex-agent.msi"
Start-Process msiexec.exe -ArgumentList "/i $env:TEMP\\mydex-agent.msi /quiet ENROLLMENT_TOKEN=YOUR_TOKEN" -Wait`,
  macOS: `# Run in Terminal
curl -fsSL https://dl.antifascist.work/agent/install.sh | sudo bash -s -- --token YOUR_TOKEN`,
  Linux: `# Debian/Ubuntu
curl -fsSL https://dl.antifascist.work/agent/install.sh | sudo bash -s -- --token YOUR_TOKEN

# RHEL/Fedora
sudo rpm -i https://dl.antifascist.work/agent/mydex-agent-latest.rpm
mydex-agent enroll --token YOUR_TOKEN`,
};

const ROLE_OPTIONS = [
  { value: "ADMIN", label: "Admin" },
  { value: "MANAGER", label: "Manager" },
  { value: "VIEWER", label: "Viewer" },
];

// ─── Progress Bar ───────────────────────────────────────────────────────────

function ProgressBar({ currentStep }: { currentStep: number }) {
  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between mb-3">
        {STEPS.map((step) => {
          const isCompleted = currentStep > step.number;
          const isCurrent = currentStep === step.number;

          return (
            <div key={step.number} className="flex flex-col items-center flex-1">
              <div
                className={`flex items-center justify-center w-9 h-9 rounded-full text-sm font-semibold transition-all duration-200 ${
                  isCompleted
                    ? "bg-primary text-primary-foreground"
                    : isCurrent
                    ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : step.number}
              </div>
              <span
                className={`mt-1.5 text-xs font-medium hidden sm:block ${
                  isCurrent
                    ? "text-primary"
                    : isCompleted
                    ? "text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-500 ease-out"
          style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
        />
      </div>
    </div>
  );
}

// ─── Step 1: Welcome ────────────────────────────────────────────────────────

function StepWelcome({
  orgName,
  setOrgName,
  adminName,
  setAdminName,
  adminTitle,
  setAdminTitle,
}: {
  orgName: string;
  setOrgName: (v: string) => void;
  adminName: string;
  setAdminName: (v: string) => void;
  adminTitle: string;
  setAdminTitle: (v: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <Rocket className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Welcome to MyDex</h2>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">
          Let&apos;s get your organization set up. This wizard will walk you through
          the essentials in just a few minutes.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organization
          </CardTitle>
          <CardDescription>Confirm your organization name</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org-name">Organization Name</Label>
            <Input
              id="org-name"
              placeholder="Acme Corporation"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5" />
            Admin Profile
          </CardTitle>
          <CardDescription>Set up your administrator profile</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-name">Full Name</Label>
            <Input
              id="admin-name"
              placeholder="Jane Smith"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-title">Job Title (optional)</Label>
            <Input
              id="admin-title"
              placeholder="IT Director"
              value={adminTitle}
              onChange={(e) => setAdminTitle(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Step 2: Invite Team ────────────────────────────────────────────────────

function StepInviteTeam({
  members,
  onAdd,
  onRemove,
}: {
  members: InvitedMember[];
  onAdd: (email: string, role: string) => void;
  onRemove: (id: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("VIEWER");
  const [emailError, setEmailError] = useState("");

  const handleAdd = useCallback(() => {
    const trimmed = email.trim();
    if (!trimmed) return;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    if (members.some((m) => m.email.toLowerCase() === trimmed.toLowerCase())) {
      setEmailError("This email has already been added");
      return;
    }

    setEmailError("");
    onAdd(trimmed, role);
    setEmail("");
    setRole("VIEWER");
  }, [email, role, members, onAdd]);

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <Users className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Invite Your Team</h2>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">
          Add team members who will manage devices and view reports.
          You can always invite more people later.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add Team Members</CardTitle>
          <CardDescription>
            Enter an email address and select a role for each team member
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 space-y-1">
              <Input
                placeholder="colleague@company.com"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAdd();
                  }
                }}
              />
              {emailError && (
                <p className="text-sm text-destructive">{emailError}</p>
              )}
            </div>
            <Select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="sm:w-36"
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
            <Button onClick={handleAdd} className="sm:w-auto">
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>

          {members.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  {members.length} member{members.length !== 1 ? "s" : ""} invited
                </p>
                <div className="space-y-2">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between rounded-lg border px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{member.role}</Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => onRemove(member.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {members.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No members invited yet.</p>
              <p className="text-xs mt-1">You can skip this step and invite people later.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Step 3: Deploy Agent ───────────────────────────────────────────────────

function StepDeployAgent() {
  const [platform, setPlatform] = useState<string>("Windows");
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(INSTALL_COMMANDS[platform]).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [platform]);

  const platformTabs = [
    { key: "Windows", icon: Monitor, label: "Windows" },
    { key: "macOS", icon: Apple, label: "macOS" },
    { key: "Linux", icon: Terminal, label: "Linux" },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <Download className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Deploy the Agent</h2>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">
          Install the MyDex agent on your devices to start collecting data.
          Choose your platform below.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Installation Instructions</CardTitle>
          <CardDescription>
            Select a platform and run the install command on your target devices
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            {platformTabs.map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => setPlatform(key)}
                className={`flex items-center justify-center gap-2 flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all ${
                  platform === key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          <div className="relative">
            <pre className="rounded-lg bg-zinc-950 p-4 text-sm text-zinc-100 overflow-x-auto font-mono leading-relaxed">
              <code>{INSTALL_COMMANDS[platform]}</code>
            </pre>
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 h-8 px-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 mr-1" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 mr-1" />
                  Copy
                </>
              )}
            </Button>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/50">
            <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-200">
                Enrollment Token
              </p>
              <p className="text-blue-700 dark:text-blue-300 mt-1">
                Replace <code className="font-mono bg-blue-100 dark:bg-blue-900 px-1 rounded">YOUR_TOKEN</code> with
                your organization&apos;s enrollment token. You can find it in{" "}
                <span className="font-medium">Settings &gt; Agent Keys</span> after
                completing setup.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Step 4: Configure Policies ─────────────────────────────────────────────

function StepConfigurePolicies({
  policies,
  onToggle,
}: {
  policies: PolicyToggle[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <Shield className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Configure Policies</h2>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">
          Enable the monitoring features you need. All policies can be
          fine-tuned later in Settings.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Monitoring Policies</CardTitle>
          <CardDescription>
            Toggle each policy on or off. Changes are saved when you complete setup.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {policies.map((policy, index) => (
            <div key={policy.id}>
              {index > 0 && <Separator className="my-1" />}
              <div className="flex items-center justify-between py-4">
                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted shrink-0">
                    {policy.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{policy.label}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {policy.description}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={policy.enabled}
                  onClick={() => onToggle(policy.id)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    policy.enabled ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      policy.enabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Step 5: Complete ───────────────────────────────────────────────────────

function StepComplete({
  orgName,
  memberCount,
  enabledPolicies,
}: {
  orgName: string;
  memberCount: number;
  enabledPolicies: number;
}) {
  const links = [
    {
      href: "/dashboard",
      icon: LayoutDashboard,
      label: "Go to Dashboard",
      description: "View your organization overview",
    },
    {
      href: "/devices",
      icon: MonitorSmartphone,
      label: "Manage Devices",
      description: "See enrolled devices and their status",
    },
    {
      href: "/settings",
      icon: Settings,
      label: "Open Settings",
      description: "Fine-tune policies and preferences",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
          <PartyPopper className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">You&apos;re All Set!</h2>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">
          Your organization is ready to go. Here&apos;s a summary of what was configured.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Setup Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
              <span className="text-sm">
                Organization <span className="font-medium">&quot;{orgName || "Your Org"}&quot;</span> created
              </span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
              <span className="text-sm">
                {memberCount > 0 ? (
                  <>
                    <span className="font-medium">{memberCount}</span> team member
                    {memberCount !== 1 ? "s" : ""} invited
                  </>
                ) : (
                  "Team invitations skipped (invite later from Settings)"
                )}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
              <span className="text-sm">Agent deployment instructions reviewed</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
              <span className="text-sm">
                <span className="font-medium">{enabledPolicies}</span> monitoring
                {enabledPolicies !== 1 ? " policies" : " policy"} enabled
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">What&apos;s Next?</CardTitle>
          <CardDescription>Jump to any section to continue setting up</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {links.map(({ href, icon: Icon, label, description }) => (
              <a
                key={href}
                href={href}
                className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-accent"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 shrink-0">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </a>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Onboarding Page ───────────────────────────────────────────────────

export default function OnboardingPage() {
  const [step, setStep] = useState(1);

  // Step 1 state
  const [orgName, setOrgName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminTitle, setAdminTitle] = useState("");

  // Step 2 state
  const [members, setMembers] = useState<InvitedMember[]>([]);

  // Step 4 state
  const [policies, setPolicies] = useState<PolicyToggle[]>([
    {
      id: "activity-monitoring",
      label: "Activity Monitoring",
      description:
        "Track application usage, active/idle time, and productivity metrics across devices.",
      icon: <Eye className="h-5 w-5 text-muted-foreground" />,
      enabled: true,
    },
    {
      id: "screenshot-capture",
      label: "Screenshot Capture",
      description:
        "Periodically capture screen snapshots for compliance auditing and incident review.",
      icon: <Camera className="h-5 w-5 text-muted-foreground" />,
      enabled: false,
    },
    {
      id: "domain-blocking",
      label: "Domain Blocking",
      description:
        "Block access to categorized domains (social media, gambling, malware) at the agent level.",
      icon: <Globe className="h-5 w-5 text-muted-foreground" />,
      enabled: false,
    },
    {
      id: "usb-monitoring",
      label: "USB Device Monitoring",
      description:
        "Log and optionally restrict USB storage device connections on managed endpoints.",
      icon: <Shield className="h-5 w-5 text-muted-foreground" />,
      enabled: true,
    },
  ]);

  const handleAddMember = useCallback((email: string, role: string) => {
    setMembers((prev) => [
      ...prev,
      { id: crypto.randomUUID(), email, role },
    ]);
  }, []);

  const handleRemoveMember = useCallback((id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const handleTogglePolicy = useCallback((id: string) => {
    setPolicies((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p))
    );
  }, []);

  const canProceed = step === 1 ? orgName.trim() !== "" && adminName.trim() !== "" : true;
  const isLastStep = step === STEPS.length;

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        <ProgressBar currentStep={step} />

        {step === 1 && (
          <StepWelcome
            orgName={orgName}
            setOrgName={setOrgName}
            adminName={adminName}
            setAdminName={setAdminName}
            adminTitle={adminTitle}
            setAdminTitle={setAdminTitle}
          />
        )}

        {step === 2 && (
          <StepInviteTeam
            members={members}
            onAdd={handleAddMember}
            onRemove={handleRemoveMember}
          />
        )}

        {step === 3 && <StepDeployAgent />}

        {step === 4 && (
          <StepConfigurePolicies
            policies={policies}
            onToggle={handleTogglePolicy}
          />
        )}

        {step === 5 && (
          <StepComplete
            orgName={orgName}
            memberCount={members.length}
            enabledPolicies={policies.filter((p) => p.enabled).length}
          />
        )}

        {/* Navigation */}
        {!isLastStep && (
          <div className="flex items-center justify-between mt-8 pt-6 border-t">
            <Button
              variant="outline"
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 1}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            {step === 2 && (
              <span className="text-xs text-muted-foreground hidden sm:block">
                You can skip this step
              </span>
            )}

            <Button onClick={() => setStep((s) => s + 1)} disabled={!canProceed}>
              {step === STEPS.length - 1 ? "Finish Setup" : "Next"}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
