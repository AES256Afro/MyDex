import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <h1 className="text-2xl font-bold text-primary">MyDex</h1>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-24 text-center">
        <h2 className="text-5xl font-bold tracking-tight text-foreground">
          Employee Monitoring &<br />
          Productivity Management
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Track workforce activities, enhance efficiency, strengthen security,
          and improve workplace transparency. Built for small businesses.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link
            href="/register"
            className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Start Free Trial
          </Link>
          <Link
            href="/demo"
            className="rounded-md border border-border px-6 py-3 text-sm font-medium text-foreground hover:bg-accent"
          >
            Live Demo
          </Link>
        </div>

        <div id="features" className="mt-32 grid gap-8 md:grid-cols-3">
          {[
            {
              title: "Time Tracking",
              desc: "Clock in/out, timesheets, overtime tracking, and active/idle time detection.",
            },
            {
              title: "Activity Monitoring",
              desc: "Track app usage, website visits, and engagement levels in real-time.",
            },
            {
              title: "Attendance Management",
              desc: "Automated attendance tracking, leave management, and payroll integration.",
            },
            {
              title: "Project Management",
              desc: "Task planning, Kanban boards, milestones, and resource allocation.",
            },
            {
              title: "Security & Compliance",
              desc: "Insider threat detection, DLP policies, audit logs, and encryption.",
            },
            {
              title: "AI Analytics",
              desc: "Productivity scoring, engagement insights, and automated reports.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="rounded-lg border border-border p-6 text-left"
            >
              <h3 className="text-lg font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
