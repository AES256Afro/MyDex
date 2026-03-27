/**
 * Device diagnostics collector — ports WinnyTool's PowerShell data collection
 * into the MyDex agent for remote system health monitoring.
 */
const { execSync } = require("child_process");
const os = require("os");
const path = require("path");
const fs = require("fs");

const PS_OPTS = { encoding: "utf-8", timeout: 30000 };

function ps(command) {
  try {
    return execSync(
      `powershell -NoProfile -Command "${command.replace(/"/g, '\\"')}"`,
      PS_OPTS
    ).trim();
  } catch {
    return "";
  }
}

// --- System Info (from WinnyTool sysinfo.py) ---

function getCpuInfo() {
  try {
    const raw = ps("Get-CimInstance Win32_Processor | Select-Object Name,NumberOfCores,NumberOfLogicalProcessors | ConvertTo-Json");
    const data = JSON.parse(raw);
    return {
      name: data.Name || "Unknown",
      cores: data.NumberOfCores || 0,
      threads: data.NumberOfLogicalProcessors || 0,
    };
  } catch {
    return { name: "Unknown", cores: 0, threads: 0 };
  }
}

function getRamInfo() {
  try {
    const raw = ps("Get-CimInstance Win32_OperatingSystem | Select-Object TotalVisibleMemorySize,FreePhysicalMemory | ConvertTo-Json");
    const data = JSON.parse(raw);
    return {
      totalGb: Math.round((data.TotalVisibleMemorySize / 1048576) * 100) / 100,
      availGb: Math.round((data.FreePhysicalMemory / 1048576) * 100) / 100,
    };
  } catch {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    return {
      totalGb: Math.round((totalMem / 1073741824) * 100) / 100,
      availGb: Math.round((freeMem / 1073741824) * 100) / 100,
    };
  }
}

function getGpuName() {
  try {
    const raw = ps("Get-CimInstance Win32_VideoController | Select-Object Name | ConvertTo-Json");
    const data = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [JSON.parse(raw)];
    return data.map((d) => d.Name).filter(Boolean).join(", ") || "Unknown";
  } catch {
    return "Unknown";
  }
}

function getDiskDrives() {
  try {
    const raw = ps("Get-CimInstance Win32_DiskDrive | Select-Object Model,Size,MediaType | ConvertTo-Json");
    let data = JSON.parse(raw);
    if (!Array.isArray(data)) data = [data];
    return data.map((d) => ({
      model: d.Model || "Unknown",
      sizeGb: d.Size ? Math.round(d.Size / 1073741824) : 0,
      type: (d.MediaType || "").includes("SSD") ? "SSD" : (d.MediaType || "").includes("Fixed") ? "HDD" : d.MediaType || "Unknown",
    }));
  } catch {
    return [];
  }
}

function getUptime() {
  try {
    const raw = ps("(Get-CimInstance Win32_OperatingSystem).LastBootUpTime | Get-Date -UFormat '%s'");
    const bootEpoch = parseFloat(raw);
    return Math.round(Date.now() / 1000 - bootEpoch);
  } catch {
    return Math.round(os.uptime());
  }
}

function getAntivirus() {
  try {
    const raw = ps("Get-CimInstance -Namespace root/SecurityCenter2 -ClassName AntiVirusProduct | Select-Object displayName | ConvertTo-Json");
    if (raw) {
      let data = JSON.parse(raw);
      if (!Array.isArray(data)) data = [data];
      const names = data.map((d) => d.displayName).filter(Boolean);
      if (names.length > 0) return names.join(", ");
    }
  } catch { /* fallback below */ }

  // Fallback: check if Windows Defender is running
  try {
    const raw = ps("Get-Service WinDefend -ErrorAction SilentlyContinue | Select-Object Status | ConvertTo-Json");
    if (raw) {
      const data = JSON.parse(raw);
      if (data.Status === 4 || data.Status === "Running") return "Windows Defender";
    }
  } catch { /* ignore */ }

  return "Unknown";
}

// --- Windows Update (from WinnyTool winupdate.py) ---

function getLastUpdateDate() {
  try {
    const raw = ps("Get-HotFix | Sort-Object InstalledOn -Descending -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty InstalledOn | Get-Date -Format 'yyyy-MM-dd'");
    return raw || null;
  } catch {
    return null;
  }
}

function getPendingUpdates() {
  try {
    const raw = ps(`$s = New-Object -ComObject Microsoft.Update.Session; $r = $s.CreateUpdateSearcher().Search('IsInstalled=0 and IsHidden=0'); $r.Updates | Select-Object Title,@{N='KB';E={($_.KBArticleIDs -join ',')}} | ConvertTo-Json`);
    if (!raw) return [];
    let data = JSON.parse(raw);
    if (!Array.isArray(data)) data = [data];
    return data.slice(0, 20).map((u) => ({ title: u.Title, kb: u.KB || "" }));
  } catch {
    return [];
  }
}

function getUpdateServiceStatus() {
  try {
    const raw = execSync("sc query wuauserv", PS_OPTS);
    if (raw.includes("RUNNING")) return "running";
    if (raw.includes("STOPPED")) return "stopped";
    return "unknown";
  } catch {
    return "unknown";
  }
}

function isRebootPending() {
  try {
    const raw = ps(`Test-Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\WindowsUpdate\\Auto Update\\RebootRequired'`);
    return raw.toLowerCase() === "true";
  } catch {
    return false;
  }
}

// --- BSOD Analysis (from WinnyTool bsod_analyzer.py) ---

function getBsodEvents() {
  try {
    const raw = ps(`Get-WinEvent -FilterHashtable @{LogName='System'; ID=1001} -MaxEvents 10 -ErrorAction SilentlyContinue | ForEach-Object { @{ Date=$_.TimeCreated.ToString('yyyy-MM-dd HH:mm:ss'); Source=$_.ProviderName; Message=($_.Message.Substring(0, [Math]::Min(200, $_.Message.Length))) } } | ConvertTo-Json`);
    if (!raw) return [];
    let data = JSON.parse(raw);
    if (!Array.isArray(data)) data = [data];
    return data;
  } catch {
    return [];
  }
}

// --- Security (from WinnyTool hardening.py) ---

function getFirewallStatus() {
  try {
    const raw = ps(`Get-NetFirewallProfile | Select-Object Name,Enabled | ConvertTo-Json`);
    let data = JSON.parse(raw);
    if (!Array.isArray(data)) data = [data];
    const result = {};
    for (const p of data) {
      result[p.Name.toLowerCase()] = p.Enabled;
    }
    return result;
  } catch {
    return {};
  }
}

function getDefenderStatus() {
  // Try Get-MpPreference first (requires elevation)
  try {
    const raw = ps("(Get-MpPreference).DisableRealtimeMonitoring");
    if (raw) {
      return raw.toLowerCase() === "false" ? "enabled" : "disabled";
    }
  } catch { /* not elevated, try fallback */ }

  // Fallback: check WinDefend service status
  try {
    const raw = ps("Get-Service WinDefend -ErrorAction SilentlyContinue | Select-Object Status | ConvertTo-Json");
    if (raw) {
      const data = JSON.parse(raw);
      if (data.Status === 4 || data.Status === "Running") return "enabled";
      return "disabled";
    }
  } catch { /* ignore */ }

  // Fallback 2: check via registry
  try {
    const raw = ps("Get-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows Defender\\Real-Time Protection' -Name DisableRealtimeMonitoring -ErrorAction SilentlyContinue | Select-Object -ExpandProperty DisableRealtimeMonitoring");
    if (raw === "0") return "enabled";
    if (raw === "1") return "disabled";
  } catch { /* ignore */ }

  return "unknown";
}

// --- Network ---

function getDnsServers() {
  try {
    const raw = ps(`Get-DnsClientServerAddress -AddressFamily IPv4 | Where-Object { $_.ServerAddresses } | Select-Object -First 1 -ExpandProperty ServerAddresses | ConvertTo-Json`);
    let data = JSON.parse(raw);
    if (!Array.isArray(data)) data = [data];
    return data.join(", ");
  } catch {
    return "";
  }
}

function getNetworkAdapters() {
  try {
    const raw = ps(`Get-NetAdapter | Where-Object { $_.Status -eq 'Up' } | Select-Object Name,InterfaceDescription,MacAddress,LinkSpeed | ConvertTo-Json`);
    let data = JSON.parse(raw);
    if (!Array.isArray(data)) data = [data];
    return data.map((a) => ({
      name: a.Name,
      description: a.InterfaceDescription,
      mac: a.MacAddress,
      speed: a.LinkSpeed,
    }));
  } catch {
    return [];
  }
}

function getWifiSignal() {
  try {
    const raw = execSync("netsh wlan show interfaces", PS_OPTS);
    const match = raw.match(/Signal\s*:\s*(\d+)%/);
    return match ? parseInt(match[1]) : null;
  } catch {
    return null;
  }
}

// --- Running processes ---

function getRunningProcesses() {
  try {
    const raw = ps(`Get-Process | Group-Object ProcessName | Sort-Object Count -Descending | Select-Object -First 50 Name,Count,@{N='MemoryMB';E={[math]::Round(($_.Group | Measure-Object WorkingSet64 -Sum).Sum / 1MB, 1)}} | ConvertTo-Json`);
    let data = JSON.parse(raw);
    if (!Array.isArray(data)) data = [data];
    return data.map((p) => ({
      name: p.Name,
      count: p.Count,
      memoryMb: p.MemoryMB || 0,
    }));
  } catch {
    return [];
  }
}

// --- Installed Software ---

function getInstalledSoftware() {
  try {
    const script = `$software = @(); @('HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*','HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*') | ForEach-Object { Get-ItemProperty $_ -ErrorAction SilentlyContinue } | Where-Object { $_.DisplayName } | ForEach-Object { $v = $_.DisplayVersion; if (-not $v) { $v = 'unknown' }; $pub = $_.Publisher; if (-not $pub) { $pub = '' }; $sz = $_.EstimatedSize; if (-not $sz) { $sz = 0 }; $software += @{ name = $_.DisplayName; version = $v; publisher = $pub; size = [math]::Round($sz/1024,1) } }; $software | Sort-Object { $_.name } | ConvertTo-Json -Depth 2`;
    const raw = ps(script);
    return JSON.parse(raw || "[]");
  } catch {
    return [];
  }
}

// --- Performance quick checks ---

function getPerformanceIssues() {
  const issues = [];

  // Check power plan
  try {
    const raw = execSync("powercfg /getactivescheme", PS_OPTS);
    if (raw.includes("Power saver")) {
      issues.push({ check: "Power Plan", status: "warn", detail: "Power saver mode active — may reduce performance" });
    }
  } catch { /* ignore */ }

  // Check startup count
  try {
    const raw = ps("(Get-CimInstance Win32_StartupCommand).Count");
    const count = parseInt(raw);
    if (count > 15) {
      issues.push({ check: "Startup Programs", status: "warn", detail: `${count} startup programs — may slow boot time` });
    }
  } catch { /* ignore */ }

  // Check temp files size
  try {
    const tempDir = process.env.TEMP || path.join(os.homedir(), "AppData", "Local", "Temp");
    let totalSize = 0;
    const walk = (dir) => {
      try {
        for (const f of fs.readdirSync(dir)) {
          const fp = path.join(dir, f);
          try {
            const stat = fs.statSync(fp);
            if (stat.isFile()) totalSize += stat.size;
            else if (stat.isDirectory()) walk(fp);
          } catch { /* ignore */ }
        }
      } catch { /* ignore */ }
    };
    walk(tempDir);
    const sizeMb = Math.round(totalSize / 1048576);
    if (sizeMb > 500) {
      issues.push({ check: "Temp Files", status: "warn", detail: `${sizeMb} MB of temp files — consider cleanup` });
    }
  } catch { /* ignore */ }

  return issues;
}

// --- Main diagnostic collection ---

async function collectDiagnostics() {
  console.log("Starting device diagnostics collection...");
  const start = Date.now();

  const cpu = getCpuInfo();
  const ram = getRamInfo();
  const gpu = getGpuName();
  const disks = getDiskDrives();
  const uptime = getUptime();
  const antivirus = getAntivirus();
  const lastUpdate = getLastUpdateDate();
  const pending = getPendingUpdates();
  const updateService = getUpdateServiceStatus();
  const reboot = isRebootPending();
  const bsod = getBsodEvents();
  const firewall = getFirewallStatus();
  const defender = getDefenderStatus();
  const dns = getDnsServers();
  const adapters = getNetworkAdapters();
  const wifi = getWifiSignal();
  const running = getRunningProcesses();
  const installed = getInstalledSoftware();
  const perfIssues = getPerformanceIssues();

  const elapsed = Date.now() - start;
  console.log(`Diagnostics collected in ${elapsed}ms`);

  return {
    // Hardware
    cpuName: cpu.name,
    cpuCores: cpu.cores,
    ramTotalGb: ram.totalGb,
    ramAvailGb: ram.availGb,
    gpuName: gpu,
    diskDrives: disks,
    uptimeSeconds: uptime,

    // Security
    antivirusName: antivirus,
    firewallStatus: firewall,
    defenderStatus: defender,

    // Windows Update
    lastUpdateDate: lastUpdate,
    pendingUpdates: pending,
    updateServiceStatus: updateService,
    rebootPending: reboot,

    // BSOD
    bsodEvents: bsod,
    bsodCount: bsod.length,

    // Network
    dnsServers: dns,
    networkAdapters: adapters,
    wifiSignal: wifi,

    // Software
    installedSoftware: installed,
    runningSoftware: running,

    // Performance
    performanceIssues: perfIssues,
  };
}

module.exports = { collectDiagnostics };
