import "dotenv/config";
import { defineConfig } from "prisma/config";

// Build URL with proper encoding
const password = encodeURIComponent(process.env["DB_PASSWORD"] || "");
const projectRef = "nlquwuzwnbztbupitico";
const directUrl = `postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres`;

// Set DATABASE_URL so schema.prisma env() can find it
process.env.DATABASE_URL = directUrl;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: directUrl,
  },
});
