import { NextResponse } from "next/server";

// GET /scim/ServiceProviderConfig — SCIM 2.0 service provider metadata
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
        description: "Authentication using a bearer token issued via MyDex SCIM settings.",
      },
    ],
  });
}
