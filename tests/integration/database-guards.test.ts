import { afterAll, describe, expect, it } from "vitest";
import { closeTestPools, createUser, queryAs, withAdminClient } from "../support/db";

afterAll(closeTestPools);

describe("rol de aplicación", () => {
  it("app_user no es superusuario, no salta RLS y no es dueño de las tablas", async () => {
    const result = await queryAs<{ rolsuper: boolean; rolbypassrls: boolean; owns: string }>(
      null,
      `select r.rolsuper, r.rolbypassrls,
              (select count(*)::text from pg_tables t where t.schemaname = 'public' and t.tableowner = current_user) as owns
       from pg_roles r where r.rolname = current_user`,
    );
    expect(result.rows[0]).toEqual({ rolsuper: false, rolbypassrls: false, owns: "0" });
  });

  it("todas las tablas de dominio tienen RLS activado", async () => {
    const { rows } = await withAdminClient((c) =>
      c.query<{ relname: string }>(
        `select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
         where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
         order by c.relname`,
      ),
    );
    // Excepción documentada: tablas internas de Better Auth y el registro de migraciones.
    expect(rows.map((r) => r.relname)).toEqual(["accounts", "rate_limits", "sessions", "users", "verifications"]);
  });
});

describe("auditoría de solo inserción", () => {
  it("app_user no puede modificar ni borrar eventos", async () => {
    const actor = await createUser("auditor", ["admin"]);
    await queryAs(
      actor.userId,
      "insert into audit_events (actor_user_id, actor_role, action, entity_type, entity_id) values ($1, 'user', 'test.event', 'test', '1')",
      [actor.userId],
    );
    await expect(queryAs(actor.userId, "update audit_events set action = 'x'")).rejects.toThrow(/permission denied/);
    await expect(queryAs(actor.userId, "delete from audit_events")).rejects.toThrow(/permission denied/);
  });

  it("ni siquiera el propietario de la tabla puede alterar o truncar la auditoría", async () => {
    await withAdminClient(async (c) => {
      await expect(c.query("update audit_events set action = 'x'")).rejects.toThrow(/solo inserción/);
      await expect(c.query("delete from audit_events")).rejects.toThrow(/solo inserción/);
      await expect(c.query("truncate audit_events")).rejects.toThrow(/solo inserción/);
    });
  });

  it("no se puede registrar un evento a nombre de otra persona", async () => {
    const [a, b] = [await createUser("actor-a"), await createUser("actor-b")];
    await expect(
      queryAs(
        a.userId,
        "insert into audit_events (actor_user_id, actor_role, action, entity_type, entity_id) values ($1, 'user', 'x', 'x', '1')",
        [b.userId],
      ),
    ).rejects.toThrow(/row-level security/);
  });
});

describe("cola de eventos", () => {
  it("cualquiera encola, pero solo el proceso interno lee los eventos", async () => {
    const user = await createUser("encolador");
    await queryAs(user.userId, "insert into outbox_events (event_type, payload) values ('test.event', '{}')");
    expect((await queryAs(user.userId, "select id from outbox_events")).rowCount).toBe(0);
    await expect(
      queryAs(user.userId, "insert into outbox_events (event_type, payload, status) values ('test.event', '{}', 'done')"),
    ).rejects.toThrow(/row-level security/);
  });
});
