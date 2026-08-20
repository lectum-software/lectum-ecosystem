import { CreditCard } from "lucide-react";
import type { SubscriptionPlan } from "@/api/generator/types/billing";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const formatPrice = (priceCents: number) => currencyFormatter.format(priceCents / 100);

const formatDate = (value?: string | null) => {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : dateFormatter.format(date);
};

export const SummaryCard = ({
  isCourtesyRenewal,
  plan,
  renewalDate,
}: {
  isCourtesyRenewal: boolean;
  plan: SubscriptionPlan;
  renewalDate?: string | null;
}) => {
  const renewalDateLabel = formatDate(renewalDate);

  return (
    <aside className="rounded-[var(--lectum-card-radius)] border border-border bg-surface p-5 shadow-[var(--lectum-shadow-soft)] md:p-6">
      <div className="flex items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
          <CreditCard className="h-6 w-6" aria-hidden />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
            {isCourtesyRenewal ? "Cobrança futura" : "Plano Profissional"}
          </p>
          <h2 className="mt-1 text-xl font-bold text-foreground">
            {isCourtesyRenewal ? "Plano Profissional após cortesia" : plan.name}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            {isCourtesyRenewal
              ? "Cadastre o cartão agora para manter os benefícios profissionais quando a cortesia terminar."
              : "Assinatura mensal com perfil verificado, prioridade na busca, avaliações, analytics e destaque nas comunidades."}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-surface-muted p-4">
        <p className="text-sm font-semibold text-muted">
          {isCourtesyRenewal ? "Início previsto" : "Valor recorrente"}
        </p>
        {isCourtesyRenewal ? (
          <div className="mt-2 grid gap-2">
            <strong className="text-2xl font-bold leading-tight text-foreground">
              {renewalDateLabel ? `Após ${renewalDateLabel}` : "Ao fim da cortesia"}
            </strong>
            <span className="text-sm font-semibold text-muted">
              {formatPrice(plan.price_cents)} /mês quando a cobrança iniciar
            </span>
          </div>
        ) : (
          <div className="mt-2 flex items-end gap-2">
            <strong className="text-3xl font-bold leading-none text-foreground">
              {formatPrice(plan.price_cents)}
            </strong>
            <span className="pb-1 text-sm font-semibold text-muted">/mês</span>
          </div>
        )}
      </div>
    </aside>
  );
};
