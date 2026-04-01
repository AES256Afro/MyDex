import { NextResponse } from "next/server";

// GET /scim/ResourceTypes — SCIM 2.0 resource type metadata
export async function GET() {
  return NextResponse.json({
    schemas: ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
    totalResults: 1,
    Resources: [
      {
        schemas: ["urn:ietf:params:scim:schemas:core:2.0:ResourceType"],
        id: "User",
        name: "User",
        endpoint: "/api/v1/scim/Users",
        description: "User Account",
        schema: "urn:ietf:params:scim:schemas:core:2.0:User",
        schemaExtensions: [
          {
            schema: "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User",
            required: false,
          },
        ],
        meta: { resourceType: "ResourceType", location: "/api/v1/scim/ResourceTypes/User" },
      },
    ],
  });
}
