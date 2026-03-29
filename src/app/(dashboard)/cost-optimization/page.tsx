"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const budgetData = [80, 82, 85, 88, 87, 90, 92, 94, 95, 97, 98, 100];
const forecastData = [null, null, null, null, null, null, null, 94, 96, 98, 99, 101];
const itSpend = [20, 21, 22, 21.5, 22, 23, 22.5, 24, 23.5, 25, 24, 26];
const revenue = [22, 23, 22.5, 24, 24.5, 25, 24, 25.5, 26, 25, 26, 26.5];
const ticketVol = [240, 280, 320, 350, 310, 290, 260, 300, 340, 280, 250, 220];
const resEff = [55, 52, 48, 45, 50, 55, 60, 58, 54, 62, 65, 70];

export default function CostOptimizationPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TrendingUp className="h-6 w-6" /> IT Analytics & Cost Optimization
        </h1>
        <p className="text-muted-foreground text-sm">
          From compliance, costs, and tickets to performance, security, and SLAs — analytics drives excellence across IT.
        </p>
      </div>

      {/* Service Intelligence */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Service Intelligence</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-5">
            {[
              { label: "Technician to ticket ratio", value: "1:40", sub: "Last quarter: 1:25", color: "text-blue-600" },
              { label: "Ticket resolution efficiency", value: "65%", sub: "Last quarter: 60%", color: "text-green-500" },
              { label: "IT spend per employee", value: "$2,400", sub: "Last quarter: $2,000", color: "text-orange-500" },
              { label: "Cost per incident", value: "$16", sub: "Last quarter: $18", color: "text-green-600" },
              { label: "Happiness index", value: "82%", sub: "Last quarter: 81%", color: "text-pink-500" },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-xl border p-4 text-center">
                <div className="text-[11px] font-medium text-muted-foreground mb-2">{kpi.label}</div>
                <div className={`text-3xl font-bold ${kpi.color}`}>{kpi.value}</div>
                <div className="text-[10px] text-muted-foreground mt-1">{kpi.sub}</div>
              </div>
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border p-4">
              <div className="text-sm font-semibold mb-1">Effect of ticket volume on efficiency</div>
              <div className="flex gap-4 text-[10px] text-muted-foreground mb-3">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-green-400 inline-block" /> Resolution efficiency (%)</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-blue-400 inline-block" /> Ticket volume</span>
              </div>
              <div className="flex items-end gap-[3px] h-40">
                {months.map((m, i) => (
                  <div key={m} className="flex-1 flex flex-col items-center gap-0.5" title={`${m}: ${ticketVol[i]} tickets, ${resEff[i]}% eff`}>
                    <div className="w-full flex gap-[1px]">
                      <div className="flex-1 bg-blue-400 rounded-t" style={{ height: `${(ticketVol[i] / 400) * 140}px` }} />
                      <div className="flex-1 bg-green-400 rounded-t" style={{ height: `${(resEff[i] / 100) * 140}px` }} />
                    </div>
                    <span className="text-[8px] text-muted-foreground">{m}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border p-4">
              <div className="text-sm font-semibold mb-1">IT spend vs productivity</div>
              <div className="flex gap-4 text-[10px] text-muted-foreground mb-3">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-blue-400 inline-block" /> IT spend (%)</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-pink-400 inline-block" /> Productivity (%)</span>
              </div>
              <div className="relative h-40">
                <svg viewBox="0 0 480 160" className="w-full h-full" preserveAspectRatio="none">
                  <polyline fill="none" stroke="#60a5fa" strokeWidth="2" points={months.map((_, i) => `${i * (480 / 11)},${160 - (itSpend[i] - 18) * 18}`).join(" ")} />
                  <polyline fill="none" stroke="#f472b6" strokeWidth="2" points={months.map((_, i) => `${i * (480 / 11)},${160 - (revenue[i] - 18) * 18}`).join(" ")} />
                  {itSpend.map((v, i) => <circle key={`s${i}`} cx={i * (480 / 11)} cy={160 - (v - 18) * 18} r="3" fill="#60a5fa" />)}
                  {revenue.map((v, i) => <circle key={`r${i}`} cx={i * (480 / 11)} cy={160 - (v - 18) * 18} r="3" fill="#f472b6" />)}
                </svg>
                <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[8px] text-muted-foreground px-1">
                  {months.map((m) => <span key={m}>{m}</span>)}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* IT Financial Analytics */}
      <Card>
        <CardHeader><CardTitle className="text-lg">IT Financial Analytics</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-5">
            {[
              { label: "Predicted budget overshoot", value: "-$27K", sub: "YTD Last year: -$16.4K", color: "text-red-500" },
              { label: "IT spend rate", value: "$226/day", sub: "Last quarter: $214/day", color: "text-orange-500" },
              { label: "IT spend to value ratio", value: "1:3", sub: "Last quarter: 1:2", color: "text-green-500" },
              { label: "Infra replacement frequency", value: "3 years", sub: "", color: "text-blue-600" },
              { label: "ROI index", value: "7.6", sub: "Last quarter: 6.4", color: "text-green-600" },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-xl border p-4 text-center">
                <div className="text-[11px] font-medium text-muted-foreground mb-2">{kpi.label}</div>
                <div className={`text-3xl font-bold ${kpi.color}`}>{kpi.value}</div>
                {kpi.sub && <div className="text-[10px] text-muted-foreground mt-1">{kpi.sub}</div>}
              </div>
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border p-4">
              <div className="text-sm font-semibold mb-1">IT budget usage forecast</div>
              <div className="flex gap-4 text-[10px] text-muted-foreground mb-3">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-indigo-400 inline-block" /> Total IT budget usage</span>
                <span className="flex items-center gap-1"><span className="h-[1px] w-3 bg-blue-300 inline-block" /> Forecasted usage</span>
              </div>
              <div className="relative h-40">
                <svg viewBox="0 0 480 160" className="w-full h-full" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="budgetFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#818cf8" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#818cf8" stopOpacity="0.05" />
                    </linearGradient>
                  </defs>
                  <polygon fill="url(#budgetFill)" points={`0,160 ${budgetData.map((v, i) => `${i * (480 / 11)},${160 - (v - 75) * 5.5}`).join(" ")} ${11 * (480 / 11)},160`} />
                  <polyline fill="none" stroke="#818cf8" strokeWidth="2.5" points={budgetData.map((v, i) => `${i * (480 / 11)},${160 - (v - 75) * 5.5}`).join(" ")} />
                  <polyline fill="none" stroke="#93c5fd" strokeWidth="1.5" strokeDasharray="4,3" points={forecastData.map((v, i) => v !== null ? `${i * (480 / 11)},${160 - (v - 75) * 5.5}` : "").filter(Boolean).join(" ")} />
                  {budgetData.map((v, i) => <circle key={i} cx={i * (480 / 11)} cy={160 - (v - 75) * 5.5} r="2.5" fill="#818cf8" />)}
                </svg>
                <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[8px] text-muted-foreground px-1">
                  {months.map((m) => <span key={m}>{m}</span>)}
                </div>
                <div className="absolute left-0 top-0 bottom-4 flex flex-col justify-between text-[8px] text-muted-foreground">
                  <span>$100K</span><span>$90K</span><span>$80K</span>
                </div>
              </div>
            </div>
            <div className="rounded-xl border p-4">
              <div className="text-sm font-semibold mb-1">IT spend vs revenue per employee</div>
              <div className="flex gap-4 text-[10px] text-muted-foreground mb-3">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-pink-400 inline-block" /> IT spend ($)</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-green-400 inline-block" /> Revenue per employee ($)</span>
              </div>
              <div className="relative h-40">
                <svg viewBox="0 0 480 160" className="w-full h-full" preserveAspectRatio="none">
                  <polyline fill="none" stroke="#f472b6" strokeWidth="2" points={itSpend.map((v, i) => `${i * (480 / 11)},${160 - (v - 18) * 18}`).join(" ")} />
                  <polyline fill="none" stroke="#4ade80" strokeWidth="2" points={revenue.map((v, i) => `${i * (480 / 11)},${160 - (v - 18) * 18}`).join(" ")} />
                  {itSpend.map((v, i) => <circle key={`s${i}`} cx={i * (480 / 11)} cy={160 - (v - 18) * 18} r="3" fill="#f472b6" />)}
                  {revenue.map((v, i) => <circle key={`r${i}`} cx={i * (480 / 11)} cy={160 - (v - 18) * 18} r="3" fill="#4ade80" />)}
                </svg>
                <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[8px] text-muted-foreground px-1">
                  {months.map((m) => <span key={m}>{m}</span>)}
                </div>
                <div className="absolute left-0 top-0 bottom-4 flex flex-col justify-between text-[8px] text-muted-foreground">
                  <span>$26K</span><span>$22K</span><span>$18K</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* License Optimization */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Software License Optimization</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-4 mb-6">
            {[
              { label: "Total license spend", value: "$14.2K/mo", sub: "Last quarter: $12.8K/mo", color: "text-blue-600" },
              { label: "Unused licenses", value: "47", sub: "Across 12 applications", color: "text-red-500" },
              { label: "Potential monthly savings", value: "$860", sub: "$10,320/year", color: "text-green-600" },
              { label: "License utilization", value: "78%", sub: "Last quarter: 74%", color: "text-orange-500" },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-xl border p-4 text-center">
                <div className="text-[11px] font-medium text-muted-foreground mb-2">{kpi.label}</div>
                <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
                <div className="text-[10px] text-muted-foreground mt-1">{kpi.sub}</div>
              </div>
            ))}
          </div>
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
                  <th className="text-right p-3 font-medium text-muted-foreground">Savings/mo</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { app: "Microsoft 365 E5", total: 35, used: 28, cost: 38 },
                  { app: "Adobe Creative Cloud", total: 15, used: 9, cost: 55 },
                  { app: "Slack Business+", total: 40, used: 32, cost: 12.5 },
                  { app: "Zoom Business", total: 25, used: 18, cost: 20 },
                  { app: "Jira Software", total: 30, used: 27, cost: 8 },
                  { app: "Figma Organization", total: 12, used: 10, cost: 45 },
                ].map((lic) => {
                  const unused = lic.total - lic.used;
                  const util = Math.round((lic.used / lic.total) * 100);
                  return (
                    <tr key={lic.app} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="p-3 font-medium">{lic.app}</td>
                      <td className="p-3 text-center">{lic.total}</td>
                      <td className="p-3 text-center text-green-600">{lic.used}</td>
                      <td className="p-3 text-center text-red-500">{unused}</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 bg-muted rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full ${util >= 80 ? "bg-green-500" : util >= 60 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${util}%` }} />
                          </div>
                          <span className="text-xs">{util}%</span>
                        </div>
                      </td>
                      <td className="p-3 text-right">${lic.cost}</td>
                      <td className="p-3 text-right font-medium text-green-600">${unused * lic.cost}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Hardware Lifecycle */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Hardware Lifecycle & Replacement</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-4 mb-6">
            {[
              { label: "Avg device age", value: "2.1 yrs", sub: "Last year: 1.8 yrs", color: "text-blue-600" },
              { label: "Devices due for refresh", value: "5", sub: "Within 6 months", color: "text-orange-500" },
              { label: "Replacement budget", value: "$18K", sub: "Estimated annual", color: "text-red-500" },
              { label: "Fleet health score", value: "84%", sub: "Last quarter: 81%", color: "text-green-600" },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-xl border p-4 text-center">
                <div className="text-[11px] font-medium text-muted-foreground mb-2">{kpi.label}</div>
                <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
                <div className="text-[10px] text-muted-foreground mt-1">{kpi.sub}</div>
              </div>
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border p-4">
              <div className="text-sm font-semibold mb-4">Device age distribution</div>
              <div className="space-y-3">
                {[
                  { age: "0-1 years", count: 12, pct: 30, color: "bg-green-500" },
                  { age: "1-2 years", count: 15, pct: 38, color: "bg-blue-500" },
                  { age: "2-3 years", count: 8, pct: 20, color: "bg-yellow-500" },
                  { age: "3-4 years", count: 3, pct: 8, color: "bg-orange-500" },
                  { age: "4+ years", count: 2, pct: 5, color: "bg-red-500" },
                ].map((item) => (
                  <div key={item.age} className="flex items-center gap-3">
                    <span className="text-sm w-20 text-muted-foreground">{item.age}</span>
                    <div className="flex-1 bg-muted rounded-full h-4">
                      <div className={`h-4 rounded-full ${item.color} flex items-center justify-end pr-2`} style={{ width: `${Math.max(item.pct, 10)}%` }}>
                        {item.pct > 15 && <span className="text-[9px] text-white font-medium">{item.count}</span>}
                      </div>
                    </div>
                    <span className="text-sm w-10 text-right font-medium">{item.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border p-4">
              <div className="text-sm font-semibold mb-4">Replacement forecast (next 12 months)</div>
              <div className="flex items-end gap-1 h-36">
                {[2, 1, 0, 3, 1, 2, 0, 1, 4, 2, 1, 0].map((v, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    {v > 0 && <span className="text-[9px] font-medium">{v}</span>}
                    <div className="w-full bg-orange-400 rounded-t" style={{ height: `${Math.max(v * 25, 2)}px` }} />
                    <span className="text-[8px] text-muted-foreground">{months[i]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
