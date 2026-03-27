import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const importSchema = z.object({
  keyword: z.string().min(1, "Search keyword required"),
  maxResults: z.number().min(1).max(100).default(20),
  osFilters: z.array(z.string()).optional(),
  minYear: z.number().min(1999).max(2030).optional(),
});

// Map CVSS v3.1 severity string to our enum
function mapSeverity(cvssScore: number): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
  if (cvssScore >= 9.0) return "CRITICAL";
  if (cvssScore >= 7.0) return "HIGH";
  if (cvssScore >= 4.0) return "MEDIUM";
  return "LOW";
}

interface NvdCveItem {
  cve: {
    id: string;
    descriptions: Array<{ lang: string; value: string }>;
    metrics?: {
      cvssMetricV31?: Array<{
        cvssData: {
          baseScore: number;
          baseSeverity: string;
        };
      }>;
      cvssMetricV2?: Array<{
        cvssData: {
          baseScore: number;
        };
      }>;
    };
    configurations?: Array<{
      nodes: Array<{
        cpeMatch: Array<{
          criteria: string;
          versionEndIncluding?: string;
          versionEndExcluding?: string;
          versionStartIncluding?: string;
        }>;
      }>;
    }>;
  };
}

// Blocked Windows versions — anything Windows 10 or older
const BLOCKED_WINDOWS_CPE_PRODUCTS = [
  "windows_10",
  "windows_8.1",
  "windows_8",
  "windows_7",
  "windows_vista",
  "windows_xp",
  "windows_2000",
  "windows_server_2019",
  "windows_server_2016",
  "windows_server_2012",
  "windows_server_2008",
  "windows_server_2003",
  "windows_rt",
  "windows_rt_8.1",
  "windows_me",
  "windows_98",
  "windows_95",
  "windows_nt",
];

// OS filter sets: which CPE products to ALLOW for each OS checkbox
const OS_CPE_ALLOWLISTS: Record<string, string[]> = {
  windows11: ["windows_11"],
  windowsServer2022: ["windows_server_2022", "windows_server_2025"],
  macOS: ["macos", "mac_os_x", "mac_os"],
  linux: ["linux_kernel", "linux", "ubuntu", "debian", "fedora", "rhel", "centos", "suse", "arch_linux"],
};

// Description keywords that map to each OS filter
const OS_DESCRIPTION_KEYWORDS: Record<string, string[]> = {
  windows11: ["windows 11"],
  windowsServer2022: ["windows server 2022", "windows server 2025"],
  macOS: ["macos", "mac os x", "mac os", "apple mac"],
  linux: ["linux", "ubuntu", "debian", "fedora", "red hat", "centos", "suse"],
};

function matchesOsFilters(item: NvdCveItem, osFilters?: string[]): boolean {
  // No filters = allow everything (but still block old Windows)
  const nodes = item.cve.configurations?.[0]?.nodes || [];
  const allCpeProducts: string[] = [];

  for (const node of nodes) {
    for (const match of node.cpeMatch || []) {
      const parts = match.criteria.split(":");
      if (parts.length >= 5) {
        allCpeProducts.push(parts[4].toLowerCase());
      }
    }
  }

  // Always block old Windows versions if CPE data exists
  for (const product of allCpeProducts) {
    if (BLOCKED_WINDOWS_CPE_PRODUCTS.some((blocked) => product.includes(blocked))) {
      return false;
    }
  }

  // If OS filters are active, strictly validate
  if (osFilters && osFilters.length > 0) {
    const allowedCpeProducts: string[] = [];
    const allowedDescKeywords: string[] = [];
    for (const filter of osFilters) {
      const cpeList = OS_CPE_ALLOWLISTS[filter];
      if (cpeList) allowedCpeProducts.push(...cpeList);
      const descList = OS_DESCRIPTION_KEYWORDS[filter];
      if (descList) allowedDescKeywords.push(...descList);
    }

    // Check CPE data first
    if (allCpeProducts.length > 0) {
      const hasMatch = allCpeProducts.some((product) =>
        allowedCpeProducts.some((allowed) => product.includes(allowed))
      );
      if (!hasMatch) return false;
    } else {
      // No CPE data — fall back to checking description text
      const description = (
        item.cve.descriptions.find((d) => d.lang === "en")?.value ||
        item.cve.descriptions[0]?.value ||
        ""
      ).toLowerCase();

      const descriptionMatchesOs = allowedDescKeywords.some((kw) =>
        description.includes(kw)
      );
      if (!descriptionMatchesOs) return false;

      // Also block if description mentions old Windows
      const blockedDescKeywords = [
        "windows 10", "windows 8", "windows 7", "windows vista",
        "windows xp", "windows 2000", "windows server 2019",
        "windows server 2016", "windows server 2012", "windows server 2008",
        "windows server 2003",
      ];
      const mentionsOldWindows = blockedDescKeywords.some((kw) =>
        description.includes(kw)
      );
      if (mentionsOldWindows) return false;
    }
  }

  return true;
}

function extractSoftwareInfo(item: NvdCveItem): {
  software: string;
  versions: string;
} {
  const nodes = item.cve.configurations?.[0]?.nodes || [];
  for (const node of nodes) {
    for (const match of node.cpeMatch || []) {
      // CPE format: cpe:2.3:a:vendor:product:version:...
      const parts = match.criteria.split(":");
      if (parts.length >= 5) {
        const vendor = parts[3];
        const product = parts[4];
        const software = `${vendor}/${product}`;

        const versionParts: string[] = [];
        if (match.versionStartIncluding)
          versionParts.push(`>= ${match.versionStartIncluding}`);
        if (match.versionEndExcluding)
          versionParts.push(`< ${match.versionEndExcluding}`);
        if (match.versionEndIncluding)
          versionParts.push(`<= ${match.versionEndIncluding}`);

        return {
          software,
          versions: versionParts.length > 0 ? versionParts.join(", ") : "*",
        };
      }
    }
  }
  return { software: "Unknown", versions: "*" };
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "security:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = importSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { keyword, maxResults, osFilters, minYear } = parsed.data;
    const orgId = session.user.organizationId;

    // Known CPE name mappings for common OS/product searches
    const CPE_MAPPINGS: Record<string, string> = {
      "windows 11": "cpe:2.3:o:microsoft:windows_11:*:*:*:*:*:*:*:*",
      "windows server 2022": "cpe:2.3:o:microsoft:windows_server_2022:*:*:*:*:*:*:*:*",
      "windows server 2025": "cpe:2.3:o:microsoft:windows_server_2025:*:*:*:*:*:*:*:*",
      "macos": "cpe:2.3:o:apple:macos:*:*:*:*:*:*:*:*",
      "mac os": "cpe:2.3:o:apple:macos:*:*:*:*:*:*:*:*",
      "chrome": "cpe:2.3:a:google:chrome:*:*:*:*:*:*:*:*",
      "firefox": "cpe:2.3:a:mozilla:firefox:*:*:*:*:*:*:*:*",
      "edge": "cpe:2.3:a:microsoft:edge:*:*:*:*:*:*:*:*",
      "office": "cpe:2.3:a:microsoft:office:*:*:*:*:*:*:*:*",
    };

    // Fetch from NIST NVD API v2.0
    const nvdUrl = new URL("https://services.nvd.nist.gov/rest/json/cves/2.0");

    // Always use keyword search — cpeName with wildcards returns 404
    nvdUrl.searchParams.set("keywordSearch", keyword);

    nvdUrl.searchParams.set("resultsPerPage", String(maxResults));

    // Add date range — only fetch CVEs published from minYear onward
    // NVD API requires ISO 8601 format with timezone offset
    if (minYear) {
      nvdUrl.searchParams.set("pubStartDate", `${minYear}-01-01T00:00:00.000-00:00`);
      nvdUrl.searchParams.set("pubEndDate", `${minYear + 1}-12-31T23:59:59.999-00:00`);
    }

    const nvdRes = await fetch(nvdUrl.toString(), {
      headers: {
        "User-Agent": "MyDex-Security-Scanner/1.0",
      },
    });

    if (!nvdRes.ok) {
      const text = await nvdRes.text();
      console.error("NVD API error:", nvdRes.status, text);
      return NextResponse.json(
        {
          error: `NVD API returned ${nvdRes.status}. The NVD API has rate limits (5 requests per 30 seconds without an API key). Please wait and try again.`,
        },
        { status: 502 }
      );
    }

    const nvdData = await nvdRes.json();
    const vulnerabilities: NvdCveItem[] = nvdData.vulnerabilities || [];

    let imported = 0;
    let skipped = 0;
    let filteredOut = 0;
    const importedCves: Array<{
      cveId: string;
      severity: string;
      cvssScore: number;
      software: string;
    }> = [];

    for (const vuln of vulnerabilities) {
      // Filter by minimum CVE year (e.g. CVE-2025-xxxx)
      if (minYear) {
        const yearMatch = vuln.cve.id.match(/^CVE-(\d{4})-/);
        if (yearMatch && parseInt(yearMatch[1]) < minYear) {
          filteredOut++;
          continue;
        }
      }

      // Filter by OS if specified
      if (!matchesOsFilters(vuln, osFilters)) {
        filteredOut++;
        continue;
      }
      const cveId = vuln.cve.id;

      // Get CVSS score
      const cvssV31 = vuln.cve.metrics?.cvssMetricV31?.[0]?.cvssData;
      const cvssV2 = vuln.cve.metrics?.cvssMetricV2?.[0]?.cvssData;
      const cvssScore = cvssV31?.baseScore ?? cvssV2?.baseScore ?? 0;

      // Get description
      const description =
        vuln.cve.descriptions.find((d) => d.lang === "en")?.value ||
        vuln.cve.descriptions[0]?.value ||
        "";

      // Extract affected software
      const { software, versions } = extractSoftwareInfo(vuln);

      const severity = mapSeverity(cvssScore);

      try {
        await prisma.cveEntry.create({
          data: {
            organizationId: orgId,
            cveId,
            severity,
            cvssScore,
            description:
              description.length > 500
                ? description.slice(0, 497) + "..."
                : description,
            affectedSoftware: software,
            affectedVersions: versions,
            status: "OPEN",
          },
        });
        imported++;
        importedCves.push({ cveId, severity, cvssScore, software });
      } catch (err: unknown) {
        // Skip duplicates
        if (
          err &&
          typeof err === "object" &&
          "code" in err &&
          err.code === "P2002"
        ) {
          skipped++;
        } else {
          console.error(`Error importing ${cveId}:`, err);
          skipped++;
        }
      }
    }

    return NextResponse.json({
      totalFromNvd: vulnerabilities.length,
      imported,
      skipped,
      filteredOut,
      importedCves,
    });
  } catch (error) {
    console.error("Error importing CVEs:", error);
    return NextResponse.json(
      { error: "Failed to import CVEs from NVD" },
      { status: 500 }
    );
  }
}
