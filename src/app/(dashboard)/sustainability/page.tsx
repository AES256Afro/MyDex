"use client";

import { useRequireRole } from "@/hooks/use-require-role";
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Leaf, Plus, Trash2, X, Pencil, Zap, TreePine, Target } from "lucide-react";

interface EnergyReading {
  id: string;
  month: number;
  year: number;
  kwhUsed: number;
  costDollars: number | null;
  source: string | null;
  carbonKg: number | null;
  notes: string | null;
}

interface SustainabilityGoal {
  id: string;
  metric: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  deadline: string | null;
  status: string;
  notes: string | null;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const METRIC_LABELS: Record<string, string> = {
  energy_reduction: "Energy Reduction",
  carbon_reduction: "Carbon Reduction",
  sleep_compliance: "Sleep Mode Compliance",
  green_score: "Green IT Score",
};

export default function SustainabilityPage() {
  const { authorized } = useRequireRole("ADMIN");
  if (!authorized) return null;

  const [readings, setReadings] = useState<EnergyReading[]>([]);
  const [goals, setGoals] = useState<SustainabilityGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"dashboard" | "energy" | "goals">("dashboard");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Energy form
  const [showEnergyForm, setShowEnergyForm] = useState(false);
  const [enMonth, setEnMonth] = useState(new Date().getMonth() + 1);
  const [enYear, setEnYear] = useState(new Date().getFullYear());
  const [enKwh, setEnKwh] = useState("");
  const [enCost, setEnCost] = useState("");
  const [enSource, setEnSource] = useState("utility_bill");
  const [enSaving, setEnSaving] = useState(false);

  // Goal form
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SustainabilityGoal | null>(null);
  const [goalMetric, setGoalMetric] = useState("energy_reduction");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalCurrent, setGoalCurrent] = useState("");
  const [goalUnit, setGoalUnit] = useState("%");
  const [goalDeadline, setGoalDeadline] = useState("");
  const [goalNotes, setGoalNotes] = useState("");
  const [goalSaving, setGoalSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [enRes, goRes] = await Promise.all([
        fetch(`/api/v1/sustainability/energy?year=${selectedYear}`),
        fetch("/api/v1/sustainability/goals"),
      ]);
      if (enRes.ok) { const d = await enRes.json(); setReadings(d.readings); }
      if (goRes.ok) { const d = await goRes.json(); setGoals(d.goals); }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [selectedYear]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const saveEnergy = async () => {
    if (!enKwh) return;
    setEnSaving(true);
    try {
      const res = await fetch("/api/v1/sustainability/energy", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: enMonth, year: enYear,
          kwhUsed: parseFloat(enKwh),
          costDollars: enCost ? parseFloat(enCost) : undefined,
          source: enSource,
        }),
      });
      if (res.ok) { setEnKwh(""); setEnCost(""); setShowEnergyForm(false); fetchData(); }
    } catch { /* ignore */ } finally { setEnSaving(false); }
  };

  const deleteEnergy = async (id: string) => {
    if (!confirm("Delete this reading?")) return;
    try {
      const res = await fetch(`/api/v1/sustainability/energy?id=${id}`, { method: "DELETE" });
      if (res.ok) fetchData();
    } catch { /* ignore */ }
  };

  const resetGoalForm = () => {
    setGoalMetric("energy_reduction"); setGoalTarget(""); setGoalCurrent("");
    setGoalUnit("%"); setGoalDeadline(""); setGoalNotes("");
    setEditingGoal(null); setShowGoalForm(false);
  };

  const startEditGoal = (g: SustainabilityGoal) => {
    setGoalMetric(g.metric); setGoalTarget(String(g.targetValue));
    setGoalCurrent(String(g.currentValue)); setGoalUnit(g.unit);
    setGoalDeadline(g.deadline?.slice(0, 10) || ""); setGoalNotes(g.notes || "");
    setEditingGoal(g); setShowGoalForm(true);
  };

  const saveGoal = async () => {
    if (!goalTarget) return;
    setGoalSaving(true);
    try {
      const payload = {
        metric: goalMetric, targetValue: parseFloat(goalTarget),
        currentValue: goalCurrent ? parseFloat(goalCurrent) : 0,
        unit: goalUnit, deadline: goalDeadline || undefined,
        notes: goalNotes || undefined,
      };
      const res = editingGoal
        ? await fetch("/api/v1/sustainability/goals", {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: editingGoal.id, ...payload }),
          })
        : await fetch("/api/v1/sustainability/goals", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      if (res.ok) { resetGoalForm(); fetchData(); }
    } catch { /* ignore */ } finally { setGoalSaving(false); }
  };

  const deleteGoal = async (id: string) => {
    if (!confirm("Delete this goal?")) return;
    try {
      const res = await fetch(`/api/v1/sustainability/goals?id=${id}`, { method: "DELETE" });
      if (res.ok) fetchData();
    } catch { /* ignore */ }
  };

  // Calculations
  const yearReadings = readings.filter(r => r.year === selectedYear).sort((a, b) => a.month - b.month);
  const totalKwh = yearReadings.reduce((s, r) => s + r.kwhUsed, 0);
  const totalCost = yearReadings.reduce((s, r) => s + (r.costDollars || 0), 0);
  const totalCarbon = yearReadings.reduce((s, r) => s + (r.carbonKg || 0), 0);
  const avgMonthlyKwh = yearReadings.length > 0 ? totalKwh / yearReadings.length : 0;

  // Month-over-month trend
  const lastTwo = yearReadings.slice(-2);
  const kwhTrend = lastTwo.length === 2 ? ((lastTwo[1].kwhUsed - lastTwo[0].kwhUsed) / lastTwo[0].kwhUsed * 100) : 0;

  // Chart data: fill all 12 months
  const chartData = MONTHS.map((_, i) => {
    const r = yearReadings.find(r => r.month === i + 1);
    return r ? r.kwhUsed : 0;
  });
  const chartCarbon = MONTHS.map((_, i) => {
    const r = yearReadings.find(r => r.month === i + 1);
    return r?.carbonKg || 0;
  });
  const maxKwh = Math.max(...chartData, 1);
  const maxCarbon = Math.max(...chartCarbon, 1);

  if (loading) return <div className="p-6 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Leaf className="h-6 w-6" /> Sustainability & Green IT
          </h1>
          <p className="text-muted-foreground text-sm">Track energy consumption, carbon emissions, and sustainability goals</p>
        </div>
        <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm">
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {(["dashboard", "energy", "goals"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >{tab === "dashboard" ? "Dashboard" : tab === "energy" ? "Energy Data" : "Goals"}</button>
        ))}
      </div>

      {/* Dashboard Tab */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              { label: "Total Energy", value: `${totalKwh.toLocaleString()} kWh`, sub: `${selectedYear}`, color: "text-blue-600", Icon: Zap },
              { label: "Carbon Emissions", value: `${(totalCarbon / 1000).toFixed(1)}t CO\u2082e`, sub: `${selectedYear}`, color: "text-green-600", Icon: TreePine },
              { label: "Energy Cost", value: `$${totalCost.toLocaleString()}`, sub: `${selectedYear}`, color: "text-orange-500", Icon: Zap },
              { label: "Monthly Trend", value: `${kwhTrend >= 0 ? "+" : ""}${kwhTrend.toFixed(1)}%`, sub: "vs prev month", color: kwhTrend <= 0 ? "text-green-600" : "text-red-500", Icon: Leaf },
            ].map(kpi => (
              <Card key={kpi.label}>
                <CardContent className="pt-5 text-center">
                  <kpi.Icon className={`h-5 w-5 mx-auto mb-2 ${kpi.color}`} />
                  <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">{kpi.label}</div>
                  <div className="text-[10px] text-muted-foreground">{kpi.sub}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {yearReadings.length > 0 && (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Energy chart */}
              <Card>
                <CardHeader><CardTitle className="text-base">Monthly Energy Consumption (kWh)</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-end gap-[3px] h-44">
                    {MONTHS.map((m, i) => (
                      <div key={m} className="flex-1 flex flex-col items-center gap-0.5">
                        {chartData[i] > 0 && <span className="text-[8px] text-muted-foreground">{chartData[i].toLocaleString()}</span>}
                        <div className={`w-full rounded-t ${chartData[i] > 0 ? "bg-blue-400" : "bg-muted/30"}`}
                          style={{ height: `${chartData[i] > 0 ? (chartData[i] / maxKwh) * 140 : 2}px` }} />
                        <span className="text-[8px] text-muted-foreground">{m}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Carbon chart */}
              <Card>
                <CardHeader><CardTitle className="text-base">Carbon Emissions (kg CO{"\u2082"}e)</CardTitle></CardHeader>
                <CardContent>
                  <div className="relative h-44">
                    <svg viewBox="0 0 480 160" className="w-full h-full" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="carbonFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#4ade80" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#4ade80" stopOpacity="0.02" />
                        </linearGradient>
                      </defs>
                      {(() => {
                        const validPoints = chartCarbon.map((v, i) => ({ v, i })).filter(p => p.v > 0);
                        if (validPoints.length < 2) return null;
                        const points = validPoints.map(p => `${p.i * (480 / 11)},${160 - (p.v / maxCarbon) * 140}`).join(" ");
                        return (
                          <>
                            <polygon fill="url(#carbonFill)" points={`${validPoints[0].i * (480 / 11)},160 ${points} ${validPoints[validPoints.length - 1].i * (480 / 11)},160`} />
                            <polyline fill="none" stroke="#4ade80" strokeWidth="2.5" points={points} />
                            {validPoints.map(p => <circle key={p.i} cx={p.i * (480 / 11)} cy={160 - (p.v / maxCarbon) * 140} r="3" fill="#4ade80" />)}
                          </>
                        );
                      })()}
                    </svg>
                    <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[8px] text-muted-foreground px-1">
                      {MONTHS.map(m => <span key={m}>{m}</span>)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Goals progress */}
          {goals.filter(g => g.status === "active").length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Active Goals</CardTitle></CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  {goals.filter(g => g.status === "active").map(g => {
                    const pct = g.targetValue > 0 ? Math.min((g.currentValue / g.targetValue) * 100, 100) : 0;
                    return (
                      <div key={g.id} className="rounded-xl border p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">{METRIC_LABELS[g.metric] || g.metric}</span>
                          <Badge variant="outline" className="text-[10px]">{g.currentValue}/{g.targetValue} {g.unit}</Badge>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div className={`h-2 rounded-full transition-all ${pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-yellow-500" : "bg-blue-500"}`} style={{ width: `${pct}%` }} />
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-1">{pct.toFixed(0)}% complete{g.deadline ? ` — Due ${new Date(g.deadline).toLocaleDateString()}` : ""}</div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {yearReadings.length === 0 && goals.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Leaf className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">No sustainability data yet. Add energy readings or set goals to get started.</p>
                <div className="flex gap-2 justify-center mt-4">
                  <Button variant="outline" onClick={() => { setActiveTab("energy"); setShowEnergyForm(true); }}>
                    <Plus className="h-4 w-4 mr-1" /> Add Energy Reading
                  </Button>
                  <Button variant="outline" onClick={() => { setActiveTab("goals"); setShowGoalForm(true); }}>
                    <Plus className="h-4 w-4 mr-1" /> Set Goal
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Energy Tab */}
      {activeTab === "energy" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            {!showEnergyForm && (
              <Button onClick={() => setShowEnergyForm(true)}><Plus className="h-4 w-4 mr-1" /> Add Reading</Button>
            )}
          </div>

          {showEnergyForm && (
            <Card className="border-green-200 dark:border-green-800">
              <CardHeader className="pb-3"><CardTitle className="text-lg">Add Energy Reading</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-4 gap-4">
                  <div>
                    <Label>Month *</Label>
                    <select value={enMonth} onChange={e => setEnMonth(parseInt(e.target.value))}
                      className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm">
                      {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label>Year *</Label>
                    <select value={enYear} onChange={e => setEnYear(parseInt(e.target.value))}
                      className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm">
                      {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div><Label>Energy Used (kWh) *</Label><Input type="number" step="0.01" value={enKwh} onChange={e => setEnKwh(e.target.value)} placeholder="2800" /></div>
                  <div><Label>Cost ($)</Label><Input type="number" step="0.01" value={enCost} onChange={e => setEnCost(e.target.value)} placeholder="340" /></div>
                </div>
                <div>
                  <Label>Source</Label>
                  <select value={enSource} onChange={e => setEnSource(e.target.value)}
                    className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm max-w-xs">
                    <option value="utility_bill">Utility Bill</option>
                    <option value="smart_meter">Smart Meter</option>
                    <option value="estimate">Estimate</option>
                  </select>
                </div>
                <p className="text-xs text-muted-foreground">Carbon emissions are auto-calculated using the US average emission factor (0.42 kg CO{"\u2082"}/kWh).</p>
                <div className="flex gap-2">
                  <Button onClick={saveEnergy} disabled={enSaving || !enKwh}>{enSaving ? "Saving..." : "Save Reading"}</Button>
                  <Button variant="outline" onClick={() => setShowEnergyForm(false)}><X className="h-4 w-4 mr-1" /> Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {yearReadings.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No energy readings for {selectedYear}.</CardContent></Card>
          ) : (
            <Card>
              <CardContent className="pt-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left p-3 font-medium text-muted-foreground">Month</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Energy (kWh)</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Cost ($)</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Carbon (kg CO{"\u2082"})</th>
                      <th className="text-center p-3 font-medium text-muted-foreground">Source</th>
                      <th className="text-right p-3 font-medium text-muted-foreground"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {yearReadings.map(r => (
                      <tr key={r.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="p-3 font-medium">{MONTHS[r.month - 1]} {r.year}</td>
                        <td className="p-3 text-right">{r.kwhUsed.toLocaleString()}</td>
                        <td className="p-3 text-right">{r.costDollars ? `$${r.costDollars.toLocaleString()}` : "—"}</td>
                        <td className="p-3 text-right">{r.carbonKg ? r.carbonKg.toFixed(0) : "—"}</td>
                        <td className="p-3 text-center">
                          <Badge variant="outline" className="text-[10px]">{r.source?.replace("_", " ") || "—"}</Badge>
                        </td>
                        <td className="p-3 text-right">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteEnergy(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-muted/20 font-medium">
                      <td className="p-3">Total</td>
                      <td className="p-3 text-right">{totalKwh.toLocaleString()}</td>
                      <td className="p-3 text-right">${totalCost.toLocaleString()}</td>
                      <td className="p-3 text-right">{totalCarbon.toFixed(0)}</td>
                      <td></td><td></td>
                    </tr>
                  </tfoot>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Goals Tab */}
      {activeTab === "goals" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            {!showGoalForm && (
              <Button onClick={() => setShowGoalForm(true)}><Plus className="h-4 w-4 mr-1" /> Add Goal</Button>
            )}
          </div>

          {showGoalForm && (
            <Card className="border-green-200 dark:border-green-800">
              <CardHeader className="pb-3"><CardTitle className="text-lg">{editingGoal ? "Edit Goal" : "Add Sustainability Goal"}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Metric *</Label>
                    <select value={goalMetric} onChange={e => setGoalMetric(e.target.value)}
                      className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="energy_reduction">Energy Reduction</option>
                      <option value="carbon_reduction">Carbon Reduction</option>
                      <option value="sleep_compliance">Sleep Mode Compliance</option>
                      <option value="green_score">Green IT Score</option>
                    </select>
                  </div>
                  <div>
                    <Label>Unit</Label>
                    <select value={goalUnit} onChange={e => setGoalUnit(e.target.value)}
                      className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="%">%</option>
                      <option value="kWh">kWh</option>
                      <option value="tCO2e">tCO2e</option>
                      <option value="score">Score</option>
                    </select>
                  </div>
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div><Label>Target Value *</Label><Input type="number" step="0.01" value={goalTarget} onChange={e => setGoalTarget(e.target.value)} placeholder="20" /></div>
                  <div><Label>Current Value</Label><Input type="number" step="0.01" value={goalCurrent} onChange={e => setGoalCurrent(e.target.value)} placeholder="0" /></div>
                  <div><Label>Deadline</Label><Input type="date" value={goalDeadline} onChange={e => setGoalDeadline(e.target.value)} /></div>
                </div>
                <div><Label>Notes</Label><Input value={goalNotes} onChange={e => setGoalNotes(e.target.value)} placeholder="Additional context..." /></div>
                <div className="flex gap-2">
                  <Button onClick={saveGoal} disabled={goalSaving || !goalTarget}>{goalSaving ? "Saving..." : editingGoal ? "Update" : "Add Goal"}</Button>
                  <Button variant="outline" onClick={resetGoalForm}><X className="h-4 w-4 mr-1" /> Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {goals.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No sustainability goals set yet.</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {goals.map(g => {
                const pct = g.targetValue > 0 ? Math.min((g.currentValue / g.targetValue) * 100, 100) : 0;
                return (
                  <Card key={g.id}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-green-600" />
                            <span className="font-semibold">{METRIC_LABELS[g.metric] || g.metric}</span>
                            <Badge variant="outline" className={`text-[10px] ${g.status === "achieved" ? "text-green-600" : g.status === "missed" ? "text-red-500" : ""}`}>
                              {g.status}
                            </Badge>
                          </div>
                          <div className="mt-2 flex items-center gap-3">
                            <div className="flex-1 max-w-xs bg-muted rounded-full h-2">
                              <div className={`h-2 rounded-full ${pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-yellow-500" : "bg-blue-500"}`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-sm text-muted-foreground">{g.currentValue}/{g.targetValue} {g.unit} ({pct.toFixed(0)}%)</span>
                          </div>
                          {g.deadline && <div className="text-xs text-muted-foreground mt-1">Deadline: {new Date(g.deadline).toLocaleDateString()}</div>}
                          {g.notes && <div className="text-xs text-muted-foreground mt-0.5">{g.notes}</div>}
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEditGoal(g)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteGoal(g.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
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
    </div>
  );
}
