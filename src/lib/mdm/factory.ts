import type { MdmClient, MdmProviderCredentials } from "./types";
import { IntuneClient } from "./intune";
import { JamfClient } from "./jamf";
import { KandjiClient } from "./kandji";

export function createMdmClient(provider: MdmProviderCredentials): MdmClient {
  switch (provider.providerType) {
    case "MICROSOFT_INTUNE":
      if (!provider.tenantId || !provider.clientId || !provider.clientSecret) {
        throw new Error("Intune requires tenantId, clientId, and clientSecret");
      }
      return new IntuneClient(provider.tenantId, provider.clientId, provider.clientSecret);

    case "JAMF_PRO":
      if (!provider.instanceUrl) {
        throw new Error("Jamf requires instanceUrl");
      }
      if (!provider.apiToken && (!provider.clientId || !provider.clientSecret)) {
        throw new Error("Jamf requires apiToken or clientId/clientSecret");
      }
      return new JamfClient(provider.instanceUrl, {
        clientId: provider.clientId,
        clientSecret: provider.clientSecret,
        apiToken: provider.apiToken,
      });

    case "KANDJI":
      if (!provider.instanceUrl || !provider.apiToken) {
        throw new Error("Kandji requires instanceUrl and apiToken");
      }
      return new KandjiClient(provider.instanceUrl, provider.apiToken);

    default:
      throw new Error(`Unsupported MDM provider: ${provider.providerType}`);
  }
}
