import type { MdmClient, MdmDeviceData } from "./types";

interface JamfToken {
  access_token: string;
  expires_at: number;
}

export class JamfClient implements MdmClient {
  private instanceUrl: string;
  private clientId?: string;
  private clientSecret?: string;
  private apiToken?: string;
  private token: JamfToken | null = null;

  constructor(instanceUrl: string, opts: { clientId?: string; clientSecret?: string; apiToken?: string }) {
    this.instanceUrl = instanceUrl.replace(/\/$/, "");
    this.clientId = opts.clientId;
    this.clientSecret = opts.clientSecret;
    this.apiToken = opts.apiToken;
  }

  private async getAuthHeader(): Promise<string> {
    if (this.apiToken) {
      return `Bearer ${this.apiToken}`;
    }

    if (this.token && Date.now() < this.token.expires_at - 60000) {
      return `Bearer ${this.token.access_token}`;
    }

    if (!this.clientId || !this.clientSecret) {
      throw new Error("Jamf: clientId/clientSecret or apiToken required");
    }

    const res = await fetch(`${this.instanceUrl}/api/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: "client_credentials",
      }),
    });

    if (!res.ok) throw new Error(`Jamf auth failed: ${res.status}`);
    const data = await res.json();
    this.token = {
      access_token: data.access_token,
      expires_at: Date.now() + data.expires_in * 1000,
    };
    return `Bearer ${this.token.access_token}`;
  }

  private async jamfFetch(path: string, options?: RequestInit): Promise<Response> {
    const auth = await this.getAuthHeader();
    return fetch(`${this.instanceUrl}${path}`, {
      ...options,
      headers: {
        Authorization: auth,
        Accept: "application/json",
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });
  }

  async testConnection(): Promise<{ success: boolean; error?: string; deviceCount?: number }> {
    try {
      const res = await this.jamfFetch("/api/v1/computers-inventory?page-size=1");
      if (!res.ok) {
        return { success: false, error: `Jamf API error: ${res.status}` };
      }
      const data = await res.json();
      return { success: true, deviceCount: data.totalCount ?? 0 };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
    }
  }

  async listDevices(): Promise<MdmDeviceData[]> {
    const devices: MdmDeviceData[] = [];
    let page = 0;
    const pageSize = 100;

    while (true) {
      const res = await this.jamfFetch(
        `/api/v1/computers-inventory?page=${page}&page-size=${pageSize}&section=GENERAL&section=HARDWARE&section=OPERATING_SYSTEM&section=USER_AND_LOCATION&section=SECURITY`
      );
      if (!res.ok) throw new Error(`Failed to list devices: ${res.status}`);
      const data = await res.json();
      const results = data.results || [];

      for (const d of results) {
        devices.push(this.mapDevice(d));
      }

      if (results.length < pageSize) break;
      page++;
    }

    return devices;
  }

  async getDevice(mdmDeviceId: string): Promise<MdmDeviceData | null> {
    const res = await this.jamfFetch(`/api/v1/computers-inventory-detail/${mdmDeviceId}`);
    if (!res.ok) return null;
    const d = await res.json();
    return this.mapDevice(d);
  }

  async lockDevice(mdmDeviceId: string): Promise<void> {
    const res = await this.jamfFetch("/api/v1/mdm/commands", {
      method: "POST",
      body: JSON.stringify({
        commandData: { commandType: "DEVICE_LOCK" },
        clientData: [{ managementId: mdmDeviceId }],
      }),
    });
    if (!res.ok) throw new Error(`Lock failed: ${res.status}`);
  }

  async wipeDevice(mdmDeviceId: string): Promise<void> {
    const res = await this.jamfFetch("/api/v1/mdm/commands", {
      method: "POST",
      body: JSON.stringify({
        commandData: { commandType: "ERASE_DEVICE" },
        clientData: [{ managementId: mdmDeviceId }],
      }),
    });
    if (!res.ok) throw new Error(`Wipe failed: ${res.status}`);
  }

  async restartDevice(mdmDeviceId: string): Promise<void> {
    const res = await this.jamfFetch("/api/v1/mdm/commands", {
      method: "POST",
      body: JSON.stringify({
        commandData: { commandType: "RESTART_DEVICE" },
        clientData: [{ managementId: mdmDeviceId }],
      }),
    });
    if (!res.ok) throw new Error(`Restart failed: ${res.status}`);
  }

  async retireDevice(mdmDeviceId: string): Promise<void> {
    const res = await this.jamfFetch("/api/v1/mdm/commands", {
      method: "POST",
      body: JSON.stringify({
        commandData: { commandType: "REMOVE_MDM_PROFILE" },
        clientData: [{ managementId: mdmDeviceId }],
      }),
    });
    if (!res.ok) throw new Error(`Retire failed: ${res.status}`);
  }

  async syncDevice(mdmDeviceId: string): Promise<void> {
    const res = await this.jamfFetch("/api/v1/mdm/commands", {
      method: "POST",
      body: JSON.stringify({
        commandData: { commandType: "UPDATE_INVENTORY" },
        clientData: [{ managementId: mdmDeviceId }],
      }),
    });
    if (!res.ok) throw new Error(`Sync failed: ${res.status}`);
  }

  async deployApp(mdmDeviceId: string, _appId: string): Promise<void> {
    const res = await this.jamfFetch("/api/v1/mdm/commands", {
      method: "POST",
      body: JSON.stringify({
        commandData: { commandType: "INSTALL_APPLICATION", appId: _appId },
        clientData: [{ managementId: mdmDeviceId }],
      }),
    });
    if (!res.ok) throw new Error(`Deploy failed: ${res.status}`);
  }

  private mapDevice(d: Record<string, unknown>): MdmDeviceData {
    const general = (d.general || {}) as Record<string, unknown>;
    const hardware = (d.hardware || {}) as Record<string, unknown>;
    const os = (d.operatingSystem || {}) as Record<string, unknown>;
    const userLocation = (d.userAndLocation || {}) as Record<string, unknown>;
    const security = (d.security || {}) as Record<string, unknown>;

    return {
      mdmDeviceId: String(d.id || general.id || ""),
      serialNumber: (hardware.serialNumber || general.serialNumber) as string | undefined,
      hostname: (general.name || general.hostname) as string | undefined,
      userEmail: (userLocation.email || userLocation.username) as string | undefined,
      deviceName: general.name as string | undefined,
      platform: "macOS",
      osVersion: (os.version || os.name) as string | undefined,
      model: hardware.model as string | undefined,
      manufacturer: "Apple",
      enrollmentStatus: general.managementId ? "enrolled" : "unenrolled",
      complianceStatus: "unknown",
      managementState: general.managed ? "managed" : "unmanaged",
      isEncrypted: (security.fileVault2Status as string)?.toLowerCase() === "all partitions encrypted",
      isJailbroken: false,
      lastCheckIn: general.lastContactTime ? new Date(general.lastContactTime as string) : undefined,
      managedApps: [],
      rawData: d,
    };
  }
}
