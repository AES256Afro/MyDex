export interface MdmDeviceData {
  mdmDeviceId: string;
  serialNumber?: string;
  hostname?: string;
  userEmail?: string;
  enrollmentStatus?: string;
  complianceStatus?: string;
  managementState?: string;
  deviceName?: string;
  platform?: string;
  osVersion?: string;
  model?: string;
  manufacturer?: string;
  isEncrypted?: boolean;
  isJailbroken?: boolean;
  lastCheckIn?: Date;
  managedApps?: string[];
  rawData?: Record<string, unknown>;
}

export interface MdmClient {
  testConnection(): Promise<{ success: boolean; message?: string; error?: string }>;
  listDevices(): Promise<MdmDeviceData[]>;
  getDevice(deviceId: string): Promise<MdmDeviceData | null>;
  lockDevice(deviceId: string): Promise<{ success: boolean; error?: string }>;
  wipeDevice(deviceId: string): Promise<{ success: boolean; error?: string }>;
  restartDevice(deviceId: string): Promise<{ success: boolean; error?: string }>;
  deployApp(deviceId: string, appName: string): Promise<{ success: boolean; error?: string }>;
  retireDevice(deviceId: string): Promise<{ success: boolean; error?: string }>;
  syncDevice(deviceId: string): Promise<{ success: boolean; error?: string }>;
}

export interface MdmProviderCredentials {
  providerType: string;
  clientId?: string;
  clientSecret?: string;
  tenantId?: string;
  apiToken?: string;
  instanceUrl?: string;
}
