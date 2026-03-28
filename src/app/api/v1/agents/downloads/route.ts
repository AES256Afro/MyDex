import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/v1/agents/downloads?platform=windows&format=exe
 *
 * Redirects to Cloudflare R2-hosted agent binaries for download.
 * Files are stored in the mydex-agent-downloads R2 bucket.
 *
 * Set R2_PUBLIC_URL env var to your R2 public access domain, e.g.:
 *   https://downloads.mydexnow.com
 *   or https://pub-xxxxx.r2.dev
 */

const AGENT_VERSION = "0.3.0";

// Map of platform+format to the actual filename in R2
const ARTIFACT_MAP: Record<string, { filename: string; contentType: string }> = {
  "windows-exe": {
    filename: `MyDex-Agent-Setup-${AGENT_VERSION}.exe`,
    contentType: "application/x-msdownload",
  },
  "windows-msi": {
    filename: `MyDex-Agent-Setup-${AGENT_VERSION}.msi`,
    contentType: "application/x-msi",
  },
  "windows-zip": {
    filename: `MyDex-Agent-Setup-${AGENT_VERSION}.zip`,
    contentType: "application/zip",
  },
  "macos-dmg": {
    filename: `MyDex-Agent-Setup-${AGENT_VERSION}.dmg`,
    contentType: "application/x-apple-diskimage",
  },
  "macos-pkg": {
    filename: `MyDex-Agent-Setup-${AGENT_VERSION}.pkg`,
    contentType: "application/x-newton-compatible-pkg",
  },
  "macos-zip": {
    filename: `MyDex-Agent-Setup-${AGENT_VERSION}-mac.zip`,
    contentType: "application/zip",
  },
  "linux-deb": {
    filename: `mydex-agent_${AGENT_VERSION}_amd64.deb`,
    contentType: "application/vnd.debian.binary-package",
  },
  "linux-rpm": {
    filename: `mydex-agent-${AGENT_VERSION}.x86_64.rpm`,
    contentType: "application/x-rpm",
  },
  "linux-zip": {
    filename: `MyDex-Agent-Setup-${AGENT_VERSION}-linux.zip`,
    contentType: "application/zip",
  },
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const platform = searchParams.get("platform") || "windows";
  const format = searchParams.get("format") || "exe";

  const key = `${platform}-${format}`;
  const artifact = ARTIFACT_MAP[key];

  if (!artifact) {
    return NextResponse.json(
      {
        error: "Invalid platform/format combination",
        validCombinations: Object.keys(ARTIFACT_MAP),
      },
      { status: 400 }
    );
  }

  const r2PublicUrl = process.env.R2_PUBLIC_URL;

  if (!r2PublicUrl) {
    return NextResponse.json(
      {
        error: "Downloads not configured",
        message: "R2_PUBLIC_URL environment variable is not set. Set it to your Cloudflare R2 public access domain.",
      },
      { status: 503 }
    );
  }

  // Construct R2 download URL: {R2_PUBLIC_URL}/v{version}/{filename}
  const downloadUrl = `${r2PublicUrl.replace(/\/$/, "")}/v${AGENT_VERSION}/${artifact.filename}`;

  // Redirect to R2 for the actual file download
  return NextResponse.redirect(downloadUrl, {
    headers: {
      "X-Agent-Version": AGENT_VERSION,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
