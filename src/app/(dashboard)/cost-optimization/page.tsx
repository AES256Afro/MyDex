"use client";

import { useRequireRole } from "@/hooks/use-require-role";
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Plus, Trash2, X, Pencil, DollarSign, Package, BarChart3 } from "lucide-react";

interface License {
  id: string;
  application: string;
  vendor: string | null;
  totalSeats: number;
  usedSeats: number;
  costPerSeat: number;
  billingCycle: string;
  renewalDate: string | null;
  category: string | null;
  notes: string | null;
  isActive: boolean;
}

interface BudgetEntry {
  id: string;
  category: string;
  description: string;
  amount: number;
  type: string;
  period: string;
  isRecurring: boolean;
  notes: string | null;
}

const BUDGET_CATEGORIES = ["software", "hardware", "services", "personnel", "infrastructure", "other"];
const LICENSE_CATEGORIES = ["productivity", "security", "development", "communication", "design", "analytics", "other"];

export default function CostOptimizationPage() {
  const { authorized } = useRequireRole("ADMIN");
  if (!authorized) return null;

  const [licenses, setLicenses] = useState<License[]>([]);
  const [budgetEntries, setBudgetEntries] = useState<BudgetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "licenses" | "budget">("overview");

  // License form
  const [showLicenseForm, setShowLicenseForm] = useState(false);
  const [editingLicense, setEditingLicense] = useState<License | null>(null);
  const [licApp, setLicApp] = useState("");
  const [licVendor, setLicVendor] = useState("");
  const [licTotal, setLicTotal] = useState("");
  const [licUsed, setLicUsed] = useState("");
  const [licCost, setLicCost] = useState("");
  const [licCycle, setLicCycle] = useState("monthly");
  const [licCategory, setLicCategory] = useState("");
  const [licRenewal, setLicRenewal] = useState("");
  const [licSaving, setLicSaving] = useState(false);

  // Budget form
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [budCat, setBudCat] = useState("software");
  const [budDesc, setBudDesc] = useState("");
  const [budAmount, setBudAmount] = useState("");
  const [budType, setBudType] = useState("actual");
  const [budPeriod, setBudPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [budRecurring, setBudRecurring] = useState(false);
  const [budSaving, setBudSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [licRes, budRes] = await Promise.all([
        fetch("/api/v1/cost-optimization/licenses"),
        fetch("/api/v1/cost-optimization/budget"),
      ]);
      if (licRes.ok) { const d = await licRes.json(); setLicenses(d.licenses); }
      if (budRes.ok) { const d = await budRes.json(); setBudgetEntries(d.entries); }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetLicenseForm = () => {
    setLicApp(""); setLicVendor(""); setLicTotal(""); setLicUsed("");
    setLicCost(""); setLicCycle("monthly"); setLicCategory(""); setLicRenewal("");
    setEditingLicense(null); setShowLicenseForm(false);
  };

  const startEditLicense = (l: License) => {
    setLicApp(l.application); setLicVendor(l.vendor || "");
    setLicTotal(String(l.totalSeats)); setLicUsed(String(l.usedSeats));
    setLicCost(String(l.costPerSeat)); setLicCycle(l.billingCycle);
    setLicCategory(l.category || ""); setLicRenewal(l.renewalDate?.slice(0, 10) || "");
    setEditingLicense(l); setShowLicenseForm(true);
  };

  const saveLicense = async () => {
    if (!licApp || !licTotal || !licCost) return;
    setLicSaving(true);
    try {
      const payload = {
        application: licApp, vendor: licVendor || undefined,
        totalSeats: parseInt(licTotal), usedSeats: parseInt(licUsed) || 0,
        costPerSeat: parseFloat(licCost), billingCycle: licCycle,
        category: licCategory || undefined, renewalDate: licRenewal || undefined,
      };
      const res = editingLicense
        ? await fetch("/api/v1/cost-optimization/licenses", {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: editingLicense.id, ...payload }),
          })
        : await fetch("/api/v1/cost-optimization/licenses", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      if (res.ok) { resetLicenseForm(); fetchData(); }
    } catch { /* ignore */ } finally { setLicSaving(false); }
  };

  const deleteLicense = async (id: string) => {
    if (!confirm("Delete this license entry?")) return;
    try {
      const res = await fetch(`/api/v1/cost-optimization/licenses?id=${id}`, { method: "DELETE" });
      if (res.ok) fetchData();
    } catch { /* ignore */ }
  };

  const saveBudgetEntry = async () => {
    if (!budDesc || !budAmount) return;
    setBudSaving(true);
    try {
      const res = await fetch("/api/v1/cost-optimization/budget", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: budCat, description: budDesc,
          amount: parseFloat(budAmount), type: budType,
          period: budPeriod, isRecurring: budRecurring,
        }),
      });
      if (res.ok) {
        setBudDesc(""); setBudAmount(""); setShowBudgetForm(false); fetchData();
      }
    } catch { /* ignore */ } finally { setBudSaving(false); }
  };

  const deleteBudgetEntry = async (id: string) => {
    if (!confirm("Delete this budget entry?")) return;
    try {
      const res = await fetch(`/api/v1/cost-optimization/budget?id=${id}`, { method: "DELETE" });
      if (res.ok) fetchData();
    } catch { /* ignore */ }
  };

  // Calculations
  const totalLicenseSpend = licenses.filter(l => l.isActive).reduce((sum, l) => {
    const monthly = l.billingCycle === "annual" ? l.costPerSeat / 12 : l.costPerSeat;
    return sum + monthly * l.totalSeats;
  }, 0);
  const unusedLicenses = licenses.filter(l => l.isActive).reduce((sum, l) => sum + (l.totalSeats - l.usedSeats), 0);
  const potentialSavings = licenses.filter(l => l.isActive).reduce((sum, l) => {
    const monthly = l.billingCycle === "annual" ? l.costPerSeat / 12 : l.costPerSeat;
    return sum + monthly * (l.totalSeats - l.usedSeats);
  }, 0);
  const avgUtilization = licenses.length > 0
    ? Math.round(licenses.filter(l => l.isActive).reduce((sum, l) => sum + (l.usedSeats / l.totalSeats) * 100, 0) / Math.max(licenses.filter(l => l.isActive).length, 1))
    : 0;

  const totalBudgetActual = budgetEntries.filter(e => e.type === "actual").reduce((s, e) => s + e.amount, 0);
  const totalBudgetForecast = budgetEntries.filter(e => e.type === "forecast").reduce((s, e) => s + e.amount, 0);
  const totalBudgetPlanned = budgetEntries.filter(e => e.type === "budget").reduce((s, e) => s + e.amount, 0);

  const budgetByCategory = BUDGET_CATEGORIES.map(cat => ({
    category: cat,
    actual: budgetEntries.filter(e => e.category === cat && e.type === "actual").reduce((s, e) => s + e.amount, 0),
    budget: budgetEntries.filter(e => e.category === cat && e.type === "budget").reduce((s, e) => s + e.amount, 0),
  })).filter(c => c.actual > 0 || c.budget > 0);

  if (loading) return <div className="p-6 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6" /> IT Cost Optimization
          </h1>
          <p className="text-muted-foreground text-sm">Track software licenses, IT budgets, and identify cost savings</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {(["overview", "licenses", "budget"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >{tab === "overview" ? "Overview" : tab === "licenses" ? "Software Licenses" : "IT Budget"}</button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              { label: "Total license spend", value: `$${totalLicenseSpend.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/mo`, color: "text-blue-600 dark:text-blue-400", icon: DollarSign },
              { label: "Unused licenses", value: String(unusedLicenses), color: "text-red-500 dark:text-red-400", icon: Package },
              { label: "Potential savings", value: `$${potentialSavings.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/mo`, color: "text-green-600 dark:text-green-400", icon: TrendingUp },
              { label: "Avg utilization", value: `${avgUtilization}%`, color: "text-orange-500 dark:text-orange-400", icon: BarChart3 },
            ].map(kpi => (
              <Card key={kpi.label}>
                <CardContent className="pt-5 text-center">
                  <kpi.icon className={`h-5 w-5 mx-auto mb-2 ${kpi.color}`} />
                  <div className={`text-3xl font-bold ${kpi.color}`}>{kpi.value}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">{kpi.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {licenses.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-lg">License Utilization</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left p-3 font-medium text-muted-foreground">Application</th>
                        <th className="text-center p-3 font-medium text-muted-foreground">Total</th>
                        <th className="text-center p-3 font-medium text-muted-foreground">Used</th>
                        <th className="text-center p-3 font-medium text-muted-foreground">Unused</th>
                        <th className="text-center p-3 font-medium text-muted-foreground">Utilization</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">Cost/seat</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">Waste/mo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {licenses.filter(l => l.isActive).map(l => {
                        const unused = l.totalSeats - l.usedSeats;
                        const util = Math.round((l.usedSeats / l.totalSeats) * 100);
                        const monthly = l.billingCycle === "annual" ? l.costPerSeat / 12 : l.costPerSeat;
                        return (
                          <tr key={l.id} className="border-b last:border-0 hover:bg-muted/50">
                            <td className="p-3">
                              <div className="font-medium">{l.application}</div>
                              {l.vendor && <div className="text-xs text-muted-foreground">{l.vendor}</div>}
                            </td>
                            <td className="p-3 text-center">{l.totalSeats}</td>
                            <td className="p-3 text-center text-green-600 dark:text-green-400">{l.usedSeats}</td>
                            <td className="p-3 text-center text-red-500 dark:text-red-400">{unused}</td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-16 bg-muted rounded-full h-1.5">
                                  <div className={`h-1.5 rounded-full ${util >= 80 ? "bg-green-500" : util >= 60 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${util}%` }} />
                                </div>
                                <span className="text-xs">{util}%</span>
                              </div>
                            </td>
                            <td className="p-3 text-right">${l.costPerSeat}{l.billingCycle === "annual" ? "/yr" : "/mo"}</td>
                            <td className="p-3 text-right font-medium text-red-500 dark:text-red-400">${(unused * monthly).toFixed(0)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {budgetByCategory.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Budget by Category</CardTitle></CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border p-4 text-center">
                    <div className="text-[11px] text-muted-foreground mb-1">Total Actual Spend</div>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">${totalBudgetActual.toLocaleString()}</div>
                  </div>
                  <div className="rounded-xl border p-4 text-center">
                    <div className="text-[11px] text-muted-foreground mb-1">Total Budget</div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">${totalBudgetPlanned.toLocaleString()}</div>
                  </div>
                  <div className="rounded-xl border p-4 text-center">
                    <div className="text-[11px] text-muted-foreground mb-1">Forecast</div>
                    <div className="text-2xl font-bold text-orange-500 dark:text-orange-400">${totalBudgetForecast.toLocaleString()}</div>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {budgetByCategory.map(c => {
                    const max = Math.max(c.actual, c.budget, 1);
                    return (
                      <div key={c.category} className="flex items-center gap-3">
                        <span className="text-sm w-28 capitalize text-muted-foreground">{c.category}</span>
                        <div className="flex-1 bg-muted rounded-full h-3 relative">
                          {c.budget > 0 && <div className="absolute h-3 rounded-full bg-green-200 dark:bg-green-900" style={{ width: `${(c.budget / max) * 100}%` }} />}
                          <div className={`relative h-3 rounded-full ${c.actual > c.budget && c.budget > 0 ? "bg-red-500" : "bg-blue-500"}`} style={{ width: `${(c.actual / max) * 100}%` }} />
                        </div>
                        <span className="text-sm w-20 text-right font-medium">${c.actual.toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {licenses.length === 0 && budgetEntries.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">No cost data yet. Add software licenses or budget entries to get started.</p>
                <div className="flex gap-2 justify-center mt-4">
                  <Button variant="outline" onClick={() => { setActiveTab("licenses"); setShowLicenseForm(true); }}>
                    <Plus className="h-4 w-4 mr-1" /> Add License
                  </Button>
                  <Button variant="outline" onClick={() => { setActiveTab("budget"); setShowBudgetForm(true); }}>
                    <Plus className="h-4 w-4 mr-1" /> Add Budget Entry
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Licenses Tab */}
      {activeTab === "licenses" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            {!showLicenseForm && (
              <Button onClick={() => setShowLicenseForm(true)}><Plus className="h-4 w-4 mr-1" /> Add License</Button>
            )}
          </div>

          {showLicenseForm && (
            <Card className="border-blue-200 dark:border-blue-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{editingLicense ? "Edit License" : "Add Software License"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div><Label>Application *</Label><Input value={licApp} onChange={e => setLicApp(e.target.value)} placeholder="e.g. Microsoft 365 E5" /></div>
                  <div><Label>Vendor</Label><Input value={licVendor} onChange={e => setLicVendor(e.target.value)} placeholder="e.g. Microsoft" /></div>
                </div>
                <div className="grid sm:grid-cols-4 gap-4">
                  <div><Label>Total Seats *</Label><Input type="number" value={licTotal} onChange={e => setLicTotal(e.target.value)} placeholder="35" /></div>
                  <div><Label>Used Seats</Label><Input type="number" value={licUsed} onChange={e => setLicUsed(e.target.value)} placeholder="28" /></div>
                  <div><Label>Cost per Seat *</Label><Input type="number" step="0.01" value={licCost} onChange={e => setLicCost(e.target.value)} placeholder="38.00" /></div>
                  <div>
                    <Label>Billing Cycle</Label>
                    <select value={licCycle} onChange={e => setLicCycle(e.target.value)} className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="monthly">Monthly</option>
                      <option value="annual">Annual</option>
                    </select>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Category</Label>
                    <select value={licCategory} onChange={e => setLicCategory(e.target.value)} className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="">Select...</option>
                      {LICENSE_CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
                    </select>
                  </div>
                  <div><Label>Renewal Date</Label><Input type="date" value={licRenewal} onChange={e => setLicRenewal(e.target.value)} /></div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={saveLicense} disabled={licSaving || !licApp || !licTotal || !licCost}>
                    {licSaving ? "Saving..." : editingLicense ? "Update" : "Add License"}
                  </Button>
                  <Button variant="outline" onClick={resetLicenseForm}><X className="h-4 w-4 mr-1" /> Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {licenses.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No software licenses added yet.</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {licenses.map(l => {
                const unused = l.totalSeats - l.usedSeats;
                const util = Math.round((l.usedSeats / l.totalSeats) * 100);
                const monthly = l.billingCycle === "annual" ? l.costPerSeat / 12 : l.costPerSeat;
                return (
                  <Card key={l.id} className={!l.isActive ? "opacity-50" : ""}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{l.application}</span>
                            {l.vendor && <span className="text-xs text-muted-foreground">by {l.vendor}</span>}
                            {l.category && <Badge variant="outline" className="text-[10px]">{l.category}</Badge>}
                            {!l.isActive && <Badge className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[10px]">Inactive</Badge>}
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span>{l.usedSeats}/{l.totalSeats} seats</span>
                            <span className="flex items-center gap-1">
                              <div className="w-12 bg-muted rounded-full h-1.5">
                                <div className={`h-1.5 rounded-full ${util >= 80 ? "bg-green-500" : util >= 60 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${util}%` }} />
                              </div>
                              {util}%
                            </span>
                            <span>${l.costPerSeat}/{l.billingCycle === "annual" ? "yr" : "mo"}/seat</span>
                            {unused > 0 && <span className="text-red-500 dark:text-red-400">Wasting ${(unused * monthly).toFixed(0)}/mo</span>}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEditLicense(l)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteLicense(l.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Budget Tab */}
      {activeTab === "budget" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            {!showBudgetForm && (
              <Button onClick={() => setShowBudgetForm(true)}><Plus className="h-4 w-4 mr-1" /> Add Entry</Button>
            )}
          </div>

          {showBudgetForm && (
            <Card className="border-blue-200 dark:border-blue-800">
              <CardHeader className="pb-3"><CardTitle className="text-lg">Add Budget Entry</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <Label>Category *</Label>
                    <select value={budCat} onChange={e => setBudCat(e.target.value)} className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm">
                      {BUDGET_CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label>Type *</Label>
                    <select value={budType} onChange={e => setBudType(e.target.value)} className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="actual">Actual Spend</option>
                      <option value="budget">Budget (Planned)</option>
                      <option value="forecast">Forecast</option>
                    </select>
                  </div>
                  <div><Label>Period *</Label><Input type="month" value={budPeriod} onChange={e => setBudPeriod(e.target.value)} /></div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div><Label>Description *</Label><Input value={budDesc} onChange={e => setBudDesc(e.target.value)} placeholder="e.g. AWS hosting costs" /></div>
                  <div><Label>Amount ($) *</Label><Input type="number" step="0.01" value={budAmount} onChange={e => setBudAmount(e.target.value)} placeholder="5000" /></div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="recurring" checked={budRecurring} onChange={e => setBudRecurring(e.target.checked)} className="rounded" />
                  <Label htmlFor="recurring" className="text-sm cursor-pointer">Recurring monthly</Label>
                </div>
                <div className="flex gap-2">
                  <Button onClick={saveBudgetEntry} disabled={budSaving || !budDesc || !budAmount}>
                    {budSaving ? "Saving..." : "Add Entry"}
                  </Button>
                  <Button variant="outline" onClick={() => setShowBudgetForm(false)}><X className="h-4 w-4 mr-1" /> Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {budgetEntries.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No budget entries yet.</CardContent></Card>
          ) : (
            <Card>
              <CardContent className="pt-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left p-3 font-medium text-muted-foreground">Description</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Category</th>
                      <th className="text-center p-3 font-medium text-muted-foreground">Type</th>
                      <th className="text-center p-3 font-medium text-muted-foreground">Period</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Amount</th>
                      <th className="text-right p-3 font-medium text-muted-foreground"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {budgetEntries.map(e => (
                      <tr key={e.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="p-3">
                          <div className="font-medium">{e.description}</div>
                          {e.isRecurring && <span className="text-[10px] text-muted-foreground">Recurring</span>}
                        </td>
                        <td className="p-3 capitalize">{e.category}</td>
                        <td className="p-3 text-center">
                          <Badge variant="outline" className={e.type === "actual" ? "text-blue-600 dark:text-blue-400" : e.type === "budget" ? "text-green-600 dark:text-green-400" : "text-orange-500 dark:text-orange-400"}>
                            {e.type}
                          </Badge>
                        </td>
                        <td className="p-3 text-center text-muted-foreground">{e.period}</td>
                        <td className="p-3 text-right font-medium">${e.amount.toLocaleString()}</td>
                        <td className="p-3 text-right">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteBudgetEntry(e.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
