/* eslint-disable @next/next/no-img-element */
import Link from "next/link";

const features = [
  {
    title: "Device Management & MDM",
    desc: "Connect Microsoft Intune, Jamf Pro, or Kandji to auto-assign devices, monitor compliance, and execute remote actions — lock, wipe, restart — all from one dashboard.",
    screenshot: "/screenshots/devices.png",
    demoSection: "devices",
  },
  {
    title: "IT Support & Ticketing",
    desc: "Built-in help desk with SLA tracking, priority routing, satisfaction ratings, and a self-service portal for employees to submit and track requests.",
    screenshot: "/screenshots/it-support.png",
    demoSection: "it-support",
  },
  {
    title: "Employee Onboarding & Offboarding",
    desc: "Automate checklists for IT setup, access provisioning, HR paperwork, and security tasks. Track progress per employee with one-click template initialization.",
    screenshot: "/screenshots/employees.png",
    demoSection: "employees",
  },
  {
    title: "Fleet Health & Diagnostics",
    desc: "Real-time hardware diagnostics, disk health, Windows update status, BSOD tracking, antivirus status, and performance alerts across your entire fleet.",
    screenshot: "/screenshots/fleet-health.png",
    demoSection: "fleet-health",
  },
  {
    title: "SOC 2 Compliance",
    desc: "Map your security posture to SOC 2 controls with automated scoring, audit recommendations, evidence collection, and continuous monitoring dashboards.",
    screenshot: "/screenshots/compliance.png",
    demoSection: "compliance",
  },
  {
    title: "Activity Monitoring & Productivity",
    desc: "Track app usage, website visits, file activity, and engagement levels. AI-powered productivity scoring with team comparisons and trend analysis.",
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
    title: "Security & DLP",
    desc: "Insider threat detection, data loss prevention policies, USB monitoring, host-based firewall and domain blocking, CVE tracking, and full audit logs.",
    screenshot: "/screenshots/security.png",
    demoSection: "security",
  },
  {
    title: "Software Inventory",
    desc: "Track every application installed across your fleet. Identify unauthorized software, manage licenses, and enforce software policies at scale.",
    screenshot: "/screenshots/software-inventory.png",
    demoSection: "software-inventory",
  },
];

const stats = [
  { value: "30+", label: "Built-in Modules" },
  { value: "3", label: "MDM Integrations" },
  { value: "100%", label: "Open Source" },
  { value: "<5min", label: "Setup Time" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
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
              Device management, IT support, activity monitoring, compliance, and productivity
              analytics — unified in one platform built for small and mid-size businesses.
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
            From device enrollment to compliance audits, MyDex replaces the patchwork of tools
            your IT team juggles every day.
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
          Project management, reports, SSO, MFA, branding customization, agent deployment, and more.
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
            See how MyDex can streamline your IT operations, keep your team productive,
            and give you visibility across every device and employee.
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
