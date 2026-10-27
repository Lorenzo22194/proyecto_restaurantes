import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isDevMailboxEnabled } from "@/shared/config/env";
import { readDevMailbox } from "@/shared/mail/mailer";
import { Alert, Card, EmptyState } from "@/shared/ui/surface";

export const metadata: Metadata = { title: "Buzón de desarrollo", robots: { index: false } };

// Solo existe con DEV_MAILBOX=1, que el arranque rechaza en producción.
export default async function DevMailboxPage() {
  if (!isDevMailboxEnabled()) notFound();
  const mails = readDevMailbox();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-8">
      <h1 className="font-display text-3xl font-semibold text-wine">Buzón de desarrollo</h1>
      <Alert tone="warning" title="Solo desarrollo">
        Los correos no se envían: se guardan en memoria del servidor (máximo 50). Recarga para ver los nuevos.
      </Alert>
      {mails.length === 0 ? (
        <EmptyState title="No hay correos" />
      ) : (
        mails.map((mail) => (
          <Card key={mail.id} className="flex flex-col gap-1">
            <p className="text-xs text-coffee-muted">
              {mail.sentAt} · para <strong className="break-all">{mail.to}</strong>
            </p>
            <p className="font-semibold">{mail.subject}</p>
            <p className="text-sm whitespace-pre-wrap">{mail.text}</p>
          </Card>
        ))
      )}
    </main>
  );
}
