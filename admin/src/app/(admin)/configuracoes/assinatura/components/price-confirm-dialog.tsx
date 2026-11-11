"use client";

import { Loader2, X } from "lucide-react";
import type { AdminPriceVersion } from "@/api/req/settings/subscription-prices";
import { InputController } from "@/components/controllers";
import { Form, useFormList } from "@/hooks/form";
import { useAdminDialogLifecycle } from "@/hooks/use-admin-dialog-lifecycle";
import { formatOfferMoney } from "../modules/offer-presentation";
import { type PublishFormValues, publishFormSchema } from "../modules/price-management";

export type PriceConfirmation =
  | { kind: "link"; version: AdminPriceVersion; revision: number }
  | { kind: "publish"; amountCents: number; revision: number };

export const PriceConfirmDialog = ({
  state,
  busy,
  onClose,
  onConfirm,
}: {
  state: PriceConfirmation;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) => {
  const dialog = useAdminDialogLifecycle(onClose, { closeEnabled: !busy });
  const form = useFormList<PublishFormValues>({
    defaultValues: { confirmation: "" },
    fields: [{ field: "input", name: "confirmation", label: "Confirmação" }],
    schema: publishFormSchema,
  });
  const linking = state.kind === "link";
  const amount = linking ? state.version.amount_cents : state.amountCents;
  return (
    <div
      aria-labelledby="price-confirm-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-overlay p-3 sm:items-center"
      ref={dialog}
      role="dialog"
      tabIndex={-1}
    >
      <section className="w-full max-w-lg rounded-card border border-border bg-surface p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-bold text-foreground" id="price-confirm-title">
            {linking ? "Vincular versão e pausar" : "Publicar novas adesões"}
          </h2>
          <button
            aria-label="Fechar confirmação"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-control border border-border"
            disabled={busy}
            onClick={onClose}
            type="button"
          >
            <X aria-hidden className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-4 text-2xl font-bold text-foreground">
          {formatOfferMoney(amount)} <span className="text-sm text-muted">/ mês</span>
        </p>
        <p className="mt-3 text-sm leading-6 text-muted">
          {linking
            ? "Esta versão será vinculada e as novas adesões ficarão pausadas. Publicar será uma ação separada."
            : "Esta ação libera novas adesões ao preço vinculado, se todas as verificações operacionais forem aprovadas."}{" "}
          Contratos, renovações e reservas existentes mantêm o preço já fixado. Nenhuma cobrança é
          feita por esta ação.
        </p>
        <p className="mt-3 rounded-2xl border border-warning/20 bg-warning/10 p-3 text-sm leading-6 text-warning">
          Confirmação sobre a revisão {state.revision}. Se a oferta mudou, recarregue e revise
          novamente.
        </p>
        {linking ? (
          <button
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-control bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50"
            disabled={busy}
            onClick={() => void onConfirm()}
            type="button"
          >
            {busy ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}Vincular e
            manter pausada
          </button>
        ) : (
          <Form className="mt-5 space-y-3" form={form} onSubmit={onConfirm}>
            <p className="text-sm text-muted">
              Digite <strong>PUBLICAR</strong> para confirmar.
            </p>
            <InputController<PublishFormValues>
              autoComplete="off"
              disabled={busy}
              label="Confirmação"
              name="confirmation"
              required
            />
            <button
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-control bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50"
              disabled={busy}
              type="submit"
            >
              {busy ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}Publicar novas
              adesões
            </button>
          </Form>
        )}
      </section>
    </div>
  );
};
