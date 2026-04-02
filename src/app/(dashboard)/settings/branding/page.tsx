"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRequireRole } from "@/hooks/use-require-role";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Palette,
  Image as ImageIcon,
  Type,
  Loader2,
  CheckCircle,
  ArrowLeft,
  Eye,
  Replace,
  LayoutList,
  Upload,
  X,
  Globe,
  PanelTop,
} from "lucide-react";
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
  const { authorized } = useRequireRole("ADMIN");
  const { data: session } = useSession();
  const [companyName, setCompanyName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");
  const [brandingMode, setBrandingMode] = useState<"replace" | "alongside">("replace");
  const [favicon, setFavicon] = useState("");
  const [faviconDomain, setFaviconDomain] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [fetchingFavicon, setFetchingFavicon] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/v1/settings");
        if (res.ok) {
          const data = await res.json();
          const settings = data.organization?.settings || {};
          setCompanyName(settings.companyName || data.organization?.name || "");
          setLogoUrl(settings.logoUrl || "");
          setBannerUrl(settings.bannerUrl || "");
          setPrimaryColor(settings.primaryColor || "");
          setBrandingMode(settings.brandingMode || "replace");
          setFavicon(settings.favicon || "");
        }
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleUpload = async (file: File, field: "logoUrl" | "bannerUrl" | "favicon") => {
    setUploading(field);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("field", field);

      const res = await fetch("/api/v1/branding/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (field === "logoUrl") setLogoUrl(data.url);
        else if (field === "bannerUrl") setBannerUrl(data.url);
        else if (field === "favicon") setFavicon(data.url);
      } else {
        const err = await res.json();
        alert(err.error || "Upload failed");
      }
    } catch {
      alert("Upload failed");
    } finally {
      setUploading(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, field: "logoUrl" | "bannerUrl") => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file, field);
    e.target.value = "";
  };

  const handleFetchFavicon = async () => {
    if (!faviconDomain.trim()) return;
    setFetchingFavicon(true);
    try {
      const res = await fetch(`/api/v1/branding/favicon?url=${encodeURIComponent(faviconDomain.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setFavicon(data.faviconUrl);
        // Also save it to org settings
        await fetch("/api/v1/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ settings: { favicon: data.faviconUrl } }),
        });
      } else {
        const err = await res.json();
        alert(err.error || "Failed to fetch favicon");
      }
    } catch {
      alert("Failed to fetch favicon");
    } finally {
      setFetchingFavicon(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      // Only include image URLs in the payload if they are external URLs (not base64 data).
      // Base64 data URLs are already saved by the upload API — re-sending them
      // in JSON would bloat the request body and may exceed size limits.
      const settings: Record<string, unknown> = {
        companyName: companyName || undefined,
        primaryColor: primaryColor || "",
        brandingMode,
      };
      // For each image field, send the value only if it's not a data URL (external URL or empty to clear)
      if (!logoUrl.startsWith("data:")) settings.logoUrl = logoUrl || "";
      if (!bannerUrl.startsWith("data:")) settings.bannerUrl = bannerUrl || "";
      if (!favicon.startsWith("data:")) settings.favicon = favicon || "";

      const res = await fetch("/api/v1/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch { /* ignore */ } finally {
      setSaving(false);
    }
  };

  if (!authorized) return null;

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
            {bannerUrl && (
              <div className="overflow-hidden border-b">
                <img src={bannerUrl} alt="" className="w-full h-auto object-cover max-h-16" onError={(e) => (e.currentTarget.style.display = "none")} />
              </div>
            )}
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

      {/* Logo Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><ImageIcon className="h-4 w-4" /> Logo</CardTitle>
          <CardDescription>Upload your company logo for the sidebar. Recommended: 128x128px, PNG or SVG. Max 512KB.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif"
            className="hidden"
            onChange={(e) => handleFileSelect(e, "logoUrl")}
          />
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <div className="h-16 w-16 rounded-lg border flex items-center justify-center bg-white dark:bg-gray-800">
                <img src={logoUrl} alt="Logo preview" className="h-12 w-12 object-contain" onError={(e) => (e.currentTarget.style.display = "none")} />
              </div>
            ) : (
              <div className="h-16 w-16 rounded-lg border border-dashed flex items-center justify-center text-muted-foreground">
                <ImageIcon className="h-6 w-6" />
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => logoInputRef.current?.click()}
                disabled={uploading === "logoUrl"}
              >
                {uploading === "logoUrl" ? (
                  <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Uploading...</>
                ) : (
                  <><Upload className="h-3.5 w-3.5 mr-1.5" /> Upload Logo</>
                )}
              </Button>
              {logoUrl && (
                <Button variant="outline" size="sm" className="text-red-600" onClick={() => setLogoUrl("")}>
                  <X className="h-3.5 w-3.5 mr-1" /> Remove
                </Button>
              )}
            </div>
          </div>
          <div className="text-xs text-muted-foreground">Or paste an image URL:</div>
          <Input
            value={logoUrl.startsWith("data:") ? "" : logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://example.com/logo.png"
            className="max-w-lg"
          />
        </CardContent>
      </Card>

      {/* Banner Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><PanelTop className="h-4 w-4" /> Sidebar Banner</CardTitle>
          <CardDescription>Optional banner image displayed at the top of the sidebar. Recommended: 256x96px, PNG. Max 512KB. Leave empty to keep the default look.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif"
            className="hidden"
            onChange={(e) => handleFileSelect(e, "bannerUrl")}
          />
          {bannerUrl ? (
            <div className="rounded-lg border overflow-hidden max-w-md bg-white dark:bg-gray-800">
              <img src={bannerUrl} alt="Banner preview" className="w-full h-auto object-cover max-h-24" onError={(e) => (e.currentTarget.style.display = "none")} />
            </div>
          ) : (
            <div className="rounded-lg border border-dashed max-w-md h-20 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <PanelTop className="h-6 w-6 mx-auto mb-1" />
                <span className="text-xs">No banner uploaded</span>
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => bannerInputRef.current?.click()}
              disabled={uploading === "bannerUrl"}
            >
              {uploading === "bannerUrl" ? (
                <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Uploading...</>
              ) : (
                <><Upload className="h-3.5 w-3.5 mr-1.5" /> Upload Banner</>
              )}
            </Button>
            {bannerUrl && (
              <Button variant="outline" size="sm" className="text-red-600" onClick={() => setBannerUrl("")}>
                <X className="h-3.5 w-3.5 mr-1" /> Remove Banner
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Favicon */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Globe className="h-4 w-4" /> Favicon</CardTitle>
          <CardDescription>Pull a favicon from any website URL, or upload your own.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-3">
            <div className="flex-1 max-w-sm">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Website URL</label>
              <Input
                value={faviconDomain}
                onChange={(e) => setFaviconDomain(e.target.value)}
                placeholder="e.g. google.com or https://yoursite.com"
                onKeyDown={(e) => e.key === "Enter" && handleFetchFavicon()}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleFetchFavicon}
              disabled={fetchingFavicon || !faviconDomain.trim()}
              className="h-9"
            >
              {fetchingFavicon ? (
                <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Fetching...</>
              ) : (
                <><Globe className="h-3.5 w-3.5 mr-1.5" /> Fetch Favicon</>
              )}
            </Button>
          </div>
          {favicon && (
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg border flex items-center justify-center bg-white dark:bg-gray-800">
                <img src={favicon} alt="Favicon preview" className="h-8 w-8 object-contain" onError={(e) => (e.currentTarget.style.display = "none")} />
              </div>
              <Button variant="outline" size="sm" className="text-red-600" onClick={() => setFavicon("")}>
                <X className="h-3.5 w-3.5 mr-1" /> Remove
              </Button>
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
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 gap-1">
            <CheckCircle className="h-3.5 w-3.5" /> Saved! Refresh to see changes.
          </Badge>
        )}
      </div>
    </div>
  );
}
