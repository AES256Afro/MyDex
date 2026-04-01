import { NextResponse } from "next/server";

// GET /scim/Schemas — SCIM 2.0 schema metadata
export async function GET() {
  return NextResponse.json({
    schemas: ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
    totalResults: 1,
    Resources: [
      {
        schemas: ["urn:ietf:params:scim:schemas:core:2.0:Schema"],
        id: "urn:ietf:params:scim:schemas:core:2.0:User",
        name: "User",
        description: "User Account",
        attributes: [
          { name: "userName", type: "string", multiValued: false, required: true, mutability: "readWrite", returned: "default", uniqueness: "server" },
          { name: "name", type: "complex", multiValued: false, required: false, mutability: "readWrite", returned: "default", subAttributes: [
            { name: "givenName", type: "string", multiValued: false, required: false, mutability: "readWrite", returned: "default" },
            { name: "familyName", type: "string", multiValued: false, required: false, mutability: "readWrite", returned: "default" },
            { name: "formatted", type: "string", multiValued: false, required: false, mutability: "readOnly", returned: "default" },
          ]},
          { name: "displayName", type: "string", multiValued: false, required: false, mutability: "readWrite", returned: "default" },
          { name: "emails", type: "complex", multiValued: true, required: false, mutability: "readWrite", returned: "default", subAttributes: [
            { name: "value", type: "string", multiValued: false, required: false, mutability: "readWrite", returned: "default" },
            { name: "primary", type: "boolean", multiValued: false, required: false, mutability: "readWrite", returned: "default" },
            { name: "type", type: "string", multiValued: false, required: false, mutability: "readWrite", returned: "default" },
          ]},
          { name: "active", type: "boolean", multiValued: false, required: false, mutability: "readWrite", returned: "default" },
          { name: "title", type: "string", multiValued: false, required: false, mutability: "readWrite", returned: "default" },
        ],
        meta: { resourceType: "Schema", location: "/api/v1/scim/Schemas/urn:ietf:params:scim:schemas:core:2.0:User" },
      },
    ],
  });
}
