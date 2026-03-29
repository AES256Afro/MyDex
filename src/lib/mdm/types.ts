export interface MdmDeviceData {
  mdmDeviceId: string;
  serialNumber?: string;
  hostname?: string;
  userEmail?: string;
  deviceName?: string;
  platform?: string;
  osVersion?: string;
  model?: string;
  manufacturer?: string;
  enrollmentStatus?: string;
  complianceStatus?: string;
  managementState?: string;
  isEncrypted?: boolean;
  isJailbroken?: boolean;
  lastCheckIn?: Date;
  managedApps?: MdmManagedApp[];
  rawData?: Record<string, unknown>;
}

export interface MdmManagedApp {
  name: string;
  version: string;
  installState: string;
}

export interface MdmClient {
  testConnection(): Promise<{ success: boolean; error?: string; deviceCount?: number }>;
  listDevices(): Promise<MdmDeviceData[]>;
  getDevice(mdmDeviceId: string): Promise<MdmDeviceData | null>;
  lockDevice(mdmDeviceId: string): Promise<void>;
  wipeDevice(mdmDeviceId: string): Promise<void>;
  restartDevice(mdmDeviceId: string): Promise<void>;
  retireDevice(mdmDeviceId: string): Promise<void>;
  syncDevice(mdmDeviceId: string): Promise<void>;
  deployApp(mdmDeviceId: string, appId: string): Promise<void>;
}

export interface MdmProviderCredentials {
  providerType: string;
  clientId?: string;
  clientSecret?: string;
  tenantId?: string;
  apiToken?: string;
  instanceUrl?: string;
}
