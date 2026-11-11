import { Loader2, RefreshCw } from "lucide-react";
import type {
  AdminPriceOperation,
  AdminPriceVersion,
} from "@/api/req/settings/subscription-prices";
import { formatOfferDate, formatOfferMoney } from "../modules/offer-presentation";
import { priceOperationLabel } from "../modules/price-management";

export const PriceHistory = ({
  versions,
  operations,
  busy,
  onLink,
  onResume,
  versionsMore,
  operationsMore,
}: {
  versions: AdminPriceVersion[];
  operations: AdminPriceOperation[];
  busy: boolean;
  onLink: (version: AdminPriceVersion) => void;
  onResume: (operation: AdminPriceOperation) => void;
  versionsMore?: { busy: boolean; onClick: () => void };
  operationsMore?: { busy: boolean; onClick: () => void };
}) => (
  <section className="min-w-0 rounded-card border border-border/80 bg-surface/95 p-5 shadow-admin-soft md:p-6">
    <h2 className="text-xl font-bold text-foreground">Versões e operações de catálogo</h2>
    <p className="mt-2 text-sm leading-6 text-muted">
      Histórico do ambiente selecionado. Vincular outra versão pausa a oferta; nenhum valor anterior
      é editado ou arquivado.
    </p>
    <div className="mt-5 grid min-w-0 gap-6 xl:grid-cols-2">
      <div className="min-w-0">
        <h3 className="font-bold text-foreground">Preços registrados</h3>
        {!versions.length ? (
          <p className="mt-3 text-sm text-muted">Nenhuma versão registrada neste escopo.</p>
        ) : null}
        <ul className="mt-3 space-y-3">
          {versions.map((version) => (
            <li className="min-w-0 rounded-2xl border border-border p-4" key={version.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong className="text-lg text-foreground">
                  {formatOfferMoney(version.amount_cents)} / mês
                </strong>
                {version.is_current ? (
                  <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">
                    Versão vinculada
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-xs leading-5 text-muted">
                Registrada em {formatOfferDate(version.created_at)}
              </p>
              <button
                className="mt-3 min-h-11 w-full rounded-control border border-border px-3 text-sm font-semibold text-primary disabled:opacity-50 sm:w-auto"
                disabled={busy || version.is_current}
                onClick={() => onLink(version)}
                type="button"
              >
                {version.is_current ? "Já vinculada" : "Vincular e pausar"}
              </button>
            </li>
          ))}
        </ul>
        {versionsMore ? <MoreButton state={versionsMore} /> : null}
      </div>
      <div className="min-w-0">
        <h3 className="font-bold text-foreground">Solicitações de criação</h3>
        {!operations.length ? (
          <p className="mt-3 text-sm text-muted">Nenhuma operação registrada.</p>
        ) : null}
        <ul className="mt-3 space-y-3">
          {operations.map((operation) => (
            <li className="min-w-0 rounded-2xl border border-border p-4" key={operation.id}>
              <strong className="text-foreground">
                {formatOfferMoney(operation.amount_cents)} / mês
              </strong>
              <p className="mt-1 text-sm font-semibold text-muted">
                {priceOperationLabel(operation.status)}
              </p>
              <p className="mt-2 text-xs leading-5 text-muted">
                Atualizada em {formatOfferDate(operation.updated_at)}
              </p>
              {operation.can_resume ? (
                <button
                  className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-control border border-border px-3 text-sm font-semibold text-primary disabled:opacity-50 sm:w-auto"
                  disabled={busy}
                  onClick={() => onResume(operation)}
                  type="button"
                >
                  <RefreshCw aria-hidden className="h-4 w-4" />
                  Recuperar esta operação
                </button>
              ) : null}
              {operation.status === "manual_review" ? (
                <p className="mt-2 text-xs leading-5 text-warning">
                  Não crie outra solicitação para substituir esta sem concluir a revisão
                  operacional.
                </p>
              ) : null}
            </li>
          ))}
        </ul>
        {operationsMore ? <MoreButton state={operationsMore} /> : null}
      </div>
    </div>
  </section>
);
const MoreButton = ({ state }: { state: { busy: boolean; onClick: () => void } }) => (
  <button
    className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-control border border-border px-4 text-sm font-semibold text-foreground disabled:opacity-50"
    disabled={state.busy}
    onClick={state.onClick}
    type="button"
  >
    {state.busy ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}Carregar mais
  </button>
);
