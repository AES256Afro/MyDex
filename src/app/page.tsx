/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "MyDex - The Complete Digital Employee Experience Platform",
  description:
    "Real-time monitoring, proactive issue resolution, OS compliance, and DEX scoring — unified in one platform that identifies and resolves IT issues before they impact employees.",
  alternates: {
    canonical: "https://mydexnow.com",
  },
};

const features = [
  {
    title: "Real-Time Monitoring & DEX Scores",
    desc: "Continuous, real-time data collection across all devices and locations. DEX scores quantify the digital employee experience, populating live dashboards with proactive alerts prioritized by impact.",
    screenshot: "/screenshots/fleet-health.png",
    demoSection: "fleet-health",
  },
  {
    title: "Device Management & MDM",
    desc: "Connect Microsoft Intune, Jamf Pro, or Kandji to auto-assign devices. Real-time agent visibility across Windows and macOS, with OS compliance cross-checking and automated remediation.",
    screenshot: "/screenshots/devices.png",
    demoSection: "devices",
  },
  {
    title: "Proactive Issue Resolution",
    desc: "Identify the context, scope, and impact of issues before they escalate. Automated recommendations diagnose problems across affected users, with one-click remediation for common IT issues.",
    screenshot: "/screenshots/it-support.png",
    demoSection: "it-support",
  },
  {
    title: "Fleet Health & OS Compliance",
    desc: "All-in-one view of your OS landscape across Windows and macOS. Cross-check patch compatibility, monitor agent status, and eliminate blind spots from faulty agents hiding devices from management.",
    screenshot: "/screenshots/fleet-health.png",
    demoSection: "fleet-health",
  },
  {
    title: "SOC 2 Compliance & Security",
    desc: "Map your security posture to SOC 2 controls with automated scoring, evidence collection, and continuous monitoring. Insider threat detection, DLP policies, USB monitoring, and CVE tracking.",
    screenshot: "/screenshots/compliance.png",
    demoSection: "compliance",
  },
  {
    title: "Activity Monitoring & Productivity",
    desc: "Track app usage, website visits, file activity, and engagement levels. Machine-learning pattern spotting identifies anomalies and accelerates troubleshooting across your organization.",
    screenshot: "/screenshots/productivity.png",
    demoSection: "productivity",
  },
  {
    title: "Time Tracking & Attendance",
    desc: "Clock in/out with geolocation, automated timesheets, overtime tracking, leave management, and payroll-ready reports.",
    screenshot: "/screenshots/time-tracking.png",
    demoSection: "time-tracking",
  },
  {
    title: "Alert Thresholds & Automation",
    desc: "Customize alert thresholds and workflows, seamlessly integrating with third-party systems. Minimize manual intervention with automated flows that remediate issues across endpoints in seconds.",
    screenshot: "/screenshots/security.png",
    demoSection: "security",
  },
  {
    title: "Cost Optimization & Sustainability",
    desc: "Execute cost-saving decisions across IT initiatives by proactively identifying opportunities. Leverage data-driven insights to reduce environmental impact and optimize your digital workplace.",
    screenshot: "/screenshots/software-inventory.png",
    demoSection: "software-inventory",
  },
];

const stats = [
  { value: "30+", label: "Built-in Modules" },
  { value: "DEX", label: "Experience Scoring" },
  { value: "3", label: "MDM Integrations" },
  { value: "100%", label: "Open Source" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "MyDex",
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            description:
              "Open-source digital employee experience platform with real-time monitoring, device management, and productivity analytics.",
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "USD",
              description: "Open source - free to self-host",
            },
            featureList: [
              "Real-time device monitoring",
              "DEX scoring",
              "MDM integration",
              "SOC 2 compliance",
              "Productivity analytics",
              "Time tracking",
              "Fleet health management",
            ],
          }),
        }}
      />
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <h1 className="text-2xl font-bold text-primary">MyDex</h1>
          <nav className="hidden items-center gap-6 md:flex">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground">Features</a>
            <a href="#screenshots" className="text-sm font-medium text-muted-foreground hover:text-foreground">Product</a>
            <Link href="/demo" className="text-sm font-medium text-muted-foreground hover:text-foreground">Demo</Link>
            <Link href="/licensing" className="text-sm font-medium text-muted-foreground hover:text-foreground">Pricing</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Sign in
            </Link>
            <Link
              href="/contact"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 py-24 text-center sm:py-32">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
              The Complete Digital<br />Employee Experience
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              Real-time monitoring, proactive issue resolution, OS compliance, and DEX scoring —
              unified in one platform that identifies and resolves IT issues before they impact employees.
            </p>
            <p className="mt-10 text-lg font-semibold text-foreground">
              Start your new digital employee experience.
            </p>
            <div className="mt-4 flex items-center justify-center gap-4">
              <Link
                href="/contact"
                className="rounded-md bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
              >
                Contact Us
              </Link>
              <Link
                href="/demo"
                className="rounded-md border border-border px-8 py-3.5 text-sm font-semibold text-foreground hover:bg-accent"
              >
                Live Demo
              </Link>
            </div>
          </div>

          {/* Hero screenshot */}
          <Link href="/demo?section=dashboard" className="relative mx-auto mt-16 block max-w-5xl">
            <div className="overflow-hidden rounded-xl border border-border shadow-2xl">
              <img
                src="/screenshots/dashboard.png"
                alt="MyDex Dashboard"
                className="w-full"
              />
            </div>
            <div className="absolute -bottom-4 -left-4 -right-4 h-24 bg-gradient-to-t from-background to-transparent" />
          </Link>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-4 py-12 sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl font-bold text-primary">{stat.value}</div>
              <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Feature grid */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-24">
        <div className="text-center">
          <h3 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Everything You Need to Manage Your Team
          </h3>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Efficiently monitor all facets of the digital employee experience in real-time,
            proactively identifying and resolving issues before they escalate into major incidents.
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-xl border border-border bg-card p-6 transition-shadow hover:shadow-lg"
            >
              <h4 className="text-lg font-semibold text-foreground">{feature.title}</h4>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Screenshots showcase */}
      <section id="screenshots" className="border-t bg-muted/20 py-24">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center">
            <h3 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              See It in Action
            </h3>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Real product screenshots — no mockups, no renderings. What you see is what you get.
            </p>
          </div>

          <div className="mt-16 space-y-24">
            {features.slice(0, 6).map((feature, i) => (
              <div
                key={feature.title}
                className={`flex flex-col items-center gap-10 lg:flex-row ${
                  i % 2 === 1 ? "lg:flex-row-reverse" : ""
                }`}
              >
                <div className="flex-1 space-y-4">
                  <h4 className="text-2xl font-bold text-foreground">{feature.title}</h4>
                  <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
                  <Link
                    href={`/demo?section=${feature.demoSection}`}
                    className="inline-flex items-center text-sm font-medium text-primary hover:underline"
                  >
                    Try it in the demo &rarr;
                  </Link>
                </div>
                <div className="flex-1">
                  <Link href={`/demo?section=${feature.demoSection}`}>
                    <div className="overflow-hidden rounded-xl border border-border shadow-lg transition-shadow hover:shadow-xl cursor-pointer">
                      <img
                        src={feature.screenshot}
                        alt={feature.title}
                        className="w-full transition-transform hover:scale-[1.02]"
                      />
                    </div>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* More screenshots grid */}
      <section className="mx-auto max-w-7xl px-4 py-24">
        <h3 className="text-center text-2xl font-bold text-foreground">And Much More</h3>
        <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
          Project management, automated workflows, alert thresholds, sustainability insights, and comprehensive reporting.
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { src: "/screenshots/projects.png", label: "Project Management", section: "projects" },
            { src: "/screenshots/kanban-board.png", label: "Kanban Board", section: "projects" },
            { src: "/screenshots/reports.png", label: "Reports & Analytics", section: "reports" },
            { src: "/screenshots/attendance.png", label: "Attendance Tracking", section: "attendance" },
            { src: "/screenshots/dlp.png", label: "DLP Policies", section: "dlp" },
            { src: "/screenshots/settings.png", label: "Settings & Configuration", section: "settings" },
          ].map((item) => (
            <Link key={item.label} href={`/demo?section=${item.section}`} className="group overflow-hidden rounded-xl border border-border hover:shadow-lg transition-shadow">
              <div className="overflow-hidden">
                <img
                  src={item.src}
                  alt={item.label}
                  className="w-full transition-transform group-hover:scale-[1.02]"
                />
              </div>
              <div className="border-t bg-card px-4 py-3">
                <p className="text-sm font-medium text-foreground">{item.label}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA section */}
      <section className="border-t bg-primary/5">
        <div className="mx-auto max-w-4xl px-4 py-24 text-center">
          <h3 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Want to Know More?
          </h3>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Leverage MyDex&apos;s comprehensive, employee-centric platform to proactively resolve issues,
            optimize costs, and ensure seamless digital experiences across your entire organization.
          </p>
          <p className="mt-8 text-lg font-semibold text-foreground">
            Start your new digital employee experience.
          </p>
          <div className="mt-4 flex items-center justify-center gap-4">
            <Link
              href="/contact"
              className="rounded-md bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              Contact Us
            </Link>
            <Link
              href="/demo"
              className="rounded-md border border-border px-8 py-3.5 text-sm font-semibold text-foreground hover:bg-accent"
            >
              Live Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <h4 className="text-lg font-bold text-primary">MyDex</h4>
              <p className="mt-2 text-sm text-muted-foreground">
                The complete digital employee experience platform for modern teams.
              </p>
            </div>
            <div>
              <h5 className="text-sm font-semibold text-foreground">Product</h5>
              <ul className="mt-3 space-y-2">
                <li><a href="#features" className="text-sm text-muted-foreground hover:text-foreground">Features</a></li>
                <li><Link href="/demo" className="text-sm text-muted-foreground hover:text-foreground">Live Demo</Link></li>
                <li><Link href="/licensing" className="text-sm text-muted-foreground hover:text-foreground">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h5 className="text-sm font-semibold text-foreground">Company</h5>
              <ul className="mt-3 space-y-2">
                <li><Link href="/contact" className="text-sm text-muted-foreground hover:text-foreground">Contact Sales</Link></li>
              </ul>
            </div>
            <div>
              <h5 className="text-sm font-semibold text-foreground">Get Started</h5>
              <ul className="mt-3 space-y-2">
                <li><Link href="/contact" className="text-sm text-muted-foreground hover:text-foreground">Request a Demo</Link></li>
                <li><Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">Sign In</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 border-t pt-6 text-center text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} MyDex. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
