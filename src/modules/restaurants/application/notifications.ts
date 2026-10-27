import "server-only";
import { z } from "zod";
import { BRAND } from "@/shared/config/brand";
import { serverEnv } from "@/shared/config/env";
import { sendMail } from "@/shared/mail/mailer";
import type { OutboxHandlers } from "@/shared/outbox/outbox";
import { ROLE_LABELS } from "../domain/rules";

const memberInvited = z.object({
  email: z.email(),
  role: z.enum(["owner", "manager", "cashier"]),
  restaurantName: z.string(),
});

const restaurantReviewed = z.object({
  restaurantName: z.string(),
  ownerEmail: z.email().nullable(),
  status: z.enum(["approved", "rejected"]),
  note: z.string().nullable(),
});

/** Manejadores de la cola de eventos del módulo Restaurants (notificaciones por correo). */
export const restaurantOutboxHandlers: OutboxHandlers = {
  async "member.invited"(payload) {
    const data = memberInvited.parse(payload);
    const url = `${serverEnv().BETTER_AUTH_URL}/cuenta`;
    await sendMail({
      to: data.email,
      subject: `Te invitaron al equipo de ${data.restaurantName} en ${BRAND.name}`,
      text: `Te invitaron como ${ROLE_LABELS[data.role].toLowerCase()} de ${data.restaurantName}. Entra con este mismo correo en ${url} para aceptar la invitación.`,
    });
  },

  async "restaurant.reviewed"(payload) {
    const data = restaurantReviewed.parse(payload);
    if (!data.ownerEmail) return;
    const approved = data.status === "approved";
    await sendMail({
      to: data.ownerEmail,
      subject: approved
        ? `${data.restaurantName} fue aprobado en ${BRAND.name}`
        : `Revisamos la solicitud de ${data.restaurantName}`,
      text: approved
        ? `Tu restaurante ya está aprobado. Puedes entrar al panel en ${serverEnv().BETTER_AUTH_URL}/panel.`
        : `Tu solicitud no fue aprobada. Motivo: ${data.note ?? "sin detalle"}.`,
    });
  },
};
