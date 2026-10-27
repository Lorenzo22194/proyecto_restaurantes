import { defaultLocalDataDir, startLocalPostgres } from "./local-postgres";

const adminUrl = new URL(process.env.DATABASE_ADMIN_URL ?? "");
const port = Number(process.env.LOCAL_PG_PORT ?? adminUrl.port ?? 54329);
const dataDir = defaultLocalDataDir();

const pg = await startLocalPostgres({
  dataDir,
  port,
  password: decodeURIComponent(adminUrl.password),
  persistent: true,
  database: adminUrl.pathname.slice(1),
  log: process.argv.includes("--verbose"),
});

console.log(`PostgreSQL local listo en el puerto ${port} (datos en ${dataDir}). Ctrl+C para detenerlo.`);

let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  await pg.stop();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
// Mantiene el proceso vivo mientras Postgres está en marcha.
setInterval(() => {}, 1 << 30);
