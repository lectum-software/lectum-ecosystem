"use client";

import { XCircle } from "lucide-react";
import { useState } from "react";
import { getSafeApiErrorMessage } from "@/api/errors";
import type { ProfessionalSubscription } from "@/api/generator/types/billing";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Button } from "@/registry/new-york-v4/ui/button";
import { hasSubscriptionBenefits } from "@/utils/subscription-period";

export const CancelSubscriptionAction = ({
  benefits,
  scheduled,
  pending,
  error,
  onConfirm,
}: {
  benefits: ProfessionalSubscription;
  scheduled: boolean;
  pending: boolean;
  error: unknown;
  onConfirm: () => void;
}) => {
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <div className="flex justify-center py-2">
        <button
          className="inline-flex min-h-10 items-center gap-1.5 text-xs font-bold text-muted/75 transition hover:text-danger"
          onClick={() => setOpen(true)}
          type="button"
        >
          <XCircle className="h-4 w-4" aria-hidden="true" />
          {scheduled ? "Cancelar cobrança após cortesia" : "Cancelar assinatura"}
        </button>
      </div>
    );
  const end = benefits.current_period_end;
  const paidBenefits = !scheduled && hasSubscriptionBenefits(benefits) && end;
  return (
    <div className="grid gap-3 rounded-[var(--lectum-card-radius)] border border-border bg-surface px-5 py-4 shadow-[var(--lectum-shadow-soft)]">
      <div>
        <p className="text-sm font-extrabold text-foreground">
          {scheduled ? "Cancelar a cobrança futura?" : "Cancelar assinatura agora?"}
        </p>
        <p className="mt-1 text-xs leading-5 text-muted">
          {scheduled
            ? "A cobrança após a cortesia será cancelada. Sua cortesia atual será mantida."
            : paidBenefits
              ? `A renovação será cancelada. Os benefícios permanecem até ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date(end))}.`
              : "Novas cobranças desta assinatura serão interrompidas. Isso não realiza estorno de pagamentos anteriores."}
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Button disabled={pending} onClick={() => setOpen(false)} type="button" variant="outline">
          Manter
        </Button>
        <Button disabled={pending} onClick={onConfirm} type="button" variant="destructive">
          {pending ? "Cancelando..." : "Confirmar cancelamento"}
        </Button>
      </div>
      {error ? (
        <InlineAlert title="Não foi possível cancelar" variant="error">
          {getSafeApiErrorMessage(
            error,
            "Confira o status da assinatura antes de tentar novamente.",
          )}
        </InlineAlert>
      ) : null}
    </div>
  );
};
