const EventEmitter = require("events");
const { net, session: electronSession } = require("electron");
const http = require("http");
const https = require("https");

/**
 * Make an HTTP request using Node's http/https modules.
 * This bypasses Electron's fetch restrictions on Set-Cookie headers.
 */
function rawRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const mod = parsed.protocol === "https:" ? https : http;

    const req = mod.request(parsed, {
      method: options.method || "GET",
      headers: options.headers || {},
      timeout: options.timeout || 30000,
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          rawHeaders: res.rawHeaders,
          body: data,
          json: () => { try { return JSON.parse(data); } catch { return null; } },
        });
      });
    });

    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("Request timed out")); });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

class ApiClient extends EventEmitter {
  constructor(serverUrl, sessionToken) {
    super();
    this.serverUrl = serverUrl.replace(/\/$/, "");
    this.sessionToken = sessionToken;
    this.connected = false;
    this.reconnecting = false;
    this.retryCount = 0;
    this.maxRetries = Infinity; // Never stop trying
    this.baseDelay = 5000; // 5 seconds
    this.maxDelay = 300000; // 5 minutes cap
    this.reconnectTimer = null;
    this.deviceId = null; // Set after registration
  }

  getRetryDelay() {
    // Exponential backoff: 5s, 10s, 20s, 40s, 80s, 160s, 300s (cap)
    const delay = Math.min(this.baseDelay * Math.pow(2, this.retryCount), this.maxDelay);
    // Add jitter (±25%)
    const jitter = delay * 0.25 * (Math.random() * 2 - 1);
    return Math.round(delay + jitter);
  }

  async request(path, options = {}) {
    const url = `${this.serverUrl}${path}`;
    const headers = {
      "Content-Type": "application/json",
      Cookie: `authjs.session-token=${this.sessionToken}`,
      ...options.headers,
    };

    try {
      const res = await fetch(url, {
        ...options,
        headers,
        signal: AbortSignal.timeout(30000), // 30s timeout per request
      });

      if (res.status === 401) {
        this.connected = false;
        this.emit("auth-expired");
        throw new Error("Session expired");
      }

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`API error ${res.status}: ${body}`);
      }

      // Mark as connected (only emit event on first success)
      if (!this.connected) {
        this.connected = true;
        this.retryCount = 0;
        this.emit("connected");
      }
      // Keep connected state fresh
      this.connected = true;

      return res.json();
    } catch (err) {
      if (err.message !== "Session expired") {
        const wasConnected = this.connected;
        this.connected = false;
        // Only emit disconnected if we were previously connected (avoid spam)
        if (wasConnected) {
          this.emit("disconnected", err.message);
        }
      }
      throw err;
    }
  }

  async testConnection() {
    try {
      const data = await this.request("/api/auth/session");
      if (data && data.user) {
        this.connected = true;
        this.retryCount = 0;
        return true;
      }
      return false;
    } catch {
      this.connected = false;
      return false;
    }
  }

  async login(email, password) {
    try {
      // Step 1: Get CSRF token using raw HTTP (bypasses Electron cookie restrictions)
      const csrfRes = await rawRequest(`${this.serverUrl}/api/auth/csrf`);
      const csrfData = csrfRes.json();
      if (!csrfData?.csrfToken) {
        return { error: "Failed to get CSRF token from server" };
      }

      // Collect cookies from CSRF response
      const setCookies = Array.isArray(csrfRes.headers["set-cookie"])
        ? csrfRes.headers["set-cookie"]
        : csrfRes.headers["set-cookie"]
        ? [csrfRes.headers["set-cookie"]]
        : [];
      const cookieJar = setCookies.map((c) => c.split(";")[0]).join("; ");

      // Step 2: POST credentials
      const formBody = new URLSearchParams({
        csrfToken: csrfData.csrfToken,
        email,
        password,
        json: "true",
      }).toString();

      const loginRes = await rawRequest(
        `${this.serverUrl}/api/auth/callback/credentials`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Content-Length": Buffer.byteLength(formBody).toString(),
            ...(cookieJar ? { Cookie: cookieJar } : {}),
          },
          body: formBody,
        }
      );

      // Extract session token from set-cookie headers
      const loginCookies = Array.isArray(loginRes.headers["set-cookie"])
        ? loginRes.headers["set-cookie"]
        : loginRes.headers["set-cookie"]
        ? [loginRes.headers["set-cookie"]]
        : [];

      for (const cookie of loginCookies) {
        const match = cookie.match(/(?:__Secure-)?authjs\.session-token=([^;]+)/);
        if (match && match[1]) {
          this.sessionToken = decodeURIComponent(match[1]);
          this.connected = true;
          this.retryCount = 0;
          return { token: this.sessionToken };
        }
      }

      // Step 3: If we got a redirect, follow it to get the session cookie
      if (loginRes.status >= 300 && loginRes.status < 400) {
        const location = loginRes.headers["location"];
        if (location) {
          const followUrl = location.startsWith("http") ? location : `${this.serverUrl}${location}`;
          // Merge cookies from login response
          const allCookies = [...setCookies.map((c) => c.split(";")[0]), ...loginCookies.map((c) => c.split(";")[0])].join("; ");

          const followRes = await rawRequest(followUrl, {
            headers: allCookies ? { Cookie: allCookies } : {},
          });

          const followCookies = Array.isArray(followRes.headers["set-cookie"])
            ? followRes.headers["set-cookie"]
            : followRes.headers["set-cookie"]
            ? [followRes.headers["set-cookie"]]
            : [];

          for (const cookie of followCookies) {
            const match = cookie.match(/(?:__Secure-)?authjs\.session-token=([^;]+)/);
            if (match && match[1]) {
              this.sessionToken = decodeURIComponent(match[1]);
              this.connected = true;
              this.retryCount = 0;
              return { token: this.sessionToken };
            }
          }
        }
      }

      return { error: "Login failed - no session token received" };
    } catch (err) {
      return { error: err.message };
    }
  }

  // --- Auto-reconnect loop ---

  startAutoReconnect(store) {
    if (this.reconnecting) return;
    this.reconnecting = true;

    const tryReconnect = async () => {
      if (this.connected) {
        this.reconnecting = false;
        return;
      }

      const delay = this.getRetryDelay();
      console.log(`Reconnect attempt ${this.retryCount + 1} in ${Math.round(delay / 1000)}s...`);
      this.emit("reconnecting", { attempt: this.retryCount + 1, delay });

      this.reconnectTimer = setTimeout(async () => {
        // First try existing session token
        const ok = await this.testConnection();
        if (ok) {
          console.log("Reconnected with existing session");
          this.reconnecting = false;
          this.emit("reconnected");
          return;
        }

        // Try re-login with stored credentials
        const email = store.get("email");
        const password = store.get("encryptedPassword");
        if (email && password) {
          const result = await this.login(email, password);
          if (result.token) {
            store.set("sessionToken", result.token);
            console.log("Reconnected via re-login");
            this.reconnecting = false;
            this.emit("reconnected");
            return;
          }
        }

        this.retryCount++;
        tryReconnect(); // Schedule next attempt
      }, delay);
    };

    tryReconnect();
  }

  stopAutoReconnect() {
    this.reconnecting = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  // --- Device registration ---

  async registerDevice(hostname, platform, osVersion, ipAddress, software) {
    try {
      const result = await this.request("/api/v1/agents/devices", {
        method: "POST",
        body: JSON.stringify({
          hostname,
          platform,
          agentVersion: "0.2.0",
          osVersion,
          ipAddress,
          installedSoftware: software,
        }),
      });
      if (result.device) {
        this.deviceId = result.device.id;
      }
      return result;
    } catch (err) {
      console.error("Device registration failed:", err.message);
      return null;
    }
  }

  // --- Diagnostics reporting ---

  async sendDiagnostics(diagnostics) {
    return this.request("/api/v1/agents/devices", {
      method: "PATCH",
      body: JSON.stringify(diagnostics),
    });
  }

  // --- Command polling ---

  async pollCommands() {
    try {
      const result = await this.request("/api/v1/agents/commands?pending=true");
      return result.commands || [];
    } catch (err) {
      console.error("Command poll failed:", err.message);
      return [];
    }
  }

  async reportCommandResult(commandId, status, result, exitCode) {
    return this.request("/api/v1/agents/commands", {
      method: "PATCH",
      body: JSON.stringify({
        id: commandId,
        status,
        result: result || undefined,
        exitCode: exitCode !== undefined ? exitCode : undefined,
      }),
    });
  }

  // --- Existing methods ---

  async sendActivityEvents(events) {
    return this.request("/api/v1/activity/events", {
      method: "POST",
      body: JSON.stringify({ events }),
    });
  }

  async lookupHashes(hashes, hostname) {
    return this.request("/api/v1/security/ioc/lookup", {
      method: "POST",
      body: JSON.stringify({ hashes, hostname }),
    });
  }

  async sendCveScan(hostname, software) {
    return this.request("/api/v1/security/cve/scan", {
      method: "POST",
      body: JSON.stringify({ hostname, software }),
    });
  }
}

module.exports = { ApiClient };
