"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Turnstile } from "@marsidev/react-turnstile";
import {
  Building2,
  Mail,
  Phone,
  User,
  Briefcase,
  Globe,
  Send,
  CheckCircle,
  ArrowLeft,
  Loader2,
} from "lucide-react";

const countries = [
  "United States", "Canada", "United Kingdom", "Australia", "Germany", "France",
  "Netherlands", "Sweden", "Norway", "Denmark", "Finland", "Ireland", "Japan",
  "South Korea", "Singapore", "India", "Brazil", "Mexico", "Spain", "Italy",
  "Switzerland", "Austria", "Belgium", "New Zealand", "South Africa", "Other",
];

export default function ContactPage() {
  const [form, setForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    companyName: "",
    jobTitle: "",
    country: "",
    phone: "",
    companySize: "",
    message: "",
  });
  const [turnstileToken, setTurnstileToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/v1/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, turnstileToken }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit");
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const updateField = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
            <Link href="/" className="text-2xl font-bold text-primary">MyDex</Link>
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">Sign in</Link>
              <Link href="/demo" className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">Live Demo</Link>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-2xl px-4 py-24 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-foreground">Thank you!</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            We&apos;ve received your request and our team will reach out within one business day to discuss how MyDex can transform your employee experience.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-md border border-border px-6 py-3 text-sm font-medium text-foreground hover:bg-accent"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
            <Link
              href="/demo"
              className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Explore the Demo
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link href="/" className="text-2xl font-bold text-primary">MyDex</Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">Sign in</Link>
            <Link href="/demo" className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">Live Demo</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-16">
        <div className="grid gap-12 lg:grid-cols-2">
          {/* Left side — messaging */}
          <div className="flex flex-col justify-center">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Start Your New Digital<br />Employee Experience
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              See how MyDex can help you manage devices, monitor productivity, streamline IT support,
              and stay compliant — all from one platform built for modern teams.
            </p>

            <div className="mt-10 space-y-6">
              {[
                { icon: Building2, title: "Built for Small & Mid-Size Businesses", desc: "Everything you need without enterprise complexity or pricing." },
                { icon: Globe, title: "MDM Integration", desc: "Connect Intune, Jamf, or Kandji to auto-assign devices and manage your fleet." },
                { icon: Briefcase, title: "Onboarding to Offboarding", desc: "Automate employee lifecycle tasks, device provisioning, and access management." },
              ].map((item) => (
                <div key={item.title} className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 rounded-lg border border-border bg-muted/30 p-6">
              <p className="text-sm font-medium text-foreground">
                &ldquo;MyDex replaced three separate tools for us — device management, time tracking,
                and IT support — into one dashboard our whole team actually uses.&rdquo;
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                — IT Director, 85-person SaaS company
              </p>
            </div>
          </div>

          {/* Right side — form */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-xl">Get in Touch</CardTitle>
              <p className="text-sm text-muted-foreground">
                Fill out the form below and our team will reach out within one business day.
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <div>
                  <Label htmlFor="email" className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    Email Address <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    className="mt-1.5"
                    placeholder="you@company.com"
                  />
                </div>

                {/* Name row */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="firstName" className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" />
                      First Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="firstName"
                      required
                      value={form.firstName}
                      onChange={(e) => updateField("firstName", e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName" className="flex items-center gap-1.5">
                      Last Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="lastName"
                      required
                      value={form.lastName}
                      onChange={(e) => updateField("lastName", e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                </div>

                {/* Company row */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="companyName" className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5" />
                      Company Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="companyName"
                      required
                      value={form.companyName}
                      onChange={(e) => updateField("companyName", e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="jobTitle" className="flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5" />
                      Job Title <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="jobTitle"
                      required
                      value={form.jobTitle}
                      onChange={(e) => updateField("jobTitle", e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                </div>

                {/* Country */}
                <div>
                  <Label htmlFor="country" className="flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5" />
                    Country <span className="text-red-500">*</span>
                  </Label>
                  <select
                    id="country"
                    required
                    value={form.country}
                    onChange={(e) => updateField("country", e.target.value)}
                    className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Select...</option>
                    {countries.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Phone */}
                <div>
                  <Label htmlFor="phone" className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    Phone Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    className="mt-1.5"
                  />
                </div>

                {/* Company size */}
                <div>
                  <Label htmlFor="companySize">Company Size</Label>
                  <select
                    id="companySize"
                    value={form.companySize}
                    onChange={(e) => updateField("companySize", e.target.value)}
                    className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Select...</option>
                    <option value="1-10">1–10 employees</option>
                    <option value="11-50">11–50 employees</option>
                    <option value="51-200">51–200 employees</option>
                    <option value="201-500">201–500 employees</option>
                    <option value="500+">500+ employees</option>
                  </select>
                </div>

                {/* Message */}
                <div>
                  <Label htmlFor="message">Anything else we should know?</Label>
                  <textarea
                    id="message"
                    value={form.message}
                    onChange={(e) => updateField("message", e.target.value)}
                    rows={3}
                    className="mt-1.5 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="Tell us about your team, challenges, or what you're looking for..."
                  />
                </div>

                {error && (
                  <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
                )}

                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    <span className="text-red-500">*</span> Required Fields
                  </p>
                  <Button type="submit" disabled={submitting || !turnstileToken}>
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        SUBMIT
                      </>
                    )}
                  </Button>
                </div>

                <div className="flex justify-center pt-2">
                  <Turnstile
                    siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "1x00000000000000000000AA"}
                    onSuccess={setTurnstileToken}
                    options={{ theme: "light", size: "normal" }}
                  />
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
