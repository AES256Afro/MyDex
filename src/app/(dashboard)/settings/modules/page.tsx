"use client";

import { useState, useEffect } from "react";
import { useRequireRole } from "@/hooks/use-require-role";
import { Button } from "@/components/ui/button";
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
  Blocks,
  Check,
  Loader2,
  AlertTriangle,
  Eye,
  EyeOff,
  Shield,
  LayoutDashboard,
  Clock,
  CalendarCheck,
  FolderKanban,
  Activity,
  Brain,
  Users,
  UserCog,
  Building2,
  BarChart3,
  Monitor,
  Server,
  Settings,
  ShieldCheck,
  KeyRound,
  User,
  type LucideIcon,
} from "lucide-react";
import { MODULE_REGISTRY, type ModuleConfig } from "@/lib/module-access";

const MODULE_ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  "time-tracking": Clock,
  attendance: CalendarCheck,
  projects: FolderKanban,
  "my-account": User,
  activity: Activity,
  productivity: Brain,
  employees: Users,
  "user-management": UserCog,
  departments: Building2,
  reports: BarChart3,
  devices: Monitor,
  "host-groups": Server,
  security: Shield,
  settings: Settings,
  "mfa-security": ShieldCheck,
  "sso-providers": KeyRound,
};

const CATEGORY_LABELS: Record<string, string> = {
  core: "Core Modules",
  monitoring: "Monitoring",
  management: "Management",
  security: "Security & Devices",
  admin: "Administration",
};

const ROLE_OPTIONS = [
  { value: "EMPLOYEE", label: "Employee" },
  { value: "MANAGER", label: "Manager" },
  { value: "ADMIN", label: "Admin" },
  { value: "SUPER_ADMIN", label: "Super Admin" },
];

interface ModuleOverride {
  enabled: boolean;
  minRole: string;
}

export default function ModuleAccessPage() {
  const { authorized } = useRequireRole("ADMIN");
  const [overrides, setOverrides] = useState<Record<string, ModuleOverride>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const res = await fetch("/api/v1/settings");
      if (res.ok) {
        const data = await res.json();
        const orgSettings = data.organization?.settings || {};
        setOverrides(orgSettings.moduleAccess || {});
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    setSaving(true);
    setError("");
    setSuccess(false);
    try {
      const res = await fetch("/api/v1/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: { moduleAccess: overrides },
        }),
      });
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save");
      }
    } catch {
      setError("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  function toggleModule(modId: string, mod: ModuleConfig) {
    const current = overrides[modId];
    if (current) {
      const newOverrides = { ...overrides };
      newOverrides[modId] = { ...current, enabled: !current.enabled };
      setOverrides(newOverrides);
    } else {
      setOverrides({
        ...overrides,
        [modId]: { enabled: false, minRole: mod.minRole },
      });
    }
  }

  function setMinRole(modId: string, role: string, mod: ModuleConfig) {
    const current = overrides[modId];
    setOverrides({
      ...overrides,
      [modId]: {
        enabled: current?.enabled ?? true,
        minRole: role || mod.minRole,
      },
    });
  }

  function isEnabled(modId: string): boolean {
    return overrides[modId]?.enabled !== false;
  }

  function getMinRole(modId: string, mod: ModuleConfig): string {
    return overrides[modId]?.minRole || mod.minRole;
  }

  // Group modules by category
  const categories = Object.keys(CATEGORY_LABELS);
  const grouped = categories.map((cat) => ({
    category: cat,
    label: CATEGORY_LABELS[cat],
    modules: MODULE_REGISTRY.filter((m) => m.category === cat),
  }));

  if (!authorized) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Blocks className="h-6 w-6" />
            Module Access Control
          </h1>
          <p className="text-muted-foreground">
            Configure which modules are visible to each role. Changes apply to all users in your organization.
          </p>
        </div>
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
          ) : (
            <><Check className="mr-2 h-4 w-4" /> Save Changes</>
          )}
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> {error}
        </div>
      )}
      {success && (
        <div className="rounded-md bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 p-3 text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
          <Check className="h-4 w-4" /> Module access settings saved
        </div>
      )}

      {/* Role preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Role Visibility Preview</CardTitle>
          <CardDescription>
            What each role sees with current settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {ROLE_OPTIONS.map((role) => {
              const roleLevel = { EMPLOYEE: 1, MANAGER: 2, ADMIN: 3, SUPER_ADMIN: 4 }[role.value] || 1;
              const visible = MODULE_REGISTRY.filter((mod) => {
                const override = overrides[mod.id];
                if (override?.enabled === false) return false;
                const reqLevel = { EMPLOYEE: 1, MANAGER: 2, ADMIN: 3, SUPER_ADMIN: 4 }[
                  override?.minRole || mod.minRole
                ] || 1;
                return roleLevel >= reqLevel;
              });
              return (
                <div key={role.value} className="rounded-lg border p-3">
                  <div className="font-medium text-sm mb-2">{role.label}</div>
                  <div className="text-2xl font-bold mb-1">{visible.length}</div>
                  <div className="text-xs text-muted-foreground">modules visible</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Module list by category */}
      {grouped.map((group) => (
        <Card key={group.category}>
          <CardHeader>
            <CardTitle className="text-lg">{group.label}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {group.modules.map((mod, idx) => {
              const Icon = MODULE_ICONS[mod.id] || LayoutDashboard;
              const enabled = isEnabled(mod.id);
              const minRole = getMinRole(mod.id, mod);

              return (
                <div key={mod.id}>
                  {idx > 0 && <Separator className="my-2" />}
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${enabled ? "bg-primary/10" : "bg-muted"}`}>
                        <Icon className={`h-4 w-4 ${enabled ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <div>
                        <div className="font-medium text-sm flex items-center gap-2">
                          {mod.label}
                          {!mod.configurable && (
                            <Badge variant="outline" className="text-xs">
                              {mod.minRole === "EMPLOYEE" ? "Always visible" : "Fixed"}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {mod.description}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {mod.configurable && (
                        <>
                          <Select
                            value={minRole}
                            onChange={(e) => setMinRole(mod.id, e.target.value, mod)}
                            className="w-32 text-sm"
                            disabled={!enabled}
                          >
                            {ROLE_OPTIONS.map((r) => (
                              <option key={r.value} value={r.value}>
                                {r.label}+
                              </option>
                            ))}
                          </Select>
                          <button
                            onClick={() => toggleModule(mod.id, mod)}
                            className={`p-2 rounded-lg transition-colors ${
                              enabled
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 hover:bg-green-200"
                                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 hover:bg-red-200"
                            }`}
                            title={enabled ? "Disable module" : "Enable module"}
                          >
                            {enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                          </button>
                        </>
                      )}
                      {!mod.configurable && (
                        <span className="text-xs text-muted-foreground capitalize">
                          {mod.minRole === "EMPLOYEE" ? "All roles" : mod.minRole.replace("_", " ").toLowerCase() + "+"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
