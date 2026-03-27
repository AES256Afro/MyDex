"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Check,
  X,
  Users,
  Shield,
  Zap,
  Server,
  HeadphonesIcon,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Monitor,
  Lock,
  Globe,
  BarChart3,
  Clock,
  Building2,
  Star,
  Sparkles,
  Calculator,
} from "lucide-react";

// ─── Pricing Calculator Logic ────────────────────────────────────────────────

const TIERS = [
  {
    name: "Starter",
    tag: "For growing teams",
    color: "from-blue-500 to-blue-600",
    border: "border-blue-200 dark:border-blue-800",
    accent: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    badgeBg: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    maxUsers: 25,
    perUser: 8,
    setup: 0,
    support: "Community + Email",
    sla: "48h response",
    features: [
      "Agent deployment (EXE, PKG, DEB)",
      "Device monitoring & inventory",
      "Activity & productivity tracking",
      "Time tracking & attendance",
      "Department management",
      "Basic reporting (PDF/CSV)",
      "Host group policies",
      "Domain blocklists (preset)",
      "SSO (Google, GitHub)",
      "MFA enforcement",
      "5 GB log retention (30 days)",
      "Community forum access",
    ],
    notIncluded: [
      "CVE vulnerability scanning",
      "Threat intelligence (IOC feeds)",
      "DLP & data loss prevention",
      "Custom blocklist imports",
      "Advanced reporting & scheduling",
      "MDM deployment guides",
      "API access",
      "Dedicated support engineer",
      "Custom SLA",
      "On-premise deployment",
    ],
  },
  {
    name: "Business",
    tag: "Most popular",
    color: "from-indigo-500 to-purple-600",
    border: "border-indigo-200 dark:border-indigo-800",
    accent: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-50 dark:bg-indigo-950/30",
    badgeBg: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
    maxUsers: 250,
    perUser: 5,
    setup: 2500,
    support: "Priority Email + Chat",
    sla: "4h response (business hours)",
    features: [
      "Everything in Starter, plus:",
      "Agent deployment (all formats incl. MSI)",
      "MDM deployment (Intune, Jamf, SCCM, GPO)",
      "Advanced reporting & scheduling",
      "Custom blocklist imports",
      "Software inventory & version tracking",
      "API access (REST, webhooks)",
      "Project & task management",
      "Employee directory & profiles",
      "Role-based access (4 tiers)",
      "SSO (Entra ID, Okta, SAML)",
      "50 GB log retention (90 days)",
      "Onboarding call & setup assistance",
    ],
    notIncluded: [
      "CVE vulnerability scanning",
      "Threat intelligence (IOC feeds)",
      "DLP & data loss prevention",
      "Dedicated support engineer",
      "Custom SLA",
      "On-premise deployment",
    ],
  },
  {
    name: "Enterprise",
    tag: "Full platform",
    color: "from-amber-500 to-orange-600",
    border: "border-amber-200 dark:border-amber-800",
    accent: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    badgeBg: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    maxUsers: 99999,
    perUser: 3.5,
    setup: 10000,
    support: "Dedicated Engineer",
    sla: "1h response (24/7)",
    features: [
      "Everything in Business, plus:",
      "Unlimited users",
      "Self-hosted / on-premise option",
      "Custom Docker deployment",
      "White-label branding",
      "Advanced RBAC & custom roles",
      "Audit log with full retention",
      "500 GB log retention (1 year)",
      "Dedicated support engineer",
      "Custom SLA & uptime guarantee",
      "Quarterly business reviews",
      "Priority feature requests",
      "SSO with custom OIDC/SAML",
    ],
    notIncluded: [],
  },
];

const SECURITY_ADDON = {
  name: "Security Suite",
  perUser: 3,
  minTier: "Business",
  features: [
    "NVD CVE vulnerability scanning (auto-update)",
    "Device-aware CVE applicability filtering",
    "Threat intelligence IOC feeds",
    "Data Loss Prevention (DLP) policies",
    "Real-time security alerting",
    "Automated threat response actions",
    "Host isolation & quarantine",
    "Forensic log collection",
    "Security compliance reporting",
    "SIEM integration (syslog, webhook)",
  ],
};

// Server infrastructure cost estimates (transparent pricing)
const INFRA_BREAKDOWN = [
  { label: "Application Server", small: 20, medium: 80, large: 300, unit: "/mo" },
  { label: "Database (PostgreSQL)", small: 15, medium: 50, large: 200, unit: "/mo" },
  { label: "Log Storage & Retention", small: 5, medium: 25, large: 100, unit: "/mo" },
  { label: "CDN & Edge Network", small: 0, medium: 10, large: 40, unit: "/mo" },
  { label: "Backup & Disaster Recovery", small: 5, medium: 15, large: 60, unit: "/mo" },
  { label: "SSL & Security Infra", small: 0, medium: 10, large: 30, unit: "/mo" },
  { label: "NVD API & Threat Feeds", small: 0, medium: 0, large: 50, unit: "/mo" },
];

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

// ─── FAQ ─────────────────────────────────────────────────────────────────────

const FAQ = [
  {
    q: "Can I start with Starter and upgrade later?",
    a: "Absolutely. All plans are prorated, so you only pay the difference when upgrading. Your data, agents, and configuration carry over seamlessly — zero downtime.",
  },
  {
    q: "What happens if I exceed my plan's user limit?",
    a: "We'll notify you at 80% capacity. You have 30 days to upgrade or reduce users. We never cut off access unexpectedly.",
  },
  {
    q: "Is the Security Suite required?",
    a: "No. The Security Suite is an optional add-on for organizations that need CVE scanning, threat intelligence, and DLP. The base plans include device monitoring, host group policies, and domain blocklists.",
  },
  {
    q: "Can I self-host MyDex?",
    a: "Enterprise plans include a full self-hosted option with Docker Compose deployment. You run everything on your own infrastructure — we provide the images, scripts, and support.",
  },
  {
    q: "What's included in setup fees?",
    a: "Business setup includes a 1-hour onboarding call, SSO configuration, initial agent deployment assistance, and department/policy setup. Enterprise includes full white-glove onboarding over 2-4 weeks.",
  },
  {
    q: "Do you offer annual billing discounts?",
    a: "Yes — annual billing saves 20% on all plans. Contact us for a custom annual quote.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes. Every plan includes a 14-day free trial with full access to all features. No credit card required to start.",
  },
  {
    q: "How does the agent reporting toggle work?",
    a: "Every user and admin can pause agent reporting at any time from their account settings or the org-wide settings page. When paused, the agent stays installed but stops sending activity data — giving full privacy control.",
  },
];

// ─── Page Component ──────────────────────────────────────────────────────────

export default function LicensingPage() {
  const [employeeCount, setEmployeeCount] = useState(50);
  const [annual, setAnnual] = useState(false);
  const [securityAddon, setSecurityAddon] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [showInfra, setShowInfra] = useState(false);

  const multiplier = annual ? 0.8 : 1;

  const getEstimate = (tier: typeof TIERS[0]) => {
    const userCost = employeeCount * tier.perUser * multiplier;
    const secCost = securityAddon && tier.name !== "Starter" ? employeeCount * SECURITY_ADDON.perUser * multiplier : 0;
    const monthly = userCost + secCost;
    const yearly = monthly * 12;
    return { monthly, yearly, secCost, userCost, setup: tier.setup };
  };

  const getRecommendedTier = () => {
    if (employeeCount <= 25) return "Starter";
    if (employeeCount <= 250) return "Business";
    return "Enterprise";
  };

  const recommended = getRecommendedTier();

  // Slider stops
  const sliderStops = [10, 25, 50, 100, 250, 500, 1000];
  const nearestStop = sliderStops.reduce((prev, curr) =>
    Math.abs(curr - employeeCount) < Math.abs(prev - employeeCount) ? curr : prev
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-primary">MyDex</Link>
          <div className="flex items-center gap-4">
            <Link href="/demo" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Live Demo</Link>
            <Link href="/login">
              <button className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                Sign In
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-indigo-600/5 to-purple-600/5" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" />
            14-day free trial on all plans
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
            Simple, transparent pricing
          </h1>
          <p className="mt-4 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            Monitor, manage, and secure your workforce at any scale.
            No hidden fees. No per-feature upcharges. Cancel anytime.
          </p>

          {/* Billing toggle */}
          <div className="mt-8 flex items-center justify-center gap-3">
            <span className={`text-sm font-medium ${!annual ? "text-foreground" : "text-muted-foreground"}`}>Monthly</span>
            <button
              onClick={() => setAnnual(!annual)}
              className={`relative w-14 h-7 rounded-full transition-colors ${annual ? "bg-indigo-600" : "bg-gray-300 dark:bg-gray-600"}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${annual ? "translate-x-7" : ""}`} />
            </button>
            <span className={`text-sm font-medium ${annual ? "text-foreground" : "text-muted-foreground"}`}>
              Annual <span className="text-green-600 font-semibold">(Save 20%)</span>
            </span>
          </div>
        </div>
      </section>

      {/* Employee Slider */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 mb-12">
        <div className="bg-white dark:bg-gray-900 border rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/50">
                <Calculator className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <div className="text-sm font-medium">Team Size</div>
                <div className="text-xs text-muted-foreground">Drag to estimate your cost</div>
              </div>
            </div>
            <div className="flex-1 w-full">
              <input
                type="range"
                min={5}
                max={1000}
                value={employeeCount}
                onChange={(e) => setEmployeeCount(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between mt-1 px-0.5">
                {sliderStops.map((s) => (
                  <button key={s} onClick={() => setEmployeeCount(s)} className={`text-[10px] ${s === nearestStop ? "text-indigo-600 font-bold" : "text-muted-foreground"}`}>{s}</button>
                ))}
              </div>
            </div>
            <div className="text-center min-w-[100px]">
              <div className="text-3xl font-bold text-indigo-600">{employeeCount}</div>
              <div className="text-xs text-muted-foreground">employees</div>
            </div>
          </div>

          {/* Security add-on toggle */}
          <div className="mt-4 pt-4 border-t flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-amber-600" />
              <div>
                <div className="text-sm font-medium">Security Suite Add-on</div>
                <div className="text-xs text-muted-foreground">CVE scanning, threat intel, DLP — +${SECURITY_ADDON.perUser}/user/mo</div>
              </div>
            </div>
            <button
              onClick={() => setSecurityAddon(!securityAddon)}
              className={`relative w-12 h-6 rounded-full transition-colors ${securityAddon ? "bg-amber-500" : "bg-gray-300 dark:bg-gray-600"}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${securityAddon ? "translate-x-6" : ""}`} />
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid gap-6 lg:grid-cols-3">
          {TIERS.map((tier) => {
            const est = getEstimate(tier);
            const isRec = tier.name === recommended;
            const isOver = tier.name === "Starter" && employeeCount > 25 || tier.name === "Business" && employeeCount > 250;
            return (
              <div
                key={tier.name}
                className={`relative rounded-2xl border-2 p-6 transition-all ${isRec ? `${tier.border} shadow-xl scale-[1.02]` : "border-border shadow-sm"} ${isOver ? "opacity-50" : ""}`}
              >
                {isRec && (
                  <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${tier.color}`}>
                    RECOMMENDED
                  </div>
                )}
                {isOver && (
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div className="bg-background/90 rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground border">
                      Exceeds {tier.maxUsers} user limit
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xl font-bold">{tier.name}</h3>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tier.badgeBg}`}>{tier.tag}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Up to {tier.maxUsers === 99999 ? "unlimited" : tier.maxUsers.toLocaleString()} users • {tier.support}
                </p>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">{formatCurrency(Math.round(est.monthly))}</span>
                    <span className="text-muted-foreground">/mo</span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {formatCurrency(tier.perUser * multiplier)}/user/mo
                    {securityAddon && tier.name !== "Starter" && (
                      <span className="text-amber-600"> + {formatCurrency(SECURITY_ADDON.perUser * multiplier)} security</span>
                    )}
                  </div>
                  {tier.setup > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      + {formatCurrency(tier.setup)} one-time setup
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {formatCurrency(Math.round(est.yearly))}/year total
                  </div>
                </div>

                {/* CTA */}
                <Link href="/register">
                  <button
                    className={`w-full py-3 rounded-lg font-semibold text-sm transition-all ${
                      isRec
                        ? `bg-gradient-to-r ${tier.color} text-white hover:opacity-90 shadow-lg`
                        : "bg-gray-100 dark:bg-gray-800 text-foreground hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                  >
                    Start Free Trial <ArrowRight className="inline h-4 w-4 ml-1" />
                  </button>
                </Link>

                {/* Features */}
                <div className="mt-6 space-y-2.5">
                  {tier.features.map((f, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      {f.startsWith("Everything") ? (
                        <Zap className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
                      ) : (
                        <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      )}
                      <span className={`text-sm ${f.startsWith("Everything") ? "font-semibold text-indigo-600 dark:text-indigo-400" : ""}`}>{f}</span>
                    </div>
                  ))}
                  {tier.notIncluded.map((f, i) => (
                    <div key={`no-${i}`} className="flex items-start gap-2.5 opacity-40">
                      <X className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                      <span className="text-sm line-through">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Security Suite Feature Card */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-8">
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="lg:w-1/3">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/50">
                  <Shield className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Security Suite</h2>
                  <div className="text-sm text-amber-700 dark:text-amber-400 font-medium">Optional add-on license</div>
                </div>
              </div>
              <p className="text-muted-foreground text-sm mb-4">
                Enterprise-grade security for organizations that need vulnerability management,
                threat detection, and data protection. Available on Business and Enterprise plans.
              </p>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-3xl font-bold text-amber-600">+${SECURITY_ADDON.perUser}</span>
                <span className="text-muted-foreground">/user/mo</span>
              </div>
              <div className="text-xs text-muted-foreground">
                For {employeeCount} users: +{formatCurrency(employeeCount * SECURITY_ADDON.perUser * multiplier)}/mo
              </div>
            </div>
            <div className="lg:w-2/3 grid sm:grid-cols-2 gap-3">
              {SECURITY_ADDON.features.map((f, i) => (
                <div key={i} className="flex items-start gap-2.5 bg-white/60 dark:bg-gray-900/40 rounded-lg px-3 py-2.5">
                  <Shield className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <span className="text-sm">{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Cost Breakdown at Scale */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold">Cost at Scale</h2>
          <p className="text-muted-foreground mt-2">Total monthly cost including infrastructure, licensing, and support</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border rounded-xl overflow-hidden">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900">
                <th className="text-left px-6 py-4 text-sm font-semibold">Team Size</th>
                <th className="text-center px-6 py-4 text-sm font-semibold text-blue-600">Starter</th>
                <th className="text-center px-6 py-4 text-sm font-semibold text-indigo-600">Business</th>
                <th className="text-center px-6 py-4 text-sm font-semibold text-amber-600">Enterprise</th>
                <th className="text-center px-6 py-4 text-sm font-semibold text-red-600">Enterprise + Security</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {[10, 25, 50, 100, 250, 500, 1000].map((count) => {
                const s = count <= 25 ? count * 8 : null;
                const b = count * 5;
                const e = count * 3.5;
                const es = count * (3.5 + 3);
                return (
                  <tr key={count} className={count === nearestStop ? "bg-indigo-50/50 dark:bg-indigo-950/20" : ""}>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{count}</span>
                        <span className="text-xs text-muted-foreground">users</span>
                      </div>
                    </td>
                    <td className="text-center px-6 py-3.5">
                      {s !== null ? (
                        <div>
                          <div className="font-semibold">{formatCurrency(s)}/mo</div>
                          <div className="text-[11px] text-muted-foreground">{formatCurrency(s * 12)}/yr</div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Max 25 users</span>
                      )}
                    </td>
                    <td className="text-center px-6 py-3.5">
                      {count <= 250 ? (
                        <div>
                          <div className="font-semibold">{formatCurrency(b)}/mo</div>
                          <div className="text-[11px] text-muted-foreground">{formatCurrency(b * 12)}/yr</div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Max 250 users</span>
                      )}
                    </td>
                    <td className="text-center px-6 py-3.5">
                      <div>
                        <div className="font-semibold">{formatCurrency(e)}/mo</div>
                        <div className="text-[11px] text-muted-foreground">{formatCurrency(e * 12)}/yr</div>
                      </div>
                    </td>
                    <td className="text-center px-6 py-3.5">
                      <div>
                        <div className="font-semibold text-red-600">{formatCurrency(es)}/mo</div>
                        <div className="text-[11px] text-muted-foreground">{formatCurrency(es * 12)}/yr</div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Infrastructure transparency */}
        <div className="mt-6">
          <button
            onClick={() => setShowInfra(!showInfra)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto"
          >
            <Server className="h-4 w-4" />
            What does infrastructure cost?
            {showInfra ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showInfra && (
            <div className="mt-4 bg-gray-50 dark:bg-gray-900 border rounded-xl p-6 max-w-3xl mx-auto">
              <p className="text-sm text-muted-foreground mb-4">
                We believe in transparency. Here&apos;s what it costs us to run your instance.
                These costs are already included in your plan — there are no surprise infrastructure fees.
              </p>
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-muted-foreground uppercase tracking-wider">
                    <th className="text-left pb-2">Component</th>
                    <th className="text-right pb-2">Small (&lt;50)</th>
                    <th className="text-right pb-2">Medium (&lt;250)</th>
                    <th className="text-right pb-2">Large (250+)</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-sm">
                  {INFRA_BREAKDOWN.map((row) => (
                    <tr key={row.label}>
                      <td className="py-2 font-medium">{row.label}</td>
                      <td className="py-2 text-right text-muted-foreground">{row.small > 0 ? `$${row.small}` : "—"}</td>
                      <td className="py-2 text-right text-muted-foreground">{row.medium > 0 ? `$${row.medium}` : "—"}</td>
                      <td className="py-2 text-right text-muted-foreground">{row.large > 0 ? `$${row.large}` : "—"}</td>
                    </tr>
                  ))}
                  <tr className="font-bold">
                    <td className="py-2">Total Infra Cost</td>
                    <td className="py-2 text-right">${INFRA_BREAKDOWN.reduce((s, r) => s + r.small, 0)}</td>
                    <td className="py-2 text-right">${INFRA_BREAKDOWN.reduce((s, r) => s + r.medium, 0)}</td>
                    <td className="py-2 text-right">${INFRA_BREAKDOWN.reduce((s, r) => s + r.large, 0)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <h2 className="text-3xl font-bold text-center mb-8">Feature Comparison</h2>
        <div className="overflow-x-auto">
          <table className="w-full border rounded-xl overflow-hidden text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900">
                <th className="text-left px-5 py-3 font-semibold">Feature</th>
                <th className="text-center px-5 py-3 font-semibold text-blue-600 w-28">Starter</th>
                <th className="text-center px-5 py-3 font-semibold text-indigo-600 w-28">Business</th>
                <th className="text-center px-5 py-3 font-semibold text-amber-600 w-28">Enterprise</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {[
                { cat: "Endpoint Management", items: [
                  { f: "Agent deployment", s: "3 formats", b: "All formats + MSI", e: "All + Docker" },
                  { f: "Device monitoring", s: true, b: true, e: true },
                  { f: "Software inventory", s: false, b: true, e: true },
                  { f: "MDM deployment", s: false, b: true, e: true },
                  { f: "Self-hosted option", s: false, b: false, e: true },
                ]},
                { cat: "Workforce Management", items: [
                  { f: "Time tracking & timesheets", s: true, b: true, e: true },
                  { f: "Attendance & leave management", s: true, b: true, e: true },
                  { f: "Project & task management", s: false, b: true, e: true },
                  { f: "Department management", s: true, b: true, e: true },
                  { f: "Employee directory", s: true, b: true, e: true },
                ]},
                { cat: "Monitoring", items: [
                  { f: "Activity tracking", s: true, b: true, e: true },
                  { f: "Productivity scoring", s: true, b: true, e: true },
                  { f: "Agent reporting pause", s: true, b: true, e: true },
                  { f: "Domain blocklists", s: "Presets only", b: "Custom import", e: "Unlimited" },
                  { f: "Host group policies", s: true, b: true, e: true },
                ]},
                { cat: "Reporting", items: [
                  { f: "Basic reports (PDF/CSV)", s: true, b: true, e: true },
                  { f: "Scheduled reports", s: false, b: true, e: true },
                  { f: "Custom report builder", s: false, b: false, e: true },
                  { f: "API access", s: false, b: true, e: true },
                ]},
                { cat: "Security & Compliance", items: [
                  { f: "MFA enforcement", s: true, b: true, e: true },
                  { f: "SSO providers", s: "2", b: "5+", e: "Unlimited + SAML" },
                  { f: "Role-based access control", s: "3 roles", b: "4 roles", e: "Custom roles" },
                  { f: "Audit log", s: "30 days", b: "90 days", e: "Full retention" },
                  { f: "CVE scanning*", s: false, b: "Add-on", e: "Add-on" },
                  { f: "Threat intelligence*", s: false, b: "Add-on", e: "Add-on" },
                  { f: "DLP policies*", s: false, b: "Add-on", e: "Add-on" },
                ]},
                { cat: "Support", items: [
                  { f: "Community forum", s: true, b: true, e: true },
                  { f: "Email support", s: "48h SLA", b: "4h SLA", e: "1h SLA" },
                  { f: "Live chat", s: false, b: true, e: true },
                  { f: "Dedicated engineer", s: false, b: false, e: true },
                  { f: "Onboarding assistance", s: false, b: "1-hour call", e: "White-glove" },
                  { f: "Custom SLA", s: false, b: false, e: true },
                ]},
              ].map((group) => (
                <>
                  <tr key={group.cat} className="bg-gray-50/50 dark:bg-gray-900/50">
                    <td colSpan={4} className="px-5 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{group.cat}</td>
                  </tr>
                  {group.items.map((item) => (
                    <tr key={item.f}>
                      <td className="px-5 py-2.5 font-medium">{item.f}</td>
                      {[item.s, item.b, item.e].map((val, vi) => (
                        <td key={vi} className="text-center px-5 py-2.5">
                          {val === true ? (
                            <Check className="h-4 w-4 text-green-500 mx-auto" />
                          ) : val === false ? (
                            <X className="h-4 w-4 text-gray-300 mx-auto" />
                          ) : (
                            <span className="text-xs font-medium">{val}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-muted-foreground mt-2">* Security features require the Security Suite add-on license</p>
        </div>
      </section>

      {/* Social Proof / Trust */}
      <section className="bg-gray-50 dark:bg-gray-900 border-y">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid sm:grid-cols-4 gap-8 text-center">
            {[
              { value: "99.9%", label: "Uptime SLA", icon: Zap },
              { value: "< 2min", label: "Agent deploy time", icon: Clock },
              { value: "SOC 2", label: "Compliance ready", icon: Lock },
              { value: "256-bit", label: "AES encryption", icon: Shield },
            ].map((stat) => (
              <div key={stat.label}>
                <stat.icon className="h-6 w-6 mx-auto mb-2 text-indigo-500" />
                <div className="text-2xl sm:text-3xl font-bold">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
        <div className="space-y-3">
          {FAQ.map((item, i) => (
            <div key={i} className="border rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
              >
                <span className="font-medium text-sm">{item.q}</span>
                {expandedFaq === i ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
              </button>
              {expandedFaq === i && (
                <div className="px-5 pb-4 text-sm text-muted-foreground">{item.a}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold">Ready to take control?</h2>
          <p className="mt-3 text-lg text-white/80">
            Start your 14-day free trial today. No credit card required.
            Deploy your first agent in under 2 minutes.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <button className="px-8 py-3 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors shadow-lg">
                Start Free Trial
              </button>
            </Link>
            <Link href="/demo">
              <button className="px-8 py-3 bg-white/10 backdrop-blur text-white rounded-lg font-semibold hover:bg-white/20 transition-colors border border-white/20">
                View Live Demo
              </button>
            </Link>
          </div>
          <p className="mt-4 text-sm text-white/60">
            Questions? Email us at sales@antifascist.work
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} MyDex. All rights reserved.</div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link href="/demo" className="hover:text-foreground transition-colors">Demo</Link>
            <Link href="/licensing" className="hover:text-foreground transition-colors font-medium text-foreground">Pricing</Link>
            <Link href="/login" className="hover:text-foreground transition-colors">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
