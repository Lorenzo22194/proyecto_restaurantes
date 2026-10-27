import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: ["./src/modules/*/infrastructure/schema.ts", "./src/shared/*/schema.ts"],
  out: "./db/migrations",
  dbCredentials: { url: process.env.DATABASE_ADMIN_URL ?? "" },
  strict: true,
  verbose: true,
});
