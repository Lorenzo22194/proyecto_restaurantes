import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { TestProject } from "vitest/node";
import { startLocalPostgres } from "../../scripts/db/local-postgres";
import { enableLocalAppRole, migrateDatabase } from "../../scripts/db/migrate-lib";

/** Levanta un PostgreSQL 17 desechable, aplica las migraciones reales y lo destruye al terminar. */
export default async function setup(project: TestProject) {
  const env = project.config.env as Record<string, string>;
  const adminUrl = new URL(env.DATABASE_ADMIN_URL);
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "sobremesa-test-pg-"));

  const pg = await startLocalPostgres({
    dataDir,
    port: Number(env.TEST_PG_PORT),
    password: decodeURIComponent(adminUrl.password),
    persistent: false,
    database: adminUrl.pathname.slice(1),
  });

  await migrateDatabase(env.DATABASE_ADMIN_URL);
  await enableLocalAppRole(env.DATABASE_ADMIN_URL, env.DATABASE_URL);

  return async () => {
    await pg.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  };
}
