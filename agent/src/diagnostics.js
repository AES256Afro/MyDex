/**
 * Device diagnostics collector — ports WinnyTool's PowerShell data collection
 * into the MyDex agent for remote system health monitoring.
 */
const { execSync } = require("child_process");
const os = require("os");
const path = require("path");
const fs = require("fs");
const dns = require("dns");
const si = require("systeminformation");

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
  const dnsServers = getDnsServers();
  const adapters = getNetworkAdapters();
  const wifi = getWifiSignal();
  const running = getRunningProcesses();
  const installed = getInstalledSoftware();
  const perfIssues = getPerformanceIssues();

  // --- Extended Telemetry: System ---

  // Boot duration (time from power-on to OS ready)
  let bootDuration = null;
  try {
    const timeData = await si.time();
    if (timeData && timeData.uptime) {
      bootDuration = {
        uptimeSec: timeData.uptime,
        bootTimestamp: timeData.current - timeData.uptime * 1000,
      };
    }
  } catch { /* non-critical */ }

  // Last shutdown reason (Windows Event Log)
  let shutdownReason = null;
  try {
    if (process.platform === "win32") {
      const raw = execSync(
        `powershell -NoProfile -Command "Get-WinEvent -FilterHashtable @{LogName='System';ID=1074} -MaxEvents 1 -ErrorAction SilentlyContinue | Select-Object TimeCreated,Message | ConvertTo-Json"`,
        { encoding: "utf-8", timeout: 5000 }
      ).trim();
      if (raw) {
        const data = JSON.parse(raw);
        shutdownReason = {
          time: data.TimeCreated || null,
          message: data.Message ? data.Message.substring(0, 300) : null,
        };
      }
    }
  } catch { /* non-critical */ }

  // Thermal throttling / CPU temperature
  let thermalThrottling = null;
  try {
    const temp = await si.cpuTemperature();
    thermalThrottling = {
      mainTemp: temp.main !== null ? temp.main : null,
      maxTemp: temp.max !== null ? temp.max : null,
      cores: temp.cores || [],
      throttling: temp.main !== null && temp.main > 90,
    };
  } catch { /* non-critical */ }

  // Battery health (laptops)
  let batteryHealth = null;
  try {
    const bat = await si.battery();
    if (bat && bat.hasBattery) {
      batteryHealth = {
        hasBattery: true,
        cycleCount: bat.cycleCount || 0,
        isCharging: bat.isCharging,
        percent: bat.percent,
        maxCapacity: bat.maxCapacity || null,
        designedCapacity: bat.designedCapacity || null,
        healthPct: bat.designedCapacity && bat.maxCapacity
          ? Math.round((bat.maxCapacity / bat.designedCapacity) * 100)
          : null,
        acConnected: bat.acConnected,
      };
    } else {
      batteryHealth = { hasBattery: false };
    }
  } catch { /* non-critical */ }

  // --- Extended Telemetry: Network ---

  // Gateway latency (ping default gateway)
  let gatewayLatency = null;
  try {
    const gw = await si.networkGatewayDefault();
    if (gw) {
      const pingCmd = process.platform === "win32"
        ? `ping -n 1 -w 2000 ${gw}`
        : `ping -c 1 -W 2 ${gw}`;
      const pingResult = execSync(pingCmd, { encoding: "utf-8", timeout: 5000 });
      const match = pingResult.match(/time[=<]\s*([\d.]+)\s*ms/i);
      gatewayLatency = {
        gateway: gw,
        latencyMs: match ? parseFloat(match[1]) : null,
      };
    }
  } catch { /* non-critical */ }

  // DNS resolution time
  let dnsResolutionMs = null;
  try {
    const dnsStart = Date.now();
    await new Promise((resolve, reject) => {
      dns.lookup("google.com", (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    dnsResolutionMs = Date.now() - dnsStart;
  } catch { /* non-critical */ }

  // Wi-Fi RSSI in dBm
  let wifiRssiDbm = null;
  try {
    if (process.platform === "win32") {
      const raw = execSync("netsh wlan show interfaces", { encoding: "utf-8", timeout: 5000 });
      const rssiMatch = raw.match(/Signal\s*:\s*(\d+)%/);
      if (rssiMatch) {
        const pct = parseInt(rssiMatch[1]);
        // Approximate conversion: dBm = (quality / 2) - 100
        wifiRssiDbm = Math.round(pct / 2 - 100);
      }
    } else if (process.platform === "linux") {
      const raw = execSync("iwconfig 2>/dev/null", { encoding: "utf-8", timeout: 5000 });
      const rssiMatch = raw.match(/Signal level[=:]\s*(-?\d+)\s*dBm/);
      if (rssiMatch) {
        wifiRssiDbm = parseInt(rssiMatch[1]);
      }
    } else if (process.platform === "darwin") {
      const raw = execSync("/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -I 2>/dev/null", { encoding: "utf-8", timeout: 5000 });
      const rssiMatch = raw.match(/agrCtlRSSI:\s*(-?\d+)/);
      if (rssiMatch) {
        wifiRssiDbm = parseInt(rssiMatch[1]);
      }
    }
  } catch { /* non-critical */ }

  // --- Extended Telemetry: Application ---

  // Hanging / not-responding processes
  let hangingProcesses = [];
  try {
    if (process.platform === "win32") {
      const raw = execSync(
        `powershell -NoProfile -Command "Get-Process | Where-Object { $_.Responding -eq $false } | Select-Object ProcessName,Id,@{N='MemoryMB';E={[math]::Round($_.WorkingSet64/1MB,1)}} | ConvertTo-Json"`,
        { encoding: "utf-8", timeout: 5000 }
      ).trim();
      if (raw) {
        let data = JSON.parse(raw);
        if (!Array.isArray(data)) data = [data];
        hangingProcesses = data.map((p) => ({
          name: p.ProcessName,
          pid: p.Id,
          memoryMb: p.MemoryMB || 0,
        }));
      }
    }
  } catch { /* non-critical */ }

  // Recent application crash logs
  let recentCrashLogs = [];
  try {
    if (process.platform === "win32") {
      const raw = execSync(
        `powershell -NoProfile -Command "Get-WinEvent -FilterHashtable @{LogName='Application';Level=2} -MaxEvents 5 -ErrorAction SilentlyContinue | Select-Object TimeCreated,ProviderName,@{N='Msg';E={$_.Message.Substring(0,[Math]::Min(200,$_.Message.Length))}} | ConvertTo-Json"`,
        { encoding: "utf-8", timeout: 5000 }
      ).trim();
      if (raw) {
        let data = JSON.parse(raw);
        if (!Array.isArray(data)) data = [data];
        recentCrashLogs = data.map((e) => ({
          time: e.TimeCreated || null,
          source: e.ProviderName || null,
          message: e.Msg || null,
        }));
      }
    }
  } catch { /* non-critical */ }

  // --- Extended Telemetry: Hardware ---

  // Disk I/O latency
  let diskIoLatency = null;
  try {
    const io = await si.disksIO();
    if (io) {
      diskIoLatency = {
        rIOsec: io.rIO_sec || 0,
        wIOsec: io.wIO_sec || 0,
        tIOsec: io.tIO_sec || 0,
        rWaitMs: io.rWaitTime || null,
        wWaitMs: io.wWaitTime || null,
      };
    }
  } catch { /* non-critical */ }

  // S.M.A.R.T. disk health
  let smartStatus = [];
  try {
    const layout = await si.diskLayout();
    if (layout && Array.isArray(layout)) {
      smartStatus = layout.map((d) => ({
        device: d.device || d.name || "Unknown",
        type: d.type || "Unknown",
        smartStatus: d.smartStatus || "unknown",
      }));
    }
  } catch { /* non-critical */ }

  // RAM pressure percentage
  let ramPressurePct = null;
  try {
    if (ram.totalGb > 0) {
      ramPressurePct = Math.round(((ram.totalGb - ram.availGb) / ram.totalGb) * 10000) / 100;
    }
  } catch { /* non-critical */ }

  // --- PII Masking ---

  const piiMaskingEnabled = (typeof globalThis.agentConfig !== "undefined" && globalThis.agentConfig && globalThis.agentConfig.piiMasking === true);

  if (piiMaskingEnabled) {
    const username = os.userInfo().username;
    const userPattern = new RegExp(username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");

    // Mask user paths in running process names
    if (Array.isArray(running)) {
      for (const proc of running) {
        if (proc.name && userPattern.test(proc.name)) {
          proc.name = proc.name.replace(userPattern, "***");
        }
      }
    }

    // Mask hanging process names
    if (Array.isArray(hangingProcesses)) {
      for (const proc of hangingProcesses) {
        if (proc.name && userPattern.test(proc.name)) {
          proc.name = proc.name.replace(userPattern, "***");
        }
      }
    }

    // Mask window titles in crash logs
    if (Array.isArray(recentCrashLogs)) {
      for (const entry of recentCrashLogs) {
        if (entry.message) {
          entry.message = "[masked]";
        }
      }
    }
  }

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
    dnsServers: dnsServers,
    networkAdapters: adapters,
    wifiSignal: wifi,

    // Software
    installedSoftware: installed,
    runningSoftware: running,

    // Performance
    performanceIssues: perfIssues,

    // Extended Telemetry: System
    bootDuration,
    shutdownReason,
    thermalThrottling,
    batteryHealth,

    // Extended Telemetry: Network
    gatewayLatency,
    dnsResolutionMs,
    wifiRssiDbm,

    // Extended Telemetry: Application
    hangingProcesses,
    recentCrashLogs,

    // Extended Telemetry: Hardware
    diskIoLatency,
    smartStatus,
    ramPressurePct,
  };
}

module.exports = { collectDiagnostics };
