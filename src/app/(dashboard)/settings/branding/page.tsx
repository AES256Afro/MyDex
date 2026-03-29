"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Palette, Image, Type, Loader2, CheckCircle, ArrowLeft, Eye, Replace, LayoutList } from "lucide-react";
import Link from "next/link";

const PRESET_COLORS = [
  { name: "Blue", value: "#2563eb" },
  { name: "Indigo", value: "#4f46e5" },
  { name: "Purple", value: "#7c3aed" },
  { name: "Pink", value: "#db2777" },
  { name: "Red", value: "#dc2626" },
  { name: "Orange", value: "#ea580c" },
  { name: "Amber", value: "#d97706" },
  { name: "Green", value: "#16a34a" },
  { name: "Teal", value: "#0d9488" },
  { name: "Cyan", value: "#0891b2" },
  { name: "Slate", value: "#475569" },
  { name: "Zinc", value: "#3f3f46" },
];

export default function BrandingPage() {
  const { data: session } = useSession();
  const [companyName, setCompanyName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");
  const [brandingMode, setBrandingMode] = useState<"replace" | "alongside">("replace");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/v1/settings");
        if (res.ok) {
          const data = await res.json();
          const settings = data.organization?.settings || {};
          setCompanyName(settings.companyName || data.organization?.name || "");
          setLogoUrl(settings.logoUrl || "");
          setPrimaryColor(settings.primaryColor || "");
          setBrandingMode(settings.brandingMode || "replace");
        }
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/v1/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            companyName: companyName || undefined,
            logoUrl: logoUrl || "",
            primaryColor: primaryColor || "",
            brandingMode,
          },
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch { /* ignore */ } finally {
      setSaving(false);
    }
  };

  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN";

  if (!isAdmin) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        You don&apos;t have permission to access branding settings.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-6 w-6 mx-auto animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link href="/settings" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Settings
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Palette className="h-6 w-6 text-primary" />
          Branding
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Customize how MyDex appears to your organization.</p>
      </div>

      {/* Live Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Eye className="h-4 w-4" /> Preview</CardTitle>
          <CardDescription>How your sidebar will look</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-64 border rounded-lg bg-sidebar overflow-hidden">
            <div className="flex h-14 items-center border-b px-5 gap-2">
              {logoUrl && (
                <img src={logoUrl} alt="" className="h-7 w-7 object-contain" onError={(e) => (e.currentTarget.style.display = "none")} />
              )}
              {brandingMode === "alongside" ? (
                <span className="flex items-baseline gap-1.5">
                  <span className="text-lg font-bold" style={primaryColor ? { color: primaryColor } : undefined}>MyDex</span>
                  {companyName && companyName !== "MyDex" && (
                    <span className="text-xs font-medium text-muted-foreground">| {companyName}</span>
                  )}
                </span>
              ) : (
                <span className="text-lg font-bold" style={primaryColor ? { color: primaryColor } : undefined}>
                  {companyName || "MyDex"}
                </span>
              )}
            </div>
            <div className="px-3 py-3 space-y-1">
              <div className="h-8 rounded bg-muted/50 w-full" />
              <div className="h-8 rounded bg-muted/30 w-3/4" />
              <div className="h-8 rounded bg-muted/30 w-5/6" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Name */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Type className="h-4 w-4" /> Company Name</CardTitle>
          <CardDescription>Displayed in the sidebar and navigation</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="MyDex"
            className="max-w-sm"
          />
        </CardContent>
      </Card>

      {/* Display Mode */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><LayoutList className="h-4 w-4" /> Display Mode</CardTitle>
          <CardDescription>Choose how your company name appears in the sidebar</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => setBrandingMode("replace")}
              className={`flex flex-col items-start gap-2 rounded-lg border-2 p-4 text-left transition-colors ${brandingMode === "replace" ? "border-primary bg-primary/5" : "border-muted hover:border-muted-foreground/30"}`}
            >
              <div className="flex items-center gap-2">
                <Replace className="h-4 w-4" />
                <span className="font-medium text-sm">Replace MyDex</span>
              </div>
              <span className="text-xs text-muted-foreground">Show only your company name in the sidebar</span>
              <div className="mt-1 text-sm font-bold" style={primaryColor ? { color: primaryColor } : undefined}>{companyName || "Your Company"}</div>
            </button>
            <button
              onClick={() => setBrandingMode("alongside")}
              className={`flex flex-col items-start gap-2 rounded-lg border-2 p-4 text-left transition-colors ${brandingMode === "alongside" ? "border-primary bg-primary/5" : "border-muted hover:border-muted-foreground/30"}`}
            >
              <div className="flex items-center gap-2">
                <LayoutList className="h-4 w-4" />
                <span className="font-medium text-sm">Keep MyDex</span>
              </div>
              <span className="text-xs text-muted-foreground">Show MyDex with your company name alongside</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-sm font-bold" style={primaryColor ? { color: primaryColor } : undefined}>MyDex</span>
                <span className="text-xs text-muted-foreground">| {companyName || "Your Company"}</span>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Logo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Image className="h-4 w-4" /> Logo</CardTitle>
          <CardDescription>Add your company logo (URL to an image). Recommended: 128x128px, PNG or SVG.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://example.com/logo.png"
            className="max-w-lg"
          />
          {logoUrl && (
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 rounded-lg border flex items-center justify-center bg-white">
                <img src={logoUrl} alt="Logo preview" className="h-12 w-12 object-contain" onError={(e) => (e.currentTarget.style.display = "none")} />
              </div>
              <Button variant="outline" size="sm" className="text-red-600" onClick={() => setLogoUrl("")}>Remove</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Brand Color */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Palette className="h-4 w-4" /> Brand Color</CardTitle>
          <CardDescription>Primary color used for the company name in the sidebar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={primaryColor || "#2563eb"}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="h-10 w-14 rounded border cursor-pointer"
            />
            <Input
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              placeholder="#2563eb"
              className="max-w-[140px] font-mono text-sm"
            />
            {primaryColor && (
              <Button variant="outline" size="sm" onClick={() => setPrimaryColor("")}>Reset to default</Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((color) => (
              <button
                key={color.value}
                onClick={() => setPrimaryColor(color.value)}
                className={`group relative h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${primaryColor === color.value ? "border-foreground ring-2 ring-offset-2 ring-foreground" : "border-transparent"}`}
                style={{ backgroundColor: color.value }}
                title={color.name}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
          {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : "Save Branding"}
        </Button>
        {saved && (
          <Badge className="bg-green-100 text-green-700 gap-1">
            <CheckCircle className="h-3.5 w-3.5" /> Saved! Refresh to see changes.
          </Badge>
        )}
      </div>
    </div>
  );
}
