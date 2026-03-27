import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const importSchema = z.object({
  keyword: z.string().optional(),
  maxResults: z.number().min(1).max(100).default(20),
  osFilters: z.array(z.string()).optional(),
  minYear: z.number().min(1999).max(2030).optional(),
  // One-click bulk update mode — no keyword needed
  bulkUpdate: z.boolean().optional(),
});

// Categories to auto-scan in bulk update mode
const BULK_UPDATE_CATEGORIES = [
  { keyword: "Windows 11", osFilters: ["windows11"] },
  { keyword: "Windows Server", osFilters: ["windowsServer2022"] },
  { keyword: "Microsoft Edge", osFilters: [] },
  { keyword: "Google Chrome", osFilters: [] },
  { keyword: "Mozilla Firefox", osFilters: [] },
  { keyword: "Microsoft Office", osFilters: [] },
  { keyword: "Visual Studio Code", osFilters: [] },
  { keyword: "Node.js", osFilters: [] },
  { keyword: "Python", osFilters: [] },
  { keyword: "Docker", osFilters: [] },
  { keyword: "macOS", osFilters: ["macOS"] },
  { keyword: "Linux kernel", osFilters: ["linux"] },
];

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

// ─── Reusable NVD fetch + import helper ──────────────────────────────────────
async function fetchAndImportFromNvd(opts: {
  keyword: string;
  maxResults: number;
  osFilters?: string[];
  minYear: number;
  orgId: string;
}): Promise<{
  totalFromNvd: number;
  imported: number;
  skipped: number;
  filteredOut: number;
  importedCves: Array<{
    cveId: string;
    severity: string;
    cvssScore: number;
    software: string;
  }>;
}> {
  const { keyword, maxResults, osFilters, minYear, orgId } = opts;

  // Build NVD API URL
  const nvdUrl = new URL("https://services.nvd.nist.gov/rest/json/cves/2.0");
  nvdUrl.searchParams.set("keywordSearch", keyword);
  nvdUrl.searchParams.set("resultsPerPage", String(maxResults));

  // Date range filter: from Jan 1 of minYear to now
  const startDate = new Date(`${minYear}-01-01T00:00:00.000`);
  const endDate = new Date();
  nvdUrl.searchParams.set("pubStartDate", startDate.toISOString());
  nvdUrl.searchParams.set("pubEndDate", endDate.toISOString());

  const response = await fetch(nvdUrl.toString(), {
    headers: { "Accept": "application/json" },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`NVD API error ${response.status}: ${text.slice(0, 200)}`);
  }

  const nvdData = await response.json();
  const vulnerabilities: NvdCveItem[] = nvdData.vulnerabilities || [];
  const totalFromNvd = vulnerabilities.length;

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
    // Apply OS / old-Windows filter
    if (!matchesOsFilters(vuln, osFilters)) {
      filteredOut++;
      continue;
    }

    const cveId = vuln.cve.id;
    const description =
      vuln.cve.descriptions.find((d) => d.lang === "en")?.value ||
      vuln.cve.descriptions[0]?.value ||
      "";

    // Extract CVSS score
    let cvssScore = 0;
    let severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "MEDIUM";
    const v31 = vuln.cve.metrics?.cvssMetricV31?.[0];
    if (v31) {
      cvssScore = v31.cvssData.baseScore;
      severity = mapSeverity(cvssScore);
    } else {
      const v2 = vuln.cve.metrics?.cvssMetricV2?.[0];
      if (v2) {
        cvssScore = v2.cvssData.baseScore;
        severity = mapSeverity(cvssScore);
      }
    }

    const { software, versions } = extractSoftwareInfo(vuln);

    // Upsert — skip if already exists for this org + cveId + software
    try {
      const existing = await prisma.cveEntry.findFirst({
        where: { organizationId: orgId, cveId, affectedSoftware: software },
        select: { id: true },
      });

      if (existing) {
        skipped++;
        continue;
      }

      await prisma.cveEntry.create({
        data: {
          organizationId: orgId,
          cveId,
          severity,
          cvssScore,
          description: description.slice(0, 2000),
          affectedSoftware: software,
          affectedVersions: versions,
          status: "OPEN",
        },
      });

      imported++;
      importedCves.push({ cveId, severity, cvssScore, software });
    } catch {
      // Unique constraint or other DB error — treat as skipped
      skipped++;
    }
  }

  return { totalFromNvd, imported, skipped, filteredOut, importedCves };
}

// ─── Assess applicability of CVEs against device inventory ────────────────────
async function assessCveApplicability(orgId: string): Promise<{
  confirmed: number;
  potential: number;
  notApplicable: number;
}> {
  // Get all installed software across all devices in this org
  const devices = await prisma.agentDevice.findMany({
    where: { organizationId: orgId },
    select: { installedSoftware: true, platform: true, osVersion: true },
  });

  // Build a set of installed software names (lowercased) and platform info
  const installedSoftwareNames = new Set<string>();
  const platforms = new Set<string>();
  for (const device of devices) {
    if (device.platform) platforms.add(device.platform.toLowerCase());
    if (device.osVersion) installedSoftwareNames.add(device.osVersion.toLowerCase());
    const sw = device.installedSoftware;
    if (Array.isArray(sw)) {
      for (const item of sw as Array<{ name?: string; version?: string }>) {
        if (item?.name) {
          installedSoftwareNames.add(item.name.toLowerCase());
        }
      }
    }
  }

  // Get all UNASSESSED CVEs for this org
  const unassessedCves = await prisma.cveEntry.findMany({
    where: { organizationId: orgId, applicability: "UNASSESSED" },
    select: { id: true, affectedSoftware: true, description: true },
  });

  let confirmed = 0;
  let potential = 0;
  let notApplicable = 0;

  // If no devices enrolled, mark everything as POTENTIAL
  if (devices.length === 0) {
    if (unassessedCves.length > 0) {
      await prisma.cveEntry.updateMany({
        where: { organizationId: orgId, applicability: "UNASSESSED" },
        data: { applicability: "POTENTIAL" },
      });
      potential = unassessedCves.length;
    }
    return { confirmed, potential, notApplicable };
  }

  for (const cve of unassessedCves) {
    const software = cve.affectedSoftware.toLowerCase();
    const desc = (cve.description || "").toLowerCase();

    // Extract product name from CPE-style "vendor/product" format
    const product = software.includes("/")
      ? software.split("/")[1].replace(/_/g, " ")
      : software;

    // Check for direct match against installed software
    const directMatch = [...installedSoftwareNames].some((installed) => {
      // Fuzzy matching: check if the installed software name contains the CVE product
      // or vice versa, handling common naming variations
      const normalizedProduct = product.replace(/[_\-\.]/g, " ").trim();
      const normalizedInstalled = installed.replace(/[_\-\.]/g, " ").trim();
      return (
        normalizedInstalled.includes(normalizedProduct) ||
        normalizedProduct.includes(normalizedInstalled)
      );
    });

    // Check platform relevance
    const isWindowsCve = desc.includes("windows") || software.includes("windows") || software.includes("microsoft");
    const isMacCve = desc.includes("macos") || desc.includes("mac os") || software.includes("apple") || software.includes("macos");
    const isLinuxCve = desc.includes("linux") || software.includes("linux");

    const hasWindowsDevice = platforms.has("win32") || platforms.has("windows");
    const hasMacDevice = platforms.has("darwin") || platforms.has("macos");
    const hasLinuxDevice = platforms.has("linux");

    // If CVE is OS-specific and we don't have that OS, it's not applicable
    const osSpecific = isWindowsCve || isMacCve || isLinuxCve;
    const osRelevant =
      (isWindowsCve && hasWindowsDevice) ||
      (isMacCve && hasMacDevice) ||
      (isLinuxCve && hasLinuxDevice) ||
      !osSpecific; // Cross-platform CVEs are always relevant

    let applicability: "CONFIRMED" | "POTENTIAL" | "NOT_APPLICABLE";

    if (directMatch && osRelevant) {
      applicability = "CONFIRMED";
      confirmed++;
    } else if (osRelevant) {
      // OS matches but no direct software match — could still apply
      applicability = "POTENTIAL";
      potential++;
    } else {
      // Wrong OS entirely
      applicability = "NOT_APPLICABLE";
      notApplicable++;
    }

    await prisma.cveEntry.update({
      where: { id: cve.id },
      data: { applicability },
    });
  }

  return { confirmed, potential, notApplicable };
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

    const { keyword, maxResults, osFilters, minYear, bulkUpdate } = parsed.data;
    const orgId = session.user.organizationId;
    const currentYear = new Date().getFullYear();
    const effectiveMinYear = minYear || currentYear;

    // ─── Bulk Update Mode ───────────────────────────────────────────────
    if (bulkUpdate) {
      let totalImported = 0;
      let totalSkipped = 0;
      let totalFilteredOut = 0;
      let totalFromNvd = 0;
      const allImportedCves: Array<{
        cveId: string;
        severity: string;
        cvssScore: number;
        software: string;
      }> = [];
      const categoryResults: Array<{
        category: string;
        found: number;
        imported: number;
        error?: string;
      }> = [];

      // Also scan installed software from enrolled devices
      const deviceSoftware = await prisma.agentDevice.findMany({
        where: { organizationId: orgId },
        select: { installedSoftware: true },
      });

      // Extract unique software names from devices
      const installedNames = new Set<string>();
      for (const device of deviceSoftware) {
        const sw = device.installedSoftware;
        if (Array.isArray(sw)) {
          for (const item of sw as Array<{ name?: string }>) {
            if (item?.name) {
              installedNames.add(item.name);
            }
          }
        }
      }

      // Add device-specific software to scan categories
      const dynamicCategories = [...BULK_UPDATE_CATEGORIES];
      const alreadyScanned = new Set(
        BULK_UPDATE_CATEGORIES.map((c) => c.keyword.toLowerCase())
      );

      // Common software to look for from device inventories
      const interestingSoftware = [
        "7-Zip", "WinRAR", "Adobe Acrobat", "Adobe Reader",
        "Zoom", "Slack", "Teams", "Git", "OpenSSH", "PowerShell",
        "Java", "Apache", "nginx", "PostgreSQL", "MySQL",
      ];
      for (const name of interestingSoftware) {
        if (
          installedNames.has(name) &&
          !alreadyScanned.has(name.toLowerCase())
        ) {
          dynamicCategories.push({ keyword: name, osFilters: [] });
          alreadyScanned.add(name.toLowerCase());
        }
      }

      for (const category of dynamicCategories) {
        try {
          // Rate limit: NVD allows 5 requests per 30 seconds without API key
          // Add a small delay between requests
          if (totalFromNvd > 0) {
            await new Promise((resolve) => setTimeout(resolve, 6500));
          }

          const result = await fetchAndImportFromNvd({
            keyword: category.keyword,
            maxResults: maxResults || 20,
            osFilters: category.osFilters.length > 0 ? category.osFilters : undefined,
            minYear: effectiveMinYear,
            orgId,
          });

          totalFromNvd += result.totalFromNvd;
          totalImported += result.imported;
          totalSkipped += result.skipped;
          totalFilteredOut += result.filteredOut;
          allImportedCves.push(...result.importedCves);
          categoryResults.push({
            category: category.keyword,
            found: result.totalFromNvd,
            imported: result.imported,
          });
        } catch (err) {
          categoryResults.push({
            category: category.keyword,
            found: 0,
            imported: 0,
            error: err instanceof Error ? err.message : "Failed",
          });
        }
      }

      // Assess applicability of all unassessed CVEs against device inventory
      const applicabilityResults = await assessCveApplicability(orgId);

      return NextResponse.json({
        totalFromNvd,
        imported: totalImported,
        skipped: totalSkipped,
        filteredOut: totalFilteredOut,
        importedCves: allImportedCves,
        categoryResults,
        applicability: applicabilityResults,
        mode: "bulk",
      });
    }

    // ─── Single Keyword Mode (legacy) ───────────────────────────────────
    if (!keyword?.trim()) {
      return NextResponse.json(
        { error: "Search keyword required for manual import" },
        { status: 400 }
      );
    }

    const result = await fetchAndImportFromNvd({
      keyword: keyword.trim(),
      maxResults,
      osFilters,
      minYear: effectiveMinYear,
      orgId,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error importing CVEs:", error);
    return NextResponse.json(
      { error: "Failed to import CVEs from NVD" },
      { status: 500 }
    );
  }
}
