import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import path from "path";

/**
 * GET /api/v1/agents/downloads?platform=windows&format=exe
 *
 * Serves pre-built agent binaries for download.
 * Files are located in /agent/dist/ directory.
 */

const AGENT_VERSION = "0.3.0";

// Map of platform+format to the actual filename in agent/dist/
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

  // Resolve path to agent/dist/
  const distDir = path.resolve(process.cwd(), "agent", "dist");
  const filePath = path.join(distDir, artifact.filename);

  // Security: ensure we're not traversing outside dist/
  if (!filePath.startsWith(distDir)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  try {
    const fileStat = await stat(filePath);
    const fileBuffer = await readFile(filePath);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": artifact.contentType,
        "Content-Disposition": `attachment; filename="${artifact.filename}"`,
        "Content-Length": fileStat.size.toString(),
        "Cache-Control": "public, max-age=3600",
        "X-Agent-Version": AGENT_VERSION,
      },
    });
  } catch {
    return NextResponse.json(
      {
        error: "Build not available",
        message: `The ${platform} ${format} build has not been generated yet. Run 'npm run build:win' (or build:mac/build:linux) in the agent/ directory to create it.`,
        filename: artifact.filename,
      },
      { status: 404 }
    );
  }
}
