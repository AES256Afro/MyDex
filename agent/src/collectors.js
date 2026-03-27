const os = require("os");
const { execSync, exec } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { collectDiagnostics } = require("./diagnostics");

let activityInterval = null;
let hashScanInterval = null;
let cveScanInterval = null;
let commandPollInterval = null;
let diagnosticsInterval = null;
let fileWatchers = [];
let fileEventBatch = [];
let fileEventFlushInterval = null;
let recentDeletions = []; // Track recent deletions to detect moves

// --- File monitoring helpers ---

const IGNORED_EXTENSIONS = [".tmp", ".crdownload", ".partial"];
const IGNORED_PREFIXES = ["~$", "."];
const IGNORED_FILENAMES = new Set([".DS_Store", "Thumbs.db", "desktop.ini"]);
const IGNORED_DIR_SEGMENTS = new Set(["node_modules", ".git"]);

function shouldIgnoreFile(filePath) {
  const basename = path.basename(filePath);

  // Ignore hidden files (starting with .)
  if (basename.startsWith(".")) return true;

  // Ignore temp file prefixes
  for (const prefix of IGNORED_PREFIXES) {
    if (basename.startsWith(prefix)) return true;
  }

  // Ignore temp file extensions
  const ext = path.extname(basename).toLowerCase();
  if (IGNORED_EXTENSIONS.includes(ext)) return true;

  // Ignore known system files
  if (IGNORED_FILENAMES.has(basename)) return true;

  // Ignore paths containing node_modules or .git
  const segments = filePath.split(path.sep);
  for (const seg of segments) {
    if (IGNORED_DIR_SEGMENTS.has(seg)) return true;
  }

  return false;
}

function getFileSize(filePath) {
  try {
    const stat = fs.statSync(filePath);
    return stat.size;
  } catch {
    return null;
  }
}

function getWatchDirectories() {
  const homeDir = os.homedir();
  const dirs = [];

  const candidates = [
    path.join(homeDir, "Desktop"),
    path.join(homeDir, "Documents"),
    path.join(homeDir, "Downloads"),
  ];

  for (const dir of candidates) {
    try {
      fs.accessSync(dir, fs.constants.R_OK);
      dirs.push(dir);
    } catch {
      // Directory doesn't exist or isn't readable, skip it
    }
  }

  return dirs;
}

function detectMoveSource(filePath) {
  const basename = path.basename(filePath);
  const now = Date.now();
  const MOVE_THRESHOLD_MS = 2000;

  for (let i = recentDeletions.length - 1; i >= 0; i--) {
    const deletion = recentDeletions[i];
    if (now - deletion.timestamp > MOVE_THRESHOLD_MS) break;
    if (
      path.basename(deletion.filePath) === basename &&
      path.dirname(deletion.filePath) !== path.dirname(filePath)
    ) {
      recentDeletions.splice(i, 1);
      return deletion.filePath;
    }
  }
  return null;
}

function pruneRecentDeletions() {
  const cutoff = Date.now() - 5000;
  recentDeletions = recentDeletions.filter((d) => d.timestamp > cutoff);
}

function pushFileEvent(event) {
  fileEventBatch.push(event);
}

function startFileWatchers(apiClient, hostname) {
  const dirs = getWatchDirectories();

  for (const dir of dirs) {
    try {
      const watcher = fs.watch(dir, { recursive: true }, (eventType, filename) => {
        if (!filename) return;

        const fullPath = path.join(dir, filename);

        if (shouldIgnoreFile(fullPath)) return;

        const basename = path.basename(fullPath);
        const parentDir = path.basename(path.dirname(fullPath));
        const size = getFileSize(fullPath);
        const timestamp = new Date().toISOString();

        if (eventType === "rename") {
          const exists = size !== null;

          if (exists) {
            const moveSource = detectMoveSource(fullPath);
            if (moveSource) {
              pushFileEvent({
                eventType: "FILE_MOVE",
                windowTitle: basename,
                url: fullPath,
                domain: parentDir,
                timestamp,
                metadata: {
                  hostname,
                  action: "move",
                  oldPath: moveSource,
                  size,
                },
              });
            } else {
              pushFileEvent({
                eventType: "FILE_CREATE",
                windowTitle: basename,
                url: fullPath,
                domain: parentDir,
                timestamp,
                metadata: {
                  hostname,
                  action: "create",
                  size,
                },
              });
            }
          } else {
            recentDeletions.push({ filePath: fullPath, timestamp: Date.now() });

            pushFileEvent({
              eventType: "FILE_DELETE",
              windowTitle: basename,
              url: fullPath,
              domain: parentDir,
              timestamp,
              metadata: {
                hostname,
                action: "delete",
              },
            });
          }
        }
      });

      watcher.on("error", (err) => {
        console.error(`File watcher error for ${dir}:`, err.message);
      });

      fileWatchers.push(watcher);
      console.log(`File monitoring started for: ${dir}`);
    } catch (err) {
      console.error(`Failed to watch ${dir}:`, err.message);
    }
  }

  // Flush batched events every 10 seconds
  fileEventFlushInterval = setInterval(async () => {
    pruneRecentDeletions();

    if (fileEventBatch.length === 0) return;

    const movePaths = new Set(
      fileEventBatch
        .filter((e) => e.eventType === "FILE_MOVE" && e.metadata.oldPath)
        .map((e) => e.metadata.oldPath)
    );
    const eventsToSend = fileEventBatch.filter(
      (e) => !(e.eventType === "FILE_DELETE" && movePaths.has(e.url))
    );

    fileEventBatch = [];

    if (eventsToSend.length === 0) return;

    try {
      await apiClient.sendActivityEvents(eventsToSend);
    } catch (err) {
      console.error("File event flush error:", err.message);
    }
  }, 10000);
}

function stopFileWatchers() {
  for (const watcher of fileWatchers) {
    try {
      watcher.close();
    } catch {
      // ignore close errors
    }
  }
  fileWatchers = [];
  fileEventBatch = [];
  recentDeletions = [];
  if (fileEventFlushInterval) {
    clearInterval(fileEventFlushInterval);
    fileEventFlushInterval = null;
  }
}

// --- Existing helpers ---

function getActiveWindow() {
  try {
    if (process.platform === "win32") {
      const script = `Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; using System.Text; public class Win32 { [DllImport(\\"user32.dll\\")] public static extern IntPtr GetForegroundWindow(); [DllImport(\\"user32.dll\\")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count); [DllImport(\\"user32.dll\\")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId); }'; $hwnd = [Win32]::GetForegroundWindow(); $sb = New-Object System.Text.StringBuilder 256; [Win32]::GetWindowText($hwnd, $sb, 256) | Out-Null; $pid2 = 0; [Win32]::GetWindowThreadProcessId($hwnd, [ref]$pid2) | Out-Null; $proc = Get-Process -Id $pid2 -ErrorAction SilentlyContinue; @{ Title = $sb.ToString(); Process = $proc.ProcessName; Path = $proc.Path } | ConvertTo-Json`;
      const result = execSync(`powershell -NoProfile -Command "${script}"`, {
        encoding: "utf-8",
        timeout: 5000,
      });
      return JSON.parse(result);
    }
    return null;
  } catch {
    return null;
  }
}

function getRunningProcesses() {
  try {
    if (process.platform === "win32") {
      const result = execSync(
        'powershell -NoProfile -Command "Get-Process | Select-Object ProcessName, Path -Unique | Where-Object { $_.Path } | ConvertTo-Json"',
        { encoding: "utf-8", timeout: 10000 }
      );
      return JSON.parse(result);
    }
    return [];
  } catch {
    return [];
  }
}

function hashFile(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    return {
      md5: crypto.createHash("md5").update(buffer).digest("hex"),
      sha256: crypto.createHash("sha256").update(buffer).digest("hex"),
    };
  } catch {
    return null;
  }
}

function getInstalledSoftware() {
  try {
    if (process.platform === "win32") {
      const script = `$software = @(); @('HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*','HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*') | ForEach-Object { Get-ItemProperty $_ -ErrorAction SilentlyContinue } | Where-Object { $_.DisplayName } | ForEach-Object { $v = $_.DisplayVersion; if (-not $v) { $v = 'unknown' }; $software += @{ name = $_.DisplayName; version = $v } }; $software | ConvertTo-Json`;
      const result = execSync(`powershell -NoProfile -Command "${script}"`, {
        encoding: "utf-8",
        timeout: 15000,
      });
      return JSON.parse(result || "[]");
    }
    return [];
  } catch {
    return [];
  }
}

function extractDomain(title) {
  const browserPatterns = [
    /^(.+?)\s*[-—]\s*(Google Chrome|Mozilla Firefox|Microsoft Edge|Brave|Opera|Safari|Vivaldi)$/i,
  ];
  for (const pattern of browserPatterns) {
    const match = title.match(pattern);
    if (match) {
      return { isBrowser: true, pageTitle: match[1].trim(), browser: match[2] };
    }
  }
  return { isBrowser: false, pageTitle: title, browser: null };
}

// --- Command execution ---

const ALLOWED_COMMAND_TYPES = new Set([
  "UPDATE_SOFTWARE",
  "UNINSTALL_SOFTWARE",
  "RUN_SCRIPT",
  "RESTART_SERVICE",
  "FORCE_REBOOT",
  "CUSTOM",
]);

async function executeCommand(apiClient, cmd) {
  const { id, commandType, command } = cmd;

  if (!ALLOWED_COMMAND_TYPES.has(commandType)) {
    await apiClient.reportCommandResult(id, "FAILED", `Unknown command type: ${commandType}`, -1);
    return;
  }

  // Full admin access — all commands from the server are trusted
  // Report that we're executing
  await apiClient.reportCommandResult(id, "EXECUTING");

  try {
    if (commandType === "FORCE_REBOOT") {
      await apiClient.reportCommandResult(id, "COMPLETED", "Reboot initiated");
      if (process.platform === "win32") {
        exec("shutdown /r /t 30 /c \"MyDex Agent: Scheduled reboot\"");
      } else {
        exec("sudo shutdown -r +1 'MyDex Agent: Scheduled reboot'");
      }
      return;
    }

    // Execute with full admin privileges via PowerShell (Windows) or bash
    const shell = process.platform === "win32" ? "powershell.exe" : "/bin/bash";
    const shellFlag = process.platform === "win32" ? "-NoProfile -ExecutionPolicy Bypass -Command" : "-c";

    const result = await new Promise((resolve) => {
      exec(`${shell} ${shellFlag} "${command.replace(/"/g, '\\"')}"`, {
        timeout: 600000, // 10 minute timeout for long operations
        maxBuffer: 5 * 1024 * 1024, // 5MB output buffer
      }, (error, stdout, stderr) => {
        resolve({
          exitCode: error ? error.code || 1 : 0,
          output: (stdout || "").slice(0, 4000) + (stderr ? `\n[stderr]: ${stderr.slice(0, 1000)}` : ""),
        });
      });
    });

    const status = result.exitCode === 0 ? "COMPLETED" : "FAILED";
    await apiClient.reportCommandResult(id, status, result.output, result.exitCode);
    console.log(`Command ${id} ${status}: exit ${result.exitCode}`);
  } catch (err) {
    await apiClient.reportCommandResult(id, "FAILED", err.message, -1);
    console.error(`Command ${id} execution error:`, err.message);
  }
}

function startCommandPoller(apiClient) {
  // Poll every 30 seconds for pending commands
  commandPollInterval = setInterval(async () => {
    if (!apiClient.connected) return;

    try {
      const commands = await apiClient.pollCommands();
      for (const cmd of commands) {
        await executeCommand(apiClient, cmd);
      }
    } catch (err) {
      console.error("Command poll error:", err.message);
    }
  }, 30000);

  // Initial poll after 10 seconds
  setTimeout(async () => {
    if (!apiClient.connected) return;
    try {
      const commands = await apiClient.pollCommands();
      for (const cmd of commands) {
        await executeCommand(apiClient, cmd);
      }
    } catch (err) {
      console.error("Initial command poll error:", err.message);
    }
  }, 10000);
}

// --- Main collector orchestration ---

function startCollectors(apiClient, store) {
  const collectSeconds = store.get("collectInterval") || 30;
  const hostname = os.hostname();

  // Register device with server
  const platform = process.platform === "win32" ? "Windows" : process.platform === "darwin" ? "macOS" : "Linux";
  let osVersion = "";
  try {
    if (process.platform === "win32") {
      osVersion = execSync('powershell -NoProfile -Command "[System.Environment]::OSVersion.VersionString"', {
        encoding: "utf-8",
        timeout: 5000,
      }).trim();
    } else {
      osVersion = execSync("uname -rs", { encoding: "utf-8", timeout: 5000 }).trim();
    }
  } catch { /* ignore */ }

  // Get local IP
  let ipAddress = "";
  try {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === "IPv4" && !net.internal) {
          ipAddress = net.address;
          break;
        }
      }
      if (ipAddress) break;
    }
  } catch { /* ignore */ }

  // Register device (async, non-blocking)
  const software = getInstalledSoftware();
  apiClient.registerDevice(hostname, platform, osVersion, ipAddress, software).then((result) => {
    if (result?.device) {
      console.log(`Device registered: ${result.device.id}`);
    }
  });

  // Activity collector - reports active window every N seconds
  activityInterval = setInterval(async () => {
    if (!apiClient.connected) return;
    try {
      const win = getActiveWindow();
      if (!win || !win.Title) return;

      const { isBrowser, pageTitle, browser } = extractDomain(win.Title);

      const event = {
        eventType: isBrowser ? "WEBSITE_VISIT" : "APP_SWITCH",
        appName: win.Process || browser || "unknown",
        windowTitle: pageTitle,
        timestamp: new Date().toISOString(),
        metadata: { hostname, processPath: win.Path },
      };

      await apiClient.sendActivityEvents([event]);
    } catch (err) {
      console.error("Activity collection error:", err.message);
    }
  }, collectSeconds * 1000);

  // File monitoring collector
  startFileWatchers(apiClient, hostname);

  // Hash scan - scans running process executables against IOC database
  async function runHashScan() {
    if (!apiClient.connected) return;
    try {
      const processes = getRunningProcesses();
      const hashes = [];
      const scannedPaths = new Set();

      for (const proc of processes) {
        if (!proc.Path || scannedPaths.has(proc.Path)) continue;
        scannedPaths.add(proc.Path);

        const fileHashes = hashFile(proc.Path);
        if (fileHashes) {
          hashes.push(
            { hashType: "SHA256", hashValue: fileHashes.sha256 },
            { hashType: "MD5", hashValue: fileHashes.md5 }
          );
        }
      }

      if (hashes.length > 0) {
        const result = await apiClient.lookupHashes(hashes, hostname);
        if (result.matched > 0) {
          console.log(`IOC ALERT: ${result.matched} hash matches found!`);
          if (result.blocked > 0) {
            console.log(`BLOCKED: ${result.blocked} processes matched blocked hashes`);
          }
        }
      }
    } catch (err) {
      console.error("Hash scan error:", err.message);
    }
  }

  hashScanInterval = setInterval(runHashScan, (store.get("hashScanInterval") || 3600) * 1000);
  setTimeout(runHashScan, 30000);

  // CVE scan - reports installed software every 24 hours
  async function runCveScan() {
    if (!apiClient.connected) return;
    try {
      const sw = getInstalledSoftware();
      if (sw.length > 0) {
        const result = await apiClient.sendCveScan(hostname, sw);
        if (result.vulnerabilities > 0) {
          console.log(`CVE ALERT: ${result.vulnerabilities} vulnerabilities found!`);
        }
      }
    } catch (err) {
      console.error("CVE scan error:", err.message);
    }
  }

  cveScanInterval = setInterval(runCveScan, 24 * 60 * 60 * 1000);
  setTimeout(runCveScan, 60000);

  // Send initial heartbeat
  apiClient.sendActivityEvents([{
    eventType: "HEARTBEAT",
    timestamp: new Date().toISOString(),
    metadata: { hostname, platform: process.platform, agent: "mydex-desktop", version: "0.2.0" },
  }]).catch(() => {});

  // Heartbeat every 60 seconds
  const heartbeatInterval = setInterval(() => {
    if (!apiClient.connected) return;
    apiClient.sendActivityEvents([{
      eventType: "HEARTBEAT",
      timestamp: new Date().toISOString(),
      metadata: { hostname, platform: process.platform, agent: "mydex-desktop", version: "0.2.0" },
    }]).catch(() => {});
  }, 60000);

  // Command polling - check for remediation commands every 30s
  startCommandPoller(apiClient);

  // Diagnostics - collect system health every 6 hours, first run after 2 minutes
  async function runDiagnostics() {
    if (!apiClient.connected) return;
    try {
      console.log("Running device diagnostics...");
      const diag = await collectDiagnostics();
      await apiClient.sendDiagnostics(diag);
      console.log("Diagnostics reported to server");
    } catch (err) {
      console.error("Diagnostics error:", err.message);
    }
  }

  diagnosticsInterval = setInterval(runDiagnostics, 6 * 60 * 60 * 1000); // Every 6 hours
  setTimeout(runDiagnostics, 120000); // First run after 2 minutes

  return {
    stop() {
      if (activityInterval) clearInterval(activityInterval);
      if (hashScanInterval) clearInterval(hashScanInterval);
      if (cveScanInterval) clearInterval(cveScanInterval);
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      if (commandPollInterval) clearInterval(commandPollInterval);
      if (diagnosticsInterval) clearInterval(diagnosticsInterval);
      stopFileWatchers();
    },
  };
}

module.exports = { startCollectors };
