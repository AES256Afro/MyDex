import { NextResponse } from "next/server";

// SCIM 2.0 ServiceProviderConfig — discovery endpoint
// Required by Slack and Teams for SCIM provisioning setup
export async function GET() {
  return NextResponse.json({
    schemas: ["urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig"],
    documentationUri: "https://mydexnow.com/docs/scim",
    patch: { supported: true },
    bulk: { supported: false, maxOperations: 0, maxPayloadSize: 0 },
    filter: { supported: true, maxResults: 200 },
    changePassword: { supported: false },
    sort: { supported: false },
    etag: { supported: false },
    authenticationSchemes: [
      {
        type: "oauthbearertoken",
        name: "OAuth Bearer Token",
        description: "Authentication using a Bearer token from MyDex settings",
        specUri: "https://www.rfc-editor.org/info/rfc6750",
        primary: true,
      },
    ],
    meta: {
      resourceType: "ServiceProviderConfig",
      location: "/api/v1/scim/ServiceProviderConfig",
    },
  });
}
