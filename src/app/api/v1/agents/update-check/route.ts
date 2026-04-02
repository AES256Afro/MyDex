import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/v1/agents/update-check?version=0.2.0&platform=win32
 *
 * Returns update info if a newer agent version is available.
 * Called by the desktop agent on startup and periodically.
 */

const LATEST_VERSION = "0.3.0";

const DOWNLOAD_MAP: Record<string, { format: string; platform: string }> = {
  win32: { format: "exe", platform: "windows" },
  darwin: { format: "dmg", platform: "macos" },
  linux: { format: "deb", platform: "linux" },
};

function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const currentVersion = searchParams.get("version") || "0.0.0";
  const platform = searchParams.get("platform") || "win32";

  const updateAvailable = compareVersions(LATEST_VERSION, currentVersion) > 0;

  if (!updateAvailable) {
    return NextResponse.json({
      updateAvailable: false,
      currentVersion,
      latestVersion: LATEST_VERSION,
    });
  }

  const r2PublicUrl = process.env.R2_PUBLIC_URL;
  const downloadInfo = DOWNLOAD_MAP[platform] || DOWNLOAD_MAP.win32;
  const downloadUrl = r2PublicUrl
    ? `/api/v1/agents/downloads?platform=${downloadInfo.platform}&format=${downloadInfo.format}`
    : null;

  return NextResponse.json({
    updateAvailable: true,
    currentVersion,
    latestVersion: LATEST_VERSION,
    downloadUrl,
    releaseNotes: `MyDex Agent ${LATEST_VERSION} includes performance improvements, enhanced diagnostics, and auto-update support.`,
    mandatory: false,
  });
}
