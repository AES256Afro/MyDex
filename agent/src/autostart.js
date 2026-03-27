const { app } = require("electron");
const { execSync } = require("child_process");
const path = require("path");

const REGISTRY_KEY = "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run";
const APP_NAME = "MyDexAgent";

/**
 * Get the path to the installed executable.
 * In development this is the electron.exe; in production it's the packaged .exe.
 */
function getExePath() {
  if (app.isPackaged) {
    return `"${process.execPath}"`;
  }
  // Dev mode: use electron with the project path
  return `"${process.execPath}" "${path.resolve(__dirname, "..")}"`;
}

// --- Windows Registry approach ---

function isAutoStartEnabled() {
  if (process.platform !== "win32") return false;
  try {
    const psCommand = `Get-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run' -Name '${APP_NAME}' -ErrorAction Stop | Select-Object -ExpandProperty ${APP_NAME}`;
    execSync(
      `powershell -NoProfile -Command "${psCommand}"`,
      { encoding: "utf-8", timeout: 5000 }
    );
    return true;
  } catch {
    return false;
  }
}

function enableAutoStart() {
  if (process.platform !== "win32") {
    console.log("Auto-start: only Windows registry method is supported currently");
    return false;
  }

  try {
    // Build the value: for packaged apps it's just the exe path,
    // for dev mode it's electron.exe + project path
    let regValue;
    if (app.isPackaged) {
      regValue = process.execPath;
    } else {
      regValue = `${process.execPath} ${path.resolve(__dirname, "..")}`;
    }

    // Use PowerShell to set the registry value — handles spaces in paths correctly
    const psCommand = `Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run' -Name '${APP_NAME}' -Value '${regValue}'`;
    execSync(
      `powershell -NoProfile -Command "${psCommand}"`,
      { encoding: "utf-8", timeout: 5000 }
    );
    console.log("Auto-start enabled via registry");
    return true;
  } catch (err) {
    console.error("Failed to enable auto-start:", err.message);
    return false;
  }
}

function disableAutoStart() {
  if (process.platform !== "win32") return false;

  try {
    const psCommand = `Remove-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run' -Name '${APP_NAME}' -ErrorAction SilentlyContinue`;
    execSync(
      `powershell -NoProfile -Command "${psCommand}"`,
      { encoding: "utf-8", timeout: 5000 }
    );
    console.log("Auto-start disabled");
    return true;
  } catch {
    // Key might not exist
    return true;
  }
}

// --- Windows Scheduled Task approach (more resilient) ---

function enableScheduledTask() {
  if (process.platform !== "win32") return false;

  try {
    const exePath = getExePath().replace(/"/g, "");
    // Create a scheduled task that runs at logon
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <Triggers>
    <LogonTrigger>
      <Enabled>true</Enabled>
    </LogonTrigger>
  </Triggers>
  <Principals>
    <Principal>
      <LogonType>InteractiveToken</LogonType>
      <RunLevel>LeastPrivilege</RunLevel>
    </Principal>
  </Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <AllowHardTerminate>true</AllowHardTerminate>
    <StartWhenAvailable>true</StartWhenAvailable>
    <RunOnlyIfNetworkAvailable>false</RunOnlyIfNetworkAvailable>
    <AllowStartOnDemand>true</AllowStartOnDemand>
    <Enabled>true</Enabled>
    <Hidden>false</Hidden>
    <RestartOnFailure>
      <Interval>PT1M</Interval>
      <Count>999</Count>
    </RestartOnFailure>
    <ExecutionTimeLimit>PT0S</ExecutionTimeLimit>
  </Settings>
  <Actions>
    <Exec>
      <Command>${exePath}</Command>
      <Arguments>--hidden</Arguments>
    </Exec>
  </Actions>
</Task>`;

    const tempFile = path.join(app.getPath("temp"), "mydex-task.xml");
    require("fs").writeFileSync(tempFile, xml, "utf-8");

    execSync(
      `schtasks /Create /TN "MyDex Agent" /XML "${tempFile}" /F`,
      { encoding: "utf-8", timeout: 10000 }
    );

    // Clean up temp file
    try { require("fs").unlinkSync(tempFile); } catch { /* ignore */ }

    console.log("Scheduled task created");
    return true;
  } catch (err) {
    console.error("Failed to create scheduled task:", err.message);
    return false;
  }
}

function disableScheduledTask() {
  if (process.platform !== "win32") return false;

  try {
    execSync(
      `schtasks /Delete /TN "MyDex Agent" /F 2>nul`,
      { encoding: "utf-8", timeout: 5000 }
    );
    return true;
  } catch {
    return true;
  }
}

function isScheduledTaskEnabled() {
  if (process.platform !== "win32") return false;
  try {
    const result = execSync(
      `schtasks /Query /TN "MyDex Agent" 2>nul`,
      { encoding: "utf-8", timeout: 5000 }
    );
    return result.includes("MyDex Agent");
  } catch {
    return false;
  }
}

module.exports = {
  enableAutoStart,
  disableAutoStart,
  isAutoStartEnabled,
  enableScheduledTask,
  disableScheduledTask,
  isScheduledTaskEnabled,
};
