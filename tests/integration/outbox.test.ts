import { afterAll, describe, expect, it } from "vitest";
import { drainOutbox } from "@/composition/outbox";
import { applyForRestaurant, inviteMember, reviewApplication } from "@/modules/restaurants";
import { readDevMailbox } from "@/shared/mail/mailer";
import { processOutbox } from "@/shared/outbox/outbox";
import { admin, closeTestPools, createUser, queryAs } from "../support/db";
import { validApplication } from "../support/fixtures";

afterAll(closeTestPools);

describe("cola de eventos (outbox)", () => {
  it("la invitación y la aprobación se notifican por correo al procesar la cola", async () => {
    const platformAdmin = await createUser("admin-outbox", ["admin"]);
    const owner = await createUser("dueno-outbox");
    const { restaurantId } = await applyForRestaurant(owner, validApplication);
    await reviewApplication(platformAdmin, { restaurantId, decision: "approve" });
    const invitee = await createUser("invitado-outbox");
    await inviteMember(owner, { restaurantId, email: invitee.email, role: "cashier" });

    await drainOutbox(50);

    const mailbox = readDevMailbox();
    expect(mailbox.find((m) => m.to === owner.email)?.subject).toMatch(/fue aprobado/);
    expect(mailbox.find((m) => m.to === invitee.email)?.subject).toMatch(/Te invitaron/);
  });

  it("un fallo del manejador reprograma el evento sin perderlo", async () => {
    const user = await createUser("encola-fallo");
    const marker = crypto.randomUUID();
    await queryAs(user.userId, "insert into outbox_events (event_type, payload) values ('test.fails', $1)", [{ marker }]);

    await processOutbox({ "test.fails": async () => { throw new Error("proveedor caído"); } }, 50);

    const { rows } = await admin().query<{ status: string; attempts: number; last_error: string; delayed: boolean }>(
      `select status, attempts, last_error, next_attempt_at > now() as delayed
       from outbox_events where payload->>'marker' = $1`,
      [marker],
    );
    expect(rows[0]).toEqual({ status: "pending", attempts: 1, last_error: "proveedor caído", delayed: true });
  });
});
