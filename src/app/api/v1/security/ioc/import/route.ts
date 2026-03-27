import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const importSchema = z.object({
  source: z.enum(["malwarebazaar", "threatfox", "tweetfeed", "virustotal", "bulk"]),
  // MalwareBazaar: query type
  mbQuery: z.enum(["recent", "tag", "signature"]).optional(),
  mbTag: z.string().optional(),
  mbSignature: z.string().optional(),
  mbLimit: z.number().min(1).max(500).default(25),
  // ThreatFox: query type
  tfQuery: z.enum(["recent", "tag", "malware", "search"]).optional(),
  tfTag: z.string().optional(),
  tfMalware: z.string().optional(),
  tfSearch: z.string().optional(),
  tfDays: z.number().min(1).max(30).default(7),
  // VirusTotal
  vtApiKey: z.string().optional(),
  vtHash: z.string().optional(),
  vtHashes: z.array(z.string()).optional(),
  // TweetFeed
  tfeedTime: z.enum(["today", "week", "month"]).optional(),
  tfeedTag: z.string().optional(),
  tfeedType: z.enum(["sha256", "md5", "ip", "domain", "url"]).optional(),
  // Bulk paste (any source — raw hashes, one per line)
  bulkHashes: z.array(z.string()).optional(),
  bulkSeverity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  bulkThreatName: z.string().optional(),
});

type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

interface ImportedHash {
  hashType: "MD5" | "SHA1" | "SHA256";
  hashValue: string;
  threatName: string;
  severity: Severity;
  description: string;
  source: string;
}

// ========== MalwareBazaar (abuse.ch) — CSV Export ==========
async function fetchMalwareBazaar(
  _query: string,
  _tag?: string,
  _signature?: string,
  limit?: number
): Promise<ImportedHash[]> {
  // Use the free CSV export endpoint (API now requires auth)
  const res = await fetch("https://bazaar.abuse.ch/export/csv/recent/", {
    headers: { "User-Agent": "MyDex-Security/1.0" },
  });

  if (!res.ok) throw new Error(`MalwareBazaar export returned ${res.status}`);

  const text = await res.text();
  const lines = text.split("\n").filter((l) => !l.startsWith("#") && l.trim());
  const results: ImportedHash[] = [];
  const max = limit || 25;

  for (const line of lines.slice(0, max)) {
    // CSV format: first_seen,sha256,md5,sha1,reporter,file_name,file_type,mime_type,signature,clamav,vtpercent,imphash,ssdeep,tlsh
    const parts = line.split(",").map((p) => p.replace(/^"|"$/g, "").trim());
    if (parts.length < 10) continue;

    const sha256 = parts[1];
    const signature = parts[8];
    const fileType = parts[6];
    const reporter = parts[5];
    const firstSeen = parts[0];

    if (!sha256 || sha256.length !== 64) continue;

    results.push({
      hashType: "SHA256",
      hashValue: sha256.toLowerCase(),
      threatName: signature || "Unknown Malware",
      severity: mapMalwareBazaarSeverity(signature),
      description: [
        fileType && `File: ${fileType}`,
        reporter && `Name: ${reporter}`,
        firstSeen && `First seen: ${firstSeen}`,
      ]
        .filter(Boolean)
        .join(" | "),
      source: "malwarebazaar",
    });
  }

  return results;
}

function mapMalwareBazaarSeverity(signature?: string): Severity {
  if (!signature) return "MEDIUM";
  const s = signature.toLowerCase();
  if (s.includes("ransom") || s.includes("cobalt") || s.includes("metasploit"))
    return "CRITICAL";
  if (s.includes("trojan") || s.includes("backdoor") || s.includes("rat"))
    return "HIGH";
  if (s.includes("adware") || s.includes("pup")) return "LOW";
  return "MEDIUM";
}

// ========== ThreatFox (abuse.ch) — JSON Export ==========
async function fetchThreatFox(
  _query: string,
  opts: { tag?: string; malware?: string; search?: string; days?: number }
): Promise<ImportedHash[]> {
  // Use the free JSON export endpoint (API now requires auth)
  const res = await fetch("https://threatfox.abuse.ch/export/json/recent/", {
    headers: { "User-Agent": "MyDex-Security/1.0" },
  });

  if (!res.ok) throw new Error(`ThreatFox export returned ${res.status}`);

  const data = await res.json();
  const results: ImportedHash[] = [];
  const filterTag = opts.tag?.toLowerCase();
  const filterMalware = opts.malware?.toLowerCase();
  const filterSearch = opts.search?.toLowerCase();

  // Data is keyed by ID
  for (const [, iocList] of Object.entries(data)) {
    if (!Array.isArray(iocList)) continue;
    for (const ioc of iocList) {
      // Only import hash-type IOCs
      const iocType = ioc.ioc_type || "";
      if (!iocType.includes("hash") && !iocType.includes("md5") && !iocType.includes("sha256")) continue;

      // Apply filters
      if (filterTag && !(ioc.tags || []).some((t: string) => t.toLowerCase().includes(filterTag))) continue;
      if (filterMalware && !(ioc.malware || "").toLowerCase().includes(filterMalware)) continue;
      if (filterSearch) {
        const searchable = `${ioc.ioc_value || ""} ${ioc.malware || ""} ${ioc.threat_type || ""}`.toLowerCase();
        if (!searchable.includes(filterSearch)) continue;
      }

      const hashType = iocType.includes("sha256") || (ioc.ioc_value || "").length === 64 ? "SHA256" : "MD5";
      results.push({
        hashType,
        hashValue: (ioc.ioc_value || ioc.ioc || "").toLowerCase(),
        threatName: ioc.malware_printable || ioc.malware || ioc.threat_type || "Unknown",
        severity: mapThreatLevel(ioc.threat_type, ioc.confidence_level),
        description: [
          ioc.threat_type && `Threat: ${ioc.threat_type}`,
          ioc.malware_printable && `Malware: ${ioc.malware_printable}`,
          ioc.reporter && `Reporter: ${ioc.reporter}`,
          ioc.first_seen_utc && `First seen: ${ioc.first_seen_utc}`,
        ]
          .filter(Boolean)
          .join(" | "),
        source: "threatfox",
      });

      if (results.length >= 100) break;
    }
    if (results.length >= 100) break;
  }

  return results;
}

function mapThreatLevel(
  threatType?: string,
  confidence?: number
): Severity {
  if (confidence && confidence >= 90) return "CRITICAL";
  if (confidence && confidence >= 70) return "HIGH";
  if (!threatType) return "MEDIUM";
  const t = threatType.toLowerCase();
  if (t.includes("botnet") || t.includes("ransomware") || t.includes("c2"))
    return "CRITICAL";
  if (t.includes("payload") || t.includes("stealer")) return "HIGH";
  return "MEDIUM";
}

// ========== TweetFeed.live ==========
async function fetchTweetFeed(
  time: string,
  tag?: string,
  iocType?: string
): Promise<ImportedHash[]> {
  // Build URL: /v1/{time}/{tag?}/{type?}
  let url = `https://api.tweetfeed.live/v1/${time || "today"}`;
  if (tag) url += `/${tag}`;
  if (iocType) url += `/${iocType}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`TweetFeed API returned ${res.status}`);

  const data = await res.json();
  if (!Array.isArray(data)) return [];

  const results: ImportedHash[] = [];
  for (const item of data) {
    const type = item.type;
    const value = (item.value || "").trim().toLowerCase();
    const tags = (item.tags || []).join(", ");
    const user = item.user || "unknown";
    const date = item.date || "";

    // Only import hash types (sha256, md5) and optionally domains/IPs
    if (type === "sha256" && value.length === 64) {
      results.push({
        hashType: "SHA256",
        hashValue: value,
        threatName: tags || "TweetFeed IOC",
        severity: mapTweetFeedSeverity(item.tags),
        description: `Shared by @${user} on ${date} | Tags: ${tags} | Tweet: ${item.tweet || ""}`,
        source: "tweetfeed",
      });
    } else if (type === "md5" && value.length === 32) {
      results.push({
        hashType: "MD5",
        hashValue: value,
        threatName: tags || "TweetFeed IOC",
        severity: mapTweetFeedSeverity(item.tags),
        description: `Shared by @${user} on ${date} | Tags: ${tags}`,
        source: "tweetfeed",
      });
    } else if (type === "domain" || type === "ip") {
      // Store domains/IPs with SHA256 hash of the value
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(value));
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

      results.push({
        hashType: "SHA256",
        hashValue: hash,
        threatName: `${type.toUpperCase()}: ${value} (${tags})`,
        severity: mapTweetFeedSeverity(item.tags),
        description: `${type}: ${value} | Shared by @${user} on ${date} | Tags: ${tags}`,
        source: "tweetfeed",
      });
    }

    if (results.length >= 200) break;
  }

  return results;
}

function mapTweetFeedSeverity(tags?: string[]): Severity {
  if (!tags || tags.length === 0) return "MEDIUM";
  const joined = tags.join(" ").toLowerCase();
  if (joined.includes("cobalt") || joined.includes("ransomware") || joined.includes("c2"))
    return "CRITICAL";
  if (joined.includes("trojan") || joined.includes("stealer") || joined.includes("rat"))
    return "HIGH";
  if (joined.includes("phishing")) return "MEDIUM";
  return "MEDIUM";
}

// ========== VirusTotal ==========
async function fetchVirusTotal(
  apiKey: string,
  hash: string
): Promise<ImportedHash[]> {
  const res = await fetch(
    `https://www.virustotal.com/api/v3/files/${encodeURIComponent(hash)}`,
    {
      headers: { "x-apikey": apiKey },
    }
  );

  if (!res.ok) {
    if (res.status === 404) return [];
    throw new Error(`VirusTotal API returned ${res.status}`);
  }

  const data = await res.json();
  const attrs = data.data?.attributes;
  if (!attrs) return [];

  const detections = attrs.last_analysis_stats?.malicious || 0;
  const total = Object.values(attrs.last_analysis_stats || {}).reduce(
    (sum: number, v) => sum + (v as number),
    0
  );
  const threatNames: string[] = [];
  if (attrs.popular_threat_classification?.suggested_threat_label) {
    threatNames.push(attrs.popular_threat_classification.suggested_threat_label);
  }

  let severity: Severity = "LOW";
  if (detections >= 20) severity = "CRITICAL";
  else if (detections >= 10) severity = "HIGH";
  else if (detections >= 3) severity = "MEDIUM";

  const results: ImportedHash[] = [];

  if (attrs.sha256) {
    results.push({
      hashType: "SHA256",
      hashValue: attrs.sha256.toLowerCase(),
      threatName: threatNames[0] || `${detections}/${total} detections`,
      severity,
      description: `VT detections: ${detections}/${total} | File type: ${attrs.type_description || "unknown"} | Size: ${attrs.size || "?"} bytes`,
      source: "virustotal",
    });
  }

  return results;
}

// ========== VirusTotal Domain Lookup ==========
async function fetchVtDomain(
  apiKey: string,
  domain: string
): Promise<ImportedHash[]> {
  const res = await fetch(
    `https://www.virustotal.com/api/v3/domains/${encodeURIComponent(domain)}`,
    { headers: { "x-apikey": apiKey } }
  );
  if (!res.ok) return [];

  const data = await res.json();
  const attrs = data.data?.attributes;
  if (!attrs) return [];

  const malicious = attrs.last_analysis_stats?.malicious || 0;
  const suspicious = attrs.last_analysis_stats?.suspicious || 0;
  const total = Object.values(attrs.last_analysis_stats || {}).reduce(
    (sum: number, v) => sum + (v as number),
    0
  );

  let severity: Severity = "LOW";
  if (malicious >= 10) severity = "CRITICAL";
  else if (malicious >= 5) severity = "HIGH";
  else if (malicious >= 1 || suspicious >= 3) severity = "MEDIUM";

  // Use SHA256 of domain name as pseudo-hash for storage
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(domain));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const domainHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  return [
    {
      hashType: "SHA256",
      hashValue: domainHash,
      threatName: `Domain: ${domain} (${malicious}/${total} malicious)`,
      severity,
      description: `VT domain scan: ${malicious} malicious, ${suspicious} suspicious out of ${total} | Categories: ${Object.values(attrs.categories || {}).join(", ") || "none"} | Registrar: ${attrs.registrar || "unknown"}`,
      source: "virustotal",
    },
  ];
}

// ========== VirusTotal IP Lookup ==========
async function fetchVtIp(
  apiKey: string,
  ip: string
): Promise<ImportedHash[]> {
  const res = await fetch(
    `https://www.virustotal.com/api/v3/ip_addresses/${encodeURIComponent(ip)}`,
    { headers: { "x-apikey": apiKey } }
  );
  if (!res.ok) return [];

  const data = await res.json();
  const attrs = data.data?.attributes;
  if (!attrs) return [];

  const malicious = attrs.last_analysis_stats?.malicious || 0;
  const suspicious = attrs.last_analysis_stats?.suspicious || 0;
  const total = Object.values(attrs.last_analysis_stats || {}).reduce(
    (sum: number, v) => sum + (v as number),
    0
  );

  let severity: Severity = "LOW";
  if (malicious >= 10) severity = "CRITICAL";
  else if (malicious >= 5) severity = "HIGH";
  else if (malicious >= 1 || suspicious >= 3) severity = "MEDIUM";

  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(ip));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const ipHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  return [
    {
      hashType: "SHA256",
      hashValue: ipHash,
      threatName: `IP: ${ip} (${malicious}/${total} malicious)`,
      severity,
      description: `VT IP scan: ${malicious} malicious, ${suspicious} suspicious out of ${total} | AS: ${attrs.as_owner || "unknown"} | Country: ${attrs.country || "unknown"}`,
      source: "virustotal",
    },
  ];
}

// Detect IOC type from string
function detectIocType(value: string): "hash" | "domain" | "ip" | "unknown" {
  const trimmed = value.trim();
  if (/^[a-f0-9]{32}$/i.test(trimmed)) return "hash"; // MD5
  if (/^[a-f0-9]{40}$/i.test(trimmed)) return "hash"; // SHA1
  if (/^[a-f0-9]{64}$/i.test(trimmed)) return "hash"; // SHA256
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(trimmed)) return "ip";
  if (/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/.test(trimmed)) return "domain";
  return "unknown";
}

// ========== Main handler ==========
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

    const orgId = session.user.organizationId;
    const { source } = parsed.data;
    let hashes: ImportedHash[] = [];

    if (source === "malwarebazaar") {
      hashes = await fetchMalwareBazaar(
        parsed.data.mbQuery || "recent",
        parsed.data.mbTag,
        parsed.data.mbSignature,
        parsed.data.mbLimit
      );
    } else if (source === "threatfox") {
      hashes = await fetchThreatFox(parsed.data.tfQuery || "recent", {
        tag: parsed.data.tfTag,
        malware: parsed.data.tfMalware,
        search: parsed.data.tfSearch,
        days: parsed.data.tfDays,
      });
    } else if (source === "tweetfeed") {
      hashes = await fetchTweetFeed(
        parsed.data.tfeedTime || "today",
        parsed.data.tfeedTag,
        parsed.data.tfeedType
      );
    } else if (source === "virustotal") {
      if (!parsed.data.vtApiKey)
        return NextResponse.json(
          { error: "VirusTotal API key required" },
          { status: 400 }
        );
      // Support single hash or multiple hashes
      const vtHashList = parsed.data.vtHashes?.length
        ? parsed.data.vtHashes
        : parsed.data.vtHash
          ? [parsed.data.vtHash]
          : [];
      if (vtHashList.length === 0)
        return NextResponse.json(
          { error: "At least one hash required" },
          { status: 400 }
        );
      // Lookup each IOC — auto-detect type (hash, domain, IP)
      for (const ioc of vtHashList.slice(0, 50)) {
        try {
          const trimmed = ioc.trim();
          const iocType = detectIocType(trimmed);
          let results: ImportedHash[] = [];
          if (iocType === "hash") {
            results = await fetchVirusTotal(parsed.data.vtApiKey, trimmed);
          } else if (iocType === "domain") {
            results = await fetchVtDomain(parsed.data.vtApiKey, trimmed);
          } else if (iocType === "ip") {
            results = await fetchVtIp(parsed.data.vtApiKey, trimmed);
          }
          hashes.push(...results);
        } catch {
          // Skip individual failures (404, rate limit, etc.)
        }
      }
    } else if (source === "bulk") {
      // Direct bulk import — paste hashes without external lookup
      const rawHashes = parsed.data.bulkHashes || [];
      const severity = parsed.data.bulkSeverity || "MEDIUM";
      const threatName = parsed.data.bulkThreatName || "Imported IOC";
      for (const raw of rawHashes) {
        const h = raw.trim().toLowerCase();
        if (!h) continue;
        let hashType: "MD5" | "SHA1" | "SHA256" = "SHA256";
        if (h.length === 32) hashType = "MD5";
        else if (h.length === 40) hashType = "SHA1";
        else if (h.length === 64) hashType = "SHA256";
        else continue; // skip invalid
        hashes.push({
          hashType,
          hashValue: h,
          threatName,
          severity,
          description: "Bulk imported",
          source: "bulk",
        });
      }
    }

    let imported = 0;
    let skipped = 0;

    for (const h of hashes) {
      try {
        await prisma.iocEntry.create({
          data: {
            organizationId: orgId,
            hashType: h.hashType,
            hashValue: h.hashValue,
            source: h.source,
            threatName: h.threatName,
            severity: h.severity,
            description:
              h.description.length > 500
                ? h.description.slice(0, 497) + "..."
                : h.description,
            isBlocked: h.severity === "CRITICAL" || h.severity === "HIGH",
          },
        });
        imported++;
      } catch (err: unknown) {
        if (
          err &&
          typeof err === "object" &&
          "code" in err &&
          err.code === "P2002"
        ) {
          skipped++;
        } else {
          console.error("Error importing IOC:", err);
          skipped++;
        }
      }
    }

    return NextResponse.json({
      source,
      totalFetched: hashes.length,
      imported,
      skipped,
    });
  } catch (error) {
    console.error("Error importing IOCs:", error);
    const message =
      error instanceof Error ? error.message : "Failed to import IOCs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
