import type { MdmClient, MdmDeviceData } from "./types";

export class KandjiClient implements MdmClient {
  private instanceUrl: string;
  private apiToken: string;

  constructor(instanceUrl: string, apiToken: string) {
    this.instanceUrl = instanceUrl.replace(/\/$/, "");
    this.apiToken = apiToken;
  }

  private async kandjiFetch(path: string, options?: RequestInit): Promise<Response> {
    return fetch(`${this.instanceUrl}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });
  }

  async testConnection(): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const res = await this.kandjiFetch("/api/v1/devices?limit=1");
      if (!res.ok) {
        return { success: false, error: `Kandji API error: ${res.status}` };
      }
      return { success: true, message: "Connected to Kandji successfully." };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
    }
  }

  async listDevices(): Promise<MdmDeviceData[]> {
    const devices: MdmDeviceData[] = [];
    let offset = 0;
    const limit = 300;

    while (true) {
      const res = await this.kandjiFetch(`/api/v1/devices?limit=${limit}&offset=${offset}`);
      if (!res.ok) throw new Error(`Failed to list devices: ${res.status}`);
      const data = await res.json();
      const results = Array.isArray(data) ? data : [];

      for (const d of results) {
        devices.push(this.mapDevice(d));
      }

      if (results.length < limit) break;
      offset += limit;
    }

    return devices;
  }

  async getDevice(mdmDeviceId: string): Promise<MdmDeviceData | null> {
    const res = await this.kandjiFetch(`/api/v1/devices/${mdmDeviceId}`);
    if (!res.ok) return null;
    const d = await res.json();
    return this.mapDevice(d);
  }

  async lockDevice(mdmDeviceId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await this.kandjiFetch(`/api/v1/devices/${mdmDeviceId}/action/lock`, { method: "POST" });
      if (!res.ok && res.status !== 204) return { success: false, error: `Lock failed: ${res.status}` };
      return { success: true };
    } catch (e) { return { success: false, error: e instanceof Error ? e.message : "Lock failed" }; }
  }

  async wipeDevice(mdmDeviceId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await this.kandjiFetch(`/api/v1/devices/${mdmDeviceId}/action/erase`, { method: "POST" });
      if (!res.ok && res.status !== 204) return { success: false, error: `Wipe failed: ${res.status}` };
      return { success: true };
    } catch (e) { return { success: false, error: e instanceof Error ? e.message : "Wipe failed" }; }
  }

  async restartDevice(mdmDeviceId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await this.kandjiFetch(`/api/v1/devices/${mdmDeviceId}/action/restart`, { method: "POST" });
      if (!res.ok && res.status !== 204) return { success: false, error: `Restart failed: ${res.status}` };
      return { success: true };
    } catch (e) { return { success: false, error: e instanceof Error ? e.message : "Restart failed" }; }
  }

  async retireDevice(mdmDeviceId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await this.kandjiFetch(`/api/v1/devices/${mdmDeviceId}/action/unenroll`, { method: "POST" });
      if (!res.ok && res.status !== 204) return { success: false, error: `Retire failed: ${res.status}` };
      return { success: true };
    } catch (e) { return { success: false, error: e instanceof Error ? e.message : "Retire failed" }; }
  }

  async syncDevice(mdmDeviceId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await this.kandjiFetch(`/api/v1/devices/${mdmDeviceId}/action/blankpush`, { method: "POST" });
      if (!res.ok && res.status !== 204) return { success: false, error: `Sync failed: ${res.status}` };
      return { success: true };
    } catch (e) { return { success: false, error: e instanceof Error ? e.message : "Sync failed" }; }
  }

  async deployApp(mdmDeviceId: string, appId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await this.kandjiFetch(`/api/v1/devices/${mdmDeviceId}/apps/${appId}/install`, { method: "POST" });
      if (!res.ok && res.status !== 204) return { success: false, error: `Deploy failed: ${res.status}` };
      return { success: true };
    } catch (e) { return { success: false, error: e instanceof Error ? e.message : "Deploy failed" }; }
  }

  private mapDevice(d: Record<string, unknown>): MdmDeviceData {
    return {
      mdmDeviceId: d.device_id as string,
      serialNumber: d.serial_number as string | undefined,
      hostname: d.device_name as string | undefined,
      userEmail: (d.user as Record<string, unknown>)?.email as string | undefined,
      deviceName: d.device_name as string | undefined,
      platform: this.mapPlatform(d.platform as string),
      osVersion: d.os_version as string | undefined,
      model: d.model as string | undefined,
      manufacturer: "Apple",
      enrollmentStatus: "enrolled",
      complianceStatus: (d.blueprint_status as string) === "pass" ? "compliant" : "noncompliant",
      managementState: "managed",
      isEncrypted: d.filevault_enabled as boolean | undefined,
      isJailbroken: false,
      lastCheckIn: d.last_check_in ? new Date(d.last_check_in as string) : undefined,
      managedApps: [],
      rawData: d,
    };
  }

  private mapPlatform(p?: string): string {
    if (!p) return "Unknown";
    if (p.toLowerCase().includes("mac")) return "macOS";
    if (p.toLowerCase().includes("ios") || p.toLowerCase().includes("iphone") || p.toLowerCase().includes("ipad")) return "iOS";
    if (p.toLowerCase().includes("tv")) return "tvOS";
    return p;
  }
}
