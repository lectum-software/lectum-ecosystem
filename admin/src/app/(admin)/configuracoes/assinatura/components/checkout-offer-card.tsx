import { Info } from "lucide-react";
import type { ReactNode } from "react";
import type { AdminSubscriptionCheckoutSetting } from "@/api/req/settings";
import { cn } from "@/lib/utils";
import { formatOfferDate, getOfferPresentation } from "../modules/offer-presentation";

const Detail = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="min-w-0 rounded-2xl border border-border bg-surface-muted/60 p-4">
    <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">{label}</dt>
    <dd className="mt-1 break-words text-sm font-bold leading-6 text-foreground">{children}</dd>
  </div>
);

export const CheckoutOfferCard = ({
  checkout,
}: {
  checkout?: AdminSubscriptionCheckoutSetting;
}) => {
  const view = getOfferPresentation(checkout);
  const stripe = checkout?.gateway === "stripe";
  const gateway = stripe
    ? "Stripe"
    : checkout?.gateway === "mercadopago"
      ? "Mercado Pago"
      : checkout?.gateway === "disabled"
        ? "Novas adesões desativadas"
        : "Não informado";
  const mode =
    checkout?.mode === "live"
      ? "Produção"
      : checkout?.mode === "test"
        ? "Teste · sem valor real"
        : "Não informado";

  return (
    <section
      aria-labelledby="checkout-offer-title"
      className="overflow-hidden rounded-card border border-border/80 bg-surface/95 shadow-admin-soft backdrop-blur"
    >
      <div className="grid min-w-0 xl:grid-cols-[minmax(0,1fr)_minmax(360px,480px)]">
        <div className="min-w-0 p-5 md:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <h2
              className="text-xl font-bold tracking-tight text-foreground md:text-2xl"
              id="checkout-offer-title"
            >
              Oferta para novas adesões
            </h2>
            <span
              className={cn(
                "w-fit rounded-full border px-3 py-1 text-xs font-bold",
                view.warning
                  ? "border-warning/20 bg-warning/10 text-warning"
                  : "border-success/15 bg-success/10 text-success",
              )}
            >
              {view.label}
            </span>
          </div>
          <p className="mt-3 text-sm font-medium leading-6 text-muted">{view.description}</p>
          <div className="mt-5 rounded-[1.5rem] border border-primary/15 bg-primary-soft p-4 md:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-primary">
              {stripe ? "Preço da versão vinculada" : "Preço da oferta informada"}
            </p>
            {view.price ? (
              <>
                <div className="mt-2 flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
                  <strong className="break-words text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                    {view.price}
                  </strong>
                  <span className="text-sm font-bold text-muted">{view.cadence}</span>
                </div>
                <p className="mt-3 text-sm font-medium leading-6 text-muted">
                  {stripe
                    ? "Fonte: preço versionado da oferta Stripe."
                    : "Fonte: cadastro do plano para Mercado Pago."}{" "}
                  {checkout?.status === "paused"
                    ? "Oferta pausada; valor não disponível para novas adesões."
                    : "Valor para novas adesões conforme a configuração local."}
                </p>
              </>
            ) : (
              <p className="mt-2 text-lg font-bold text-foreground">Preço da oferta indisponível</p>
            )}
          </div>
          <div className="mt-5 flex gap-3 rounded-2xl border border-border bg-surface-muted/60 p-4 text-sm font-medium leading-6 text-muted">
            <Info aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <p>
              Somente leitura. Não consulta a disponibilidade do provedor nem altera preço, vendas,
              cobranças ou contratos existentes.
            </p>
          </div>
        </div>
        {checkout ? (
          <aside className="min-w-0 border-t border-border bg-surface-muted/30 p-5 md:p-6 xl:border-l xl:border-t-0">
            <dl className="grid gap-3 sm:grid-cols-2">
              <Detail label="Gateway selecionado">{gateway}</Detail>
              <Detail label="Ambiente">{mode}</Detail>
              <Detail label="Situação da oferta">
                {checkout.gateway === "disabled"
                  ? "Novas adesões desativadas globalmente"
                  : checkout.offer
                    ? checkout.offer.checkout_enabled
                      ? "Habilitada no cadastro"
                      : "Pausada no cadastro"
                    : "Sem oferta vinculada"}
              </Detail>
              {checkout.offer ? (
                <Detail label="Revisão da oferta">{checkout.offer.revision}</Detail>
              ) : null}
              {checkout.offer ? (
                <Detail label="Oferta atualizada em">
                  {formatOfferDate(checkout.offer.updated_at)}
                </Detail>
              ) : null}
              {view.price && checkout.price ? (
                <Detail label="Preço registrado em">
                  {formatOfferDate(checkout.price.created_at)}
                </Detail>
              ) : null}
              {stripe ? (
                <>
                  <Detail label="Processamento de cobranças">
                    {checkout.collection_enabled
                      ? "Habilitado localmente"
                      : "Desabilitado localmente"}
                  </Detail>
                  <Detail label="Conciliação">
                    {checkout.reconciliation_enabled
                      ? "Habilitada localmente"
                      : "Desabilitada localmente"}
                  </Detail>
                </>
              ) : null}
              <Detail label="Disponibilidade do provedor">Não consultada</Detail>
            </dl>
          </aside>
        ) : null}
      </div>
    </section>
  );
};
