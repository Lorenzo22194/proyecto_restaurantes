import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { recordAudit } from "@/modules/audit-security";
import { TERMS_VERSION } from "@/shared/config/brand";
import { withActor } from "@/shared/db/client";
import type { RequestMeta } from "@/shared/http/request-meta";
import type { Actor } from "@/shared/kernel/actor";
import { consents, users } from "../infrastructure/schema";

export async function hasAcceptedCurrentTerms(actor: Actor): Promise<boolean> {
  return withActor(actor.userId, async (tx) => {
    const rows = await tx
      .select({ id: consents.id })
      .from(consents)
      .where(
        and(
          eq(consents.userId, actor.userId),
          eq(consents.type, "terms"),
          eq(consents.version, TERMS_VERSION),
          isNull(consents.revokedAt),
        ),
      )
      .limit(1);
    return rows.length > 0;
  });
}

export const acceptTermsInput = z.object({
  displayName: z.string().trim().min(2, "Escribe al menos 2 caracteres.").max(60, "Máximo 60 caracteres."),
  acceptTerms: z.boolean().refine((v) => v, "Debes aceptar los términos para continuar."),
  acceptAiNotice: z.boolean().refine((v) => v, "Debes leer y aceptar el aviso de uso de IA."),
});

/** Registra la aceptación de términos y del aviso de IA (con su versión) y fija el nombre visible. */
export async function acceptTerms(actor: Actor, input: z.input<typeof acceptTermsInput>, meta?: RequestMeta) {
  const data = acceptTermsInput.parse(input);
  await withActor(actor.userId, async (tx) => {
    await tx.update(users).set({ name: data.displayName, updatedAt: new Date() }).where(eq(users.id, actor.userId));
    await tx.insert(consents).values([
      { userId: actor.userId, type: "terms", version: TERMS_VERSION },
      { userId: actor.userId, type: "ai_notice", version: TERMS_VERSION },
    ]);
    await recordAudit(tx, {
      actorUserId: actor.userId,
      actorRole: "user",
      action: "user.terms_accepted",
      entityType: "user",
      entityId: actor.userId,
      after: { termsVersion: TERMS_VERSION, consents: ["terms", "ai_notice"] },
      meta,
    });
  });
}
