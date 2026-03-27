const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, Notification } = require("electron");
const path = require("path");
const Store = require("electron-store");
const { startCollectors } = require("./collectors");
const { ApiClient } = require("./api-client");
const { collectDiagnostics } = require("./diagnostics");
const {
  enableAutoStart,
  disableAutoStart,
  isAutoStartEnabled,
  enableScheduledTask,
  disableScheduledTask,
  isScheduledTaskEnabled,
} = require("./autostart");

const store = new Store({
  defaults: {
    serverUrl: "http://localhost:3000",
    email: "",
    sessionToken: "",
    collectInterval: 30, // seconds
    hashScanInterval: 3600, // seconds
    autoStart: true, // enabled by default
    useScheduledTask: true, // use Task Scheduler for persistence
    startHidden: true, // start minimized to tray
  },
});

let tray = null;
let configWindow = null;
let apiClient = null;
let collectors = null;
let isQuitting = false;

// Check if launched with --hidden flag (from scheduled task or startup)
const launchedHidden = process.argv.includes("--hidden");

// Prevent multiple instances
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  return;
}

app.on("second-instance", () => {
  // If another instance tries to start, show the config window
  showConfigWindow();
});

function createTray() {
  // Load the tray icon from assets
  const iconPath = path.join(__dirname, "..", "assets", "tray-icon.png");
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon);

  updateTrayMenu();
  tray.setToolTip("MyDex Agent");

  tray.on("double-click", () => {
    showConfigWindow();
  });
}

function updateTrayMenu() {
  const isConnected = apiClient?.connected || false;
  const hasToken = !!store.get("sessionToken");
  const autoStartOn = isAutoStartEnabled() || isScheduledTaskEnabled();

  let statusLabel = "Disconnected";
  if (isConnected) statusLabel = "Connected";
  else if (hasToken && apiClient?.reconnecting) statusLabel = "Reconnecting...";
  else if (hasToken) statusLabel = "Connecting...";

  const contextMenu = Menu.buildFromTemplate([
    {
      label: `MyDex Agent — ${statusLabel}`,
      enabled: false,
    },
    { type: "separator" },
    {
      label: "Settings",
      click: () => showConfigWindow(),
    },
    {
      label: isConnected ? "Disconnect" : "Connect",
      click: () => {
        if (isConnected) {
          disconnect();
        } else {
          showConfigWindow();
        }
      },
    },
    {
      label: "Force Sync Now",
      enabled: isConnected,
      click: () => runForceSync(),
    },
    {
      label: "Run Diagnostics",
      enabled: isConnected,
      click: () => runDiagnosticsSync(),
    },
    { type: "separator" },
    {
      label: "Start with Windows",
      type: "checkbox",
      checked: autoStartOn,
      click: (menuItem) => {
        if (menuItem.checked) {
          setupAutoStart();
        } else {
          removeAutoStart();
        }
        store.set("autoStart", menuItem.checked);
      },
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(contextMenu);
}

function showConfigWindow() {
  if (configWindow) {
    configWindow.focus();
    return;
  }

  configWindow = new BrowserWindow({
    width: 480,
    height: 580,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  configWindow.loadFile(path.join(__dirname, "..", "ui", "config.html"));
  configWindow.setMenuBarVisibility(false);

  configWindow.on("closed", () => {
    configWindow = null;
  });
}

function setupAutoStart() {
  enableAutoStart();
  if (store.get("useScheduledTask")) {
    enableScheduledTask();
  }
  console.log("Auto-start configured");
}

function removeAutoStart() {
  disableAutoStart();
  disableScheduledTask();
  console.log("Auto-start removed");
}

async function runForceSync() {
  if (!apiClient?.connected) return;
  showNotification("MyDex Agent", "Force sync started...");
  try {
    const os = require("os");
    await apiClient.sendActivityEvents([{
      eventType: "HEARTBEAT",
      timestamp: new Date().toISOString(),
      metadata: { hostname: os.hostname(), platform: process.platform, agent: "mydex-desktop", version: "0.2.0", forceSync: true },
    }]);
    showNotification("MyDex Agent", "Sync complete");
  } catch (err) {
    showNotification("MyDex Agent", `Sync failed: ${err.message}`);
  }
}

async function runDiagnosticsSync() {
  if (!apiClient?.connected) return;
  showNotification("MyDex Agent", "Running diagnostics...");
  try {
    const diag = await collectDiagnostics();
    await apiClient.sendDiagnostics(diag);
    showNotification("MyDex Agent", "Diagnostics reported to server");
  } catch (err) {
    console.error("Diagnostics sync error:", err.message);
    showNotification("MyDex Agent", `Diagnostics failed: ${err.message}`);
  }
}

function disconnect() {
  store.set("sessionToken", "");
  if (apiClient) {
    apiClient.stopAutoReconnect();
    apiClient.connected = false;
  }
  if (collectors) {
    collectors.stop();
    collectors = null;
  }
  updateTrayMenu();
}

async function connect() {
  const serverUrl = store.get("serverUrl");
  const sessionToken = store.get("sessionToken");

  if (!serverUrl || !sessionToken) {
    console.log("No server URL or session token configured");
    updateTrayMenu();
    return;
  }

  apiClient = new ApiClient(serverUrl, sessionToken);

  // Wire up event listeners
  let hasShownConnected = false;
  apiClient.on("connected", () => {
    console.log("Connected to server");
    updateTrayMenu();
    if (!hasShownConnected) {
      hasShownConnected = true;
      showNotification("MyDex Agent", "Connected to server");
    }
  });

  apiClient.on("disconnected", (reason) => {
    console.log("Disconnected:", reason);
    updateTrayMenu();
    // Start auto-reconnect
    apiClient.startAutoReconnect(store);
  });

  apiClient.on("reconnecting", ({ attempt, delay }) => {
    console.log(`Reconnect attempt ${attempt}, next in ${Math.round(delay / 1000)}s`);
    updateTrayMenu();
  });

  apiClient.on("reconnected", () => {
    console.log("Reconnected to server");
    updateTrayMenu();
    // Restart collectors with fresh connection
    if (collectors) collectors.stop();
    collectors = startCollectors(apiClient, store);
  });

  apiClient.on("auth-expired", () => {
    console.log("Session expired, attempting re-login...");
    updateTrayMenu();
    apiClient.startAutoReconnect(store);
  });

  // Test connection
  const ok = await apiClient.testConnection();
  if (ok) {
    collectors = startCollectors(apiClient, store);
    console.log("MyDex Agent: Connected and collecting");
  } else {
    console.log("MyDex Agent: Cannot connect, starting auto-reconnect...");
    apiClient.startAutoReconnect(store);
  }

  updateTrayMenu();
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

async function initialize() {
  // Set up auto-start on first run
  const autoStart = store.get("autoStart");
  if (autoStart && !isAutoStartEnabled()) {
    setupAutoStart();
  }

  await connect();
}

app.whenReady().then(() => {
  createTray();
  initialize();

  // Hide dock icon on macOS (tray-only app)
  if (process.platform === "darwin") {
    app.dock.hide();
  }

  // If launched hidden (e.g., from startup), don't show config window
  if (!launchedHidden && !store.get("sessionToken")) {
    // First run without credentials — show config
    showConfigWindow();
  }
});

// Prevent app from closing when all windows are closed (keep in tray)
app.on("window-all-closed", (e) => {
  if (!isQuitting) {
    e.preventDefault();
  }
});

app.on("before-quit", () => {
  isQuitting = true;
  if (collectors) collectors.stop();
  if (apiClient) apiClient.stopAutoReconnect();
});

// --- IPC Handlers ---

ipcMain.handle("get-config", () => ({
  serverUrl: store.get("serverUrl"),
  email: store.get("email"),
  collectInterval: store.get("collectInterval"),
  isConnected: apiClient?.connected || false,
  isReconnecting: apiClient?.reconnecting || false,
  autoStart: isAutoStartEnabled() || isScheduledTaskEnabled(),
}));

ipcMain.handle("save-config", async (event, config) => {
  store.set("serverUrl", config.serverUrl);
  store.set("email", config.email);
  if (config.collectInterval) store.set("collectInterval", config.collectInterval);
  if (config.autoStart !== undefined) {
    store.set("autoStart", config.autoStart);
    if (config.autoStart) {
      setupAutoStart();
    } else {
      removeAutoStart();
    }
  }
  return { success: true };
});

ipcMain.handle("login", async (event, { serverUrl, email, password }) => {
  try {
    // Disconnect existing if any
    if (collectors) {
      collectors.stop();
      collectors = null;
    }
    if (apiClient) {
      apiClient.stopAutoReconnect();
    }

    const client = new ApiClient(serverUrl, "");
    const result = await client.login(email, password);
    if (result.token) {
      store.set("serverUrl", serverUrl);
      store.set("email", email);
      store.set("sessionToken", result.token);

      // Set up the full connection
      await connect();

      return { success: true };
    }
    return { success: false, error: result.error || "Login failed" };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("disconnect", () => {
  disconnect();
  return { success: true };
});

ipcMain.handle("get-status", () => ({
  connected: apiClient?.connected || false,
  reconnecting: apiClient?.reconnecting || false,
  retryCount: apiClient?.retryCount || 0,
  deviceId: apiClient?.deviceId || null,
}));
