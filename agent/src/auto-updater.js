const { app, Notification } = require("electron");
const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const { exec } = require("child_process");

const CURRENT_VERSION = require("../package.json").version;
const CHECK_INTERVAL = 4 * 60 * 60 * 1000; // Check every 4 hours

let checkTimer = null;
let updateInProgress = false;
let onUpdateAvailable = null; // Callback for tray menu integration

/**
 * Compare two semver strings. Returns 1 if a > b, -1 if a < b, 0 if equal.
 */
function compareVersions(a, b) {
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

/**
 * Download a file from a URL, following redirects.
 */
function downloadFile(url, destPath, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) return reject(new Error("Too many redirects"));

    const parsed = new URL(url);
    const mod = parsed.protocol === "https:" ? https : http;

    const req = mod.get(url, { timeout: 120000 }, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = res.headers.location.startsWith("http")
          ? res.headers.location
          : `${parsed.protocol}//${parsed.host}${res.headers.location}`;
        return downloadFile(redirectUrl, destPath, maxRedirects - 1).then(resolve).catch(reject);
      }

      if (res.statusCode !== 200) {
        return reject(new Error(`Download failed: HTTP ${res.statusCode}`));
      }

      const file = fs.createWriteStream(destPath);
      res.pipe(file);
      file.on("finish", () => {
        file.close();
        resolve(destPath);
      });
      file.on("error", (err) => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
    });

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Download timed out"));
    });
  });
}

/**
 * Check the server for available updates.
 */
async function checkForUpdate(serverUrl) {
  const url = `${serverUrl}/api/v1/agents/update-check?version=${CURRENT_VERSION}&platform=${process.platform}`;

  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const mod = parsed.protocol === "https:" ? https : http;

    const req = mod.get(url, { timeout: 15000 }, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          const result = JSON.parse(data);
          resolve(result);
        } catch {
          reject(new Error("Invalid update check response"));
        }
      });
    });

    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("Update check timed out")); });
  });
}

/**
 * Download and install the update.
 * Windows: download .exe installer, run it silently, quit current app.
 * macOS: download .dmg, notify user to install manually.
 * Linux: download .deb, install via dpkg, restart.
 */
async function downloadAndInstall(serverUrl, downloadPath) {
  if (updateInProgress) {
    console.log("[updater] Update already in progress");
    return { success: false, error: "Update already in progress" };
  }

  updateInProgress = true;
  const tempDir = app.getPath("temp");

  try {
    // Construct full download URL
    const fullUrl = downloadPath.startsWith("http")
      ? downloadPath
      : `${serverUrl}${downloadPath}`;

    let ext = "exe";
    if (process.platform === "darwin") ext = "dmg";
    else if (process.platform === "linux") ext = "deb";

    const destPath = path.join(tempDir, `mydex-agent-update.${ext}`);

    console.log(`[updater] Downloading update from ${fullUrl}`);
    showNotification("MyDex Agent", "Downloading update...");

    await downloadFile(fullUrl, destPath);
    console.log(`[updater] Downloaded to ${destPath}`);

    // Platform-specific install
    if (process.platform === "win32") {
      // Run NSIS installer silently and quit
      console.log("[updater] Launching installer...");
      showNotification("MyDex Agent", "Installing update — the agent will restart.");

      // Detach the installer process so it survives agent exit
      const child = exec(`"${destPath}" /S`, {
        detached: true,
        windowsHide: true,
      });
      child.unref();

      // Give the installer a moment to start, then quit
      setTimeout(() => {
        app.quit();
      }, 2000);

      return { success: true, message: "Installer launched" };
    } else if (process.platform === "darwin") {
      // macOS: can't silently install .dmg — notify user
      showNotification("MyDex Agent", `Update downloaded to ${destPath}. Please open it to install.`);
      const { shell } = require("electron");
      shell.showItemInFolder(destPath);
      return { success: true, message: "DMG downloaded, user notified" };
    } else {
      // Linux: install .deb and restart
      console.log("[updater] Installing .deb package...");
      await new Promise((resolve, reject) => {
        exec(`sudo dpkg -i "${destPath}" && sudo systemctl restart mydex-agent 2>/dev/null || true`, {
          timeout: 120000,
        }, (error) => {
          if (error) reject(error);
          else resolve();
        });
      });
      showNotification("MyDex Agent", "Update installed. Restarting...");
      setTimeout(() => app.relaunch() && app.quit(), 1000);
      return { success: true, message: "Update installed" };
    }
  } catch (err) {
    console.error("[updater] Update failed:", err.message);
    showNotification("MyDex Agent", `Update failed: ${err.message}`);
    return { success: false, error: err.message };
  } finally {
    updateInProgress = false;
  }
}

function showNotification(title, body) {
  try {
    if (Notification.isSupported()) {
      new Notification({ title, body, silent: true }).show();
    }
  } catch {
    // Notifications not available
  }
}

/**
 * Start the periodic update checker.
 */
function startUpdateChecker(serverUrl, callback) {
  onUpdateAvailable = callback;

  // Check on startup (after 30-second delay to let the agent settle)
  setTimeout(() => runCheck(serverUrl), 30000);

  // Then check every 4 hours
  checkTimer = setInterval(() => runCheck(serverUrl), CHECK_INTERVAL);
}

async function runCheck(serverUrl) {
  try {
    const result = await checkForUpdate(serverUrl);
    if (result.updateAvailable) {
      console.log(`[updater] Update available: ${result.currentVersion} → ${result.latestVersion}`);
      if (onUpdateAvailable) {
        onUpdateAvailable(result);
      }
    } else {
      console.log(`[updater] Agent is up to date (${CURRENT_VERSION})`);
    }
  } catch (err) {
    console.error("[updater] Update check failed:", err.message);
  }
}

function stopUpdateChecker() {
  if (checkTimer) {
    clearInterval(checkTimer);
    checkTimer = null;
  }
}

module.exports = {
  CURRENT_VERSION,
  checkForUpdate,
  downloadAndInstall,
  startUpdateChecker,
  stopUpdateChecker,
  compareVersions,
};
