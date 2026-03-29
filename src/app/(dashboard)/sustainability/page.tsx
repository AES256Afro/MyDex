"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Leaf } from "lucide-react";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const co2Data = [3.2, 3.0, 2.9, 2.8, 2.7, 2.6, 2.5, 2.5, 2.4, 2.4, 2.3, 2.2];
const energyData = [3200, 3100, 3050, 2980, 2900, 2850, 2800, 2780, 2730, 2700, 2680, 2650];

export default function SustainabilityPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Leaf className="h-6 w-6" /> Sustainability & Green IT
        </h1>
        <p className="text-muted-foreground text-sm">
          Drive sustainability through and within IT — leverage smart technology and data-driven insights to reduce environmental impact
        </p>
      </div>

      {/* Top KPIs */}
      <div className="grid gap-3 sm:grid-cols-5">
        {[
          { label: "Carbon footprint", value: "2.4t", sub: "CO\u2082e this quarter", color: "text-green-600" },
          { label: "Energy reduction", value: "18%", sub: "vs last quarter", color: "text-green-500" },
          { label: "Power cost savings", value: "$4.2K", sub: "YTD: $3.1K last year", color: "text-blue-600" },
          { label: "Sleep mode compliance", value: "89%", sub: "Last quarter: 82%", color: "text-green-600" },
          { label: "Green IT score", value: "B+", sub: "Last quarter: B", color: "text-green-500" },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl border p-4 text-center">
            <div className="text-[11px] font-medium text-muted-foreground mb-2">{kpi.label}</div>
            <div className={`text-3xl font-bold ${kpi.color}`}>{kpi.value}</div>
            <div className="text-[10px] text-muted-foreground mt-1">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Carbon emissions trend (tCO\u2082e)</CardTitle></CardHeader>
          <CardContent>
            <div className="relative h-44">
              <svg viewBox="0 0 480 160" className="w-full h-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="co2Fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4ade80" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#4ade80" stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                <polygon fill="url(#co2Fill)" points={`0,160 ${co2Data.map((v, i) => `${i * (480 / 11)},${160 - (v - 2) * 120}`).join(" ")} ${11 * (480 / 11)},160`} />
                <polyline fill="none" stroke="#4ade80" strokeWidth="2.5" points={co2Data.map((v, i) => `${i * (480 / 11)},${160 - (v - 2) * 120}`).join(" ")} />
                {co2Data.map((v, i) => <circle key={i} cx={i * (480 / 11)} cy={160 - (v - 2) * 120} r="3" fill="#4ade80" />)}
              </svg>
              <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[8px] text-muted-foreground px-1">
                {months.map((m) => <span key={m}>{m}</span>)}
              </div>
              <div className="absolute left-0 top-0 bottom-4 flex flex-col justify-between text-[8px] text-muted-foreground">
                <span>3.2t</span><span>2.6t</span><span>2.0t</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Monthly energy consumption (kWh)</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-end gap-[3px] h-44">
              {months.map((m, i) => (
                <div key={m} className="flex-1 flex flex-col items-center gap-0.5">
                  <span className="text-[8px] text-muted-foreground">{energyData[i]}</span>
                  <div className="w-full bg-blue-400 rounded-t" style={{ height: `${((energyData[i] - 2400) / 900) * 140}px` }} />
                  <span className="text-[8px] text-muted-foreground">{m}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Energy breakdown + recommendations */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Energy by device category</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-6">
              <div className="flex-shrink-0">
                <svg viewBox="0 0 120 120" className="w-28 h-28">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="20" className="text-muted" />
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#3b82f6" strokeWidth="20" strokeDasharray="141 314" strokeDashoffset="0" className="origin-center -rotate-90" />
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#22c55e" strokeWidth="20" strokeDasharray="79 314" strokeDashoffset="-141" className="origin-center -rotate-90" />
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#eab308" strokeWidth="20" strokeDasharray="60 314" strokeDashoffset="-220" className="origin-center -rotate-90" />
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#a855f7" strokeWidth="20" strokeDasharray="22 314" strokeDashoffset="-280" className="origin-center -rotate-90" />
                  <text x="60" y="56" textAnchor="middle" className="text-[11px] font-bold fill-foreground">2,730</text>
                  <text x="60" y="70" textAnchor="middle" className="text-[8px] fill-muted-foreground">kWh/mo</text>
                </svg>
              </div>
              <div className="flex-1 space-y-2">
                {[
                  { label: "Desktops", value: "1,240 kWh", pct: "45%", color: "bg-blue-500" },
                  { label: "Laptops", value: "680 kWh", pct: "25%", color: "bg-green-500" },
                  { label: "Monitors", value: "520 kWh", pct: "19%", color: "bg-yellow-500" },
                  { label: "Peripherals", value: "180 kWh", pct: "7%", color: "bg-purple-500" },
                  { label: "Networking", value: "110 kWh", pct: "4%", color: "bg-gray-400" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2 text-sm">
                    <span className={`h-3 w-3 rounded-sm ${item.color} flex-shrink-0`} />
                    <span className="flex-1">{item.label}</span>
                    <span className="text-muted-foreground">{item.value}</span>
                    <span className="font-medium w-8 text-right">{item.pct}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Sustainability actions</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { action: "Enable power management policies", impact: "High", savings: "~320 kWh/mo", color: "text-red-500" },
                { action: "Schedule after-hours sleep mode", impact: "High", savings: "~280 kWh/mo", color: "text-red-500" },
                { action: "Consolidate underused devices", impact: "Medium", savings: "~150 kWh/mo", color: "text-orange-500" },
                { action: "Optimize display brightness", impact: "Low", savings: "~60 kWh/mo", color: "text-yellow-600" },
                { action: "Enable USB auto-suspend", impact: "Low", savings: "~30 kWh/mo", color: "text-yellow-600" },
              ].map((rec) => (
                <div key={rec.action} className="flex items-center gap-3 py-2 border-b last:border-0">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{rec.action}</div>
                    <div className="text-xs text-muted-foreground">Est. savings: {rec.savings}</div>
                  </div>
                  <Badge variant="outline" className={`${rec.color} border-current`}>{rec.impact}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Awareness */}
      <Card>
        <CardHeader><CardTitle className="text-base">Digital Workplace Awareness</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "Employee nudges sent", value: "234", sub: "This month", color: "text-green-600", icon: "Automated tips about energy-saving practices" },
              { label: "Top department", value: "Engineering", sub: "Score: 92/100", color: "text-blue-600", icon: "Gamified sustainability leaderboard" },
              { label: "Environmental equivalent", value: "12 trees", sub: "CO\u2082 offset this quarter", color: "text-green-600", icon: "Real impact of your IT decisions" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border p-4 text-center bg-green-50/30 dark:bg-green-950/10">
                <div className="text-[11px] font-medium text-muted-foreground mb-2">{item.icon}</div>
                <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
                <div className="text-xs font-medium mt-1">{item.label}</div>
                <div className="text-[10px] text-muted-foreground">{item.sub}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
