import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import EmbeddedPostgres from "embedded-postgres";

export type LocalPostgresOptions = {
  dataDir: string;
  port: number;
  password: string;
  persistent: boolean;
  database: string;
  log?: boolean;
};

/** Arranca un PostgreSQL 17 real (binarios embebidos vía npm) sin Docker. Solo para desarrollo y pruebas. */
export async function startLocalPostgres(options: LocalPostgresOptions) {
  const alreadyInitialised = fs.existsSync(path.join(options.dataDir, "PG_VERSION"));
  const pg = new EmbeddedPostgres({
    databaseDir: options.dataDir,
    port: options.port,
    user: "postgres",
    password: options.password,
    authMethod: "scram-sha-256",
    persistent: options.persistent,
    initdbFlags: ["--encoding=UTF8", "--locale=C"],
    onLog: options.log ? (message) => console.log(String(message).trimEnd()) : () => {},
    onError: (error) => console.error(error),
  });

  if (!alreadyInitialised) await pg.initialise();
  await pg.start();

  const client = pg.getPgClient();
  await client.connect();
  const existing = await client.query("select 1 from pg_database where datname = $1", [options.database]);
  await client.end();
  if (existing.rowCount === 0) await pg.createDatabase(options.database);

  return pg;
}

export function defaultLocalDataDir(): string {
  // Fuera de OneDrive: la sincronización bloquea archivos de Postgres y corrompe el clúster.
  return process.env.LOCAL_PG_DATA_DIR || path.join(os.homedir(), ".sobremesa", "pgdata");
}
