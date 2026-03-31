import type { MdmClient, MdmDeviceData } from "./types";

interface IntuneToken {
  access_token: string;
  expires_at: number;
}

export class IntuneClient implements MdmClient {
  private tenantId: string;
  private clientId: string;
  private clientSecret: string;
  private token: IntuneToken | null = null;

  constructor(tenantId: string, clientId: string, clientSecret: string) {
    this.tenantId = tenantId;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  private async getToken(): Promise<string> {
    if (this.token && Date.now() < this.token.expires_at - 60000) {
      return this.token.access_token;
    }

    const res = await fetch(
      `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          scope: "https://graph.microsoft.com/.default",
          grant_type: "client_credentials",
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Intune auth failed: ${err}`);
    }

    const data = await res.json();
    this.token = {
      access_token: data.access_token,
      expires_at: Date.now() + data.expires_in * 1000,
    };
    return this.token.access_token;
  }

  private async graphFetch(url: string, options?: RequestInit): Promise<Response> {
    const token = await this.getToken();
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get("Retry-After") || "5", 10);
      await new Promise((r) => setTimeout(r, retryAfter * 1000));
      return this.graphFetch(url, options);
    }

    return res;
  }

  async testConnection(): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const res = await this.graphFetch(
        "https://graph.microsoft.com/v1.0/deviceManagement/managedDevices?$top=1&$count=true",
        { headers: { ConsistencyLevel: "eventual" } }
      );
      if (!res.ok) {
        const err = await res.text();
        return { success: false, error: `Graph API error: ${res.status} ${err}` };
      }
      const data = await res.json();
      const count = data["@odata.count"] ?? data.value?.length ?? 0;
      return { success: true, message: `Connected. ${count} managed device(s) found.` };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
    }
  }

  async listDevices(): Promise<MdmDeviceData[]> {
    const devices: MdmDeviceData[] = [];
    let url: string | null =
      "https://graph.microsoft.com/v1.0/deviceManagement/managedDevices?$top=100";

    while (url) {
      const res = await this.graphFetch(url);
      if (!res.ok) throw new Error(`Failed to list devices: ${res.status}`);
      const data = await res.json();

      for (const d of data.value || []) {
        devices.push(this.mapDevice(d));
      }

      url = data["@odata.nextLink"] || null;
    }

    return devices;
  }

  async getDevice(mdmDeviceId: string): Promise<MdmDeviceData | null> {
    const res = await this.graphFetch(
      `https://graph.microsoft.com/v1.0/deviceManagement/managedDevices/${mdmDeviceId}`
    );
    if (!res.ok) return null;
    const d = await res.json();
    return this.mapDevice(d);
  }

  async lockDevice(mdmDeviceId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await this.graphFetch(
        `https://graph.microsoft.com/v1.0/deviceManagement/managedDevices/${mdmDeviceId}/remoteLock`,
        { method: "POST" }
      );
      if (!res.ok && res.status !== 204) return { success: false, error: `Lock failed: ${res.status}` };
      return { success: true };
    } catch (e) { return { success: false, error: e instanceof Error ? e.message : "Lock failed" }; }
  }

  async wipeDevice(mdmDeviceId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await this.graphFetch(
        `https://graph.microsoft.com/v1.0/deviceManagement/managedDevices/${mdmDeviceId}/wipe`,
        { method: "POST", body: JSON.stringify({ keepEnrollmentData: false, keepUserData: false }) }
      );
      if (!res.ok && res.status !== 204) return { success: false, error: `Wipe failed: ${res.status}` };
      return { success: true };
    } catch (e) { return { success: false, error: e instanceof Error ? e.message : "Wipe failed" }; }
  }

  async restartDevice(mdmDeviceId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await this.graphFetch(
        `https://graph.microsoft.com/v1.0/deviceManagement/managedDevices/${mdmDeviceId}/rebootNow`,
        { method: "POST" }
      );
      if (!res.ok && res.status !== 204) return { success: false, error: `Restart failed: ${res.status}` };
      return { success: true };
    } catch (e) { return { success: false, error: e instanceof Error ? e.message : "Restart failed" }; }
  }

  async retireDevice(mdmDeviceId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await this.graphFetch(
        `https://graph.microsoft.com/v1.0/deviceManagement/managedDevices/${mdmDeviceId}/retire`,
        { method: "POST" }
      );
      if (!res.ok && res.status !== 204) return { success: false, error: `Retire failed: ${res.status}` };
      return { success: true };
    } catch (e) { return { success: false, error: e instanceof Error ? e.message : "Retire failed" }; }
  }

  async syncDevice(mdmDeviceId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await this.graphFetch(
        `https://graph.microsoft.com/v1.0/deviceManagement/managedDevices/${mdmDeviceId}/syncDevice`,
        { method: "POST" }
      );
      if (!res.ok && res.status !== 204) return { success: false, error: `Sync failed: ${res.status}` };
      return { success: true };
    } catch (e) { return { success: false, error: e instanceof Error ? e.message : "Sync failed" }; }
  }

  async deployApp(mdmDeviceId: string, appId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Intune app assignment is group-based, not per-device
      // For simplicity, we trigger an app install intent
      const res = await this.graphFetch(
        `https://graph.microsoft.com/v1.0/deviceManagement/managedDevices/${mdmDeviceId}/installApp`,
        { method: "POST", body: JSON.stringify({ "@odata.type": "#microsoft.graph.managedDeviceMobileAppConfigurationAssignment", appId }) }
      );
      if (!res.ok && res.status !== 204) return { success: false, error: `Deploy failed: ${res.status}` };
      return { success: true };
    } catch (e) { return { success: false, error: e instanceof Error ? e.message : "Deploy failed" }; }
  }

  private mapDevice(d: Record<string, unknown>): MdmDeviceData {
    return {
      mdmDeviceId: d.id as string,
      serialNumber: d.serialNumber as string | undefined,
      hostname: d.deviceName as string | undefined,
      userEmail: d.userPrincipalName as string | undefined,
      deviceName: d.deviceName as string | undefined,
      platform: this.mapPlatform(d.operatingSystem as string),
      osVersion: d.osVersion as string | undefined,
      model: d.model as string | undefined,
      manufacturer: d.manufacturer as string | undefined,
      enrollmentStatus: this.mapEnrollment(d.managementState as string),
      complianceStatus: this.mapCompliance(d.complianceState as string),
      managementState: d.managementState as string | undefined,
      isEncrypted: d.isEncrypted as boolean | undefined,
      isJailbroken: (d.jailBroken as string) === "True",
      lastCheckIn: d.lastSyncDateTime ? new Date(d.lastSyncDateTime as string) : undefined,
      managedApps: [],
      rawData: d,
    };
  }

  private mapPlatform(os?: string): string {
    if (!os) return "Unknown";
    const lower = os.toLowerCase();
    if (lower.includes("windows")) return "Windows";
    if (lower.includes("mac") || lower.includes("ios")) return "macOS";
    if (lower.includes("android")) return "Android";
    return os;
  }

  private mapEnrollment(state?: string): string {
    if (!state) return "unknown";
    if (state === "managed") return "enrolled";
    if (state === "retirePending" || state === "wipePending") return "unenrolled";
    return state;
  }

  private mapCompliance(state?: string): string {
    if (!state) return "unknown";
    if (state === "compliant") return "compliant";
    if (state === "noncompliant") return "noncompliant";
    return "unknown";
  }
}
