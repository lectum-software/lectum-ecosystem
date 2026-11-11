import type { AdminSubscriptionPlanSetting } from "@/api/req/settings";
import { cn } from "@/lib/utils";
import {
  formatOfferCadence,
  formatOfferDate,
  formatOfferMoney,
} from "../modules/offer-presentation";

export const PlanDefinitionCard = ({ plan }: { plan: AdminSubscriptionPlanSetting }) => (
  <section
    aria-labelledby="plan-definition-title"
    className="min-w-0 rounded-card border border-border/80 bg-surface/95 p-5 shadow-admin-soft backdrop-blur md:p-6"
  >
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
          Cadastro do plano · legado
        </p>
        <h2
          className="mt-2 break-words text-xl font-bold text-foreground"
          id="plan-definition-title"
        >
          {plan.name}
        </h2>
      </div>
      <span
        className={cn(
          "w-fit rounded-full border px-3 py-1 text-xs font-bold",
          plan.active
            ? "border-success/15 bg-success/10 text-success"
            : "border-warning/20 bg-warning/10 text-warning",
        )}
      >
        {plan.active ? "Cadastro ativo" : "Cadastro inativo"}
      </span>
    </div>
    <p className="mt-3 text-sm font-medium leading-6 text-muted">
      A situação deste cadastro é separada da oferta para novas adesões. O valor de referência não
      substitui o preço versionado Stripe nem o valor contratado de cada assinante.
    </p>
    <dl className="mt-5 grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <div className="min-w-0 rounded-2xl border border-border bg-surface-muted/60 p-4">
        <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
          Valor de referência
        </dt>
        <dd className="mt-1 break-words text-base font-bold text-foreground">
          {formatOfferMoney(plan.price_cents, plan.currency) ?? "Não informado"}{" "}
          <span className="text-sm text-muted">{formatOfferCadence(plan.interval) ?? ""}</span>
        </dd>
      </div>
      <div className="min-w-0 rounded-2xl border border-border bg-surface-muted/60 p-4">
        <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
          Cadastro atualizado em
        </dt>
        <dd className="mt-1 text-sm font-bold text-foreground">
          {formatOfferDate(plan.updated_at)}
        </dd>
      </div>
      <div className="min-w-0 rounded-2xl border border-border bg-surface-muted/60 p-4">
        <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
          Vínculo legado Mercado Pago
        </dt>
        <dd className="mt-1 text-sm font-bold text-foreground">
          {plan.gateway_plan_configured ? "Cadastrado" : "Não cadastrado"}
        </dd>
      </div>
    </dl>
  </section>
);
