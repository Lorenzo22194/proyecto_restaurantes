import path from "node:path";
import { defineConfig } from "vitest/config";

const TEST_PG_PORT = 54339;

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      // `server-only` falla fuera del bundler de Next; en pruebas es un módulo vacío.
      "server-only": path.resolve(import.meta.dirname, "tests/support/empty-module.ts"),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["src/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          environment: "node",
          globalSetup: ["tests/support/global-setup.ts"],
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 120_000,
          env: {
            NODE_ENV: "test",
            TEST_PG_PORT: String(TEST_PG_PORT),
            DATABASE_URL: `postgres://app_user:app_user_test@localhost:${TEST_PG_PORT}/sobremesa_test`,
            DATABASE_ADMIN_URL: `postgres://postgres:postgres_test@localhost:${TEST_PG_PORT}/sobremesa_test`,
            BETTER_AUTH_URL: "http://localhost:3000",
            BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret-0123",
            AUDIT_IP_PEPPER: "test-pepper-0123456789",
            DEV_MAILBOX: "1",
          },
        },
      },
    ],
  },
});
