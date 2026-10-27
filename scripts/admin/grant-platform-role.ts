// Arranque de la plataforma: otorga un rol de plataforma a una cuenta existente.
// Uso: pnpm admin:grant-role persona@correo.com admin
// Se ejecuta con la conexión de administración y deja un evento de auditoría con actor "system".
import { Client } from "pg";

const PLATFORM_ROLES = ["admin", "support", "moderator", "finance"];
const [emailArg, role = "admin"] = process.argv.slice(2);

if (!emailArg || !PLATFORM_ROLES.includes(role)) {
  console.error(`Uso: pnpm admin:grant-role <correo> <${PLATFORM_ROLES.join("|")}>`);
  process.exit(1);
}

const email = emailArg.trim().toLowerCase();
const client = new Client({ connectionString: process.env.DATABASE_ADMIN_URL });
await client.connect();
try {
  await client.query("begin");
  const user = await client.query<{ id: string }>("select id from users where email = $1 and status = 'active'", [email]);
  if (user.rowCount === 0) {
    throw new Error(`No existe una cuenta activa con ${email}. La persona debe entrar una vez con su correo.`);
  }
  const userId = user.rows[0].id;
  const inserted = await client.query(
    "insert into platform_roles (user_id, role) values ($1, $2) on conflict do nothing",
    [userId, role],
  );
  if (inserted.rowCount === 0) {
    console.log(`${email} ya tenía el rol ${role}.`);
  } else {
    await client.query(
      `insert into audit_events (actor_user_id, actor_role, action, entity_type, entity_id, after, reason)
       values (null, 'system', 'platform_role.granted', 'user', $1, $2, 'Asignación por script de arranque')`,
      [userId, JSON.stringify({ role })],
    );
    console.log(`Rol ${role} otorgado a ${email}.`);
  }
  await client.query("commit");
} catch (error) {
  await client.query("rollback");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await client.end();
}
