"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAdminStripeFees, useObserveAdminStripeFee } from "@/api/callers/finance/fees";
import { resolveApiError } from "@/api/handle";
import type { AdminFeeItem, FeeQuery } from "@/api/req/finance/fees";
import { AdminPagination } from "@/components/admin-shell/pagination";
import { FeeFilters } from "./components/filters";
import { StripeFeeSummary } from "./components/summary";
import { StripeFeeTable } from "./components/table";
import { resolveFeeQuery } from "./modules/fee-policy";

export const AdminStripeFeesClient = () => {
  const pathname = usePathname();
  const router = useRouter();
  const search = useSearchParams().toString();
  const resolved = useMemo(() => resolveFeeQuery(new URLSearchParams(search)), [search]);
  const query = useAdminStripeFees(resolved.query, resolved.valid);
  const observation = useObserveAdminStripeFee();
  const [notice, setNotice] = useState<string | null>(null);
  const navigate = (input: FeeQuery) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(input))
      if (value !== undefined && value !== "") params.set(key, String(value));
    router.replace(params.size ? `${pathname}?${params}` : pathname, { scroll: false });
  };
  const observe = async (item: AdminFeeItem) => {
    if (observation.isPending || item.can_refresh !== true) return;
    try {
      // Exactly one bounded stage per explicit click. The local GET refresh never advances the observer.
      const result = await observation.mutateAsync(item.receipt_id);
      setNotice(
        result.state === "processing"
          ? "Outra observação deste recibo está em andamento. Atualize a consulta local antes de continuar."
          : result.has_more
            ? "Uma etapa foi registrada. Ainda há etapas pendentes; continue a observação pelo mesmo recibo quando desejar. Nenhuma cobrança foi efetuada."
            : result.state === "observed"
              ? "As etapas desta observação foram consultadas. A cobertura é pontual e limitada aos recibos locais, não aos custos completos da conta."
              : "A observação permanece parcial ou indisponível. Confira a cobertura do recibo antes de continuar; valores ausentes não foram tratados como zero.",
      );
    } catch (cause) {
      toast.error(resolveApiError(cause));
      setNotice(
        "Não foi possível confirmar esta etapa. Atualize a consulta local e revise a cobertura antes de continuar. A ação não cria cobranças, estornos ou notas fiscais.",
      );
    }
  };
  return (
    <div className="min-w-0 max-w-full space-y-6 overflow-x-clip">
      <header className="rounded-card border border-border bg-surface p-5 shadow-admin-soft md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Financeiro · custos observados separadamente
            </p>
            <h1 className="mt-2 text-3xl font-bold text-foreground">Tarifas Stripe observadas</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
              Consulte fatos já registrados e avance manualmente uma etapa de leitura por recibo.
              Esta tela não cobra, não estorna, não emite notas e não ativa vendas ou emissão
              fiscal.
            </p>
            {query.data ? (
              <p className="mt-3 text-xs font-bold text-primary">
                {query.data.mode === "test"
                  ? "Sandbox · dados de teste, sem valor real"
                  : query.data.mode === "live"
                    ? "Produção · observações existentes"
                    : "Ambiente não comprovado"}
              </p>
            ) : null}
          </div>
          <button
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-control border border-border px-4 text-sm font-bold text-primary disabled:opacity-50"
            disabled={!resolved.valid || query.isFetching || observation.isPending}
            onClick={() => void query.refetch()}
            type="button"
          >
            {query.isFetching ? (
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw aria-hidden className="h-4 w-4" />
            )}
            Atualizar consulta local
          </button>
        </div>
      </header>
      {notice ? (
        <p
          aria-live="polite"
          className="rounded-2xl border border-primary/20 bg-primary-soft p-4 text-sm leading-6 text-primary"
          role="status"
        >
          {notice}
        </p>
      ) : null}
      {resolved.valid && !query.isError && query.data ? (
        <StripeFeeSummary data={query.data} />
      ) : null}
      <section className="min-w-0 overflow-hidden rounded-card border border-border bg-surface shadow-admin-soft">
        <FeeFilters
          key={search}
          onApply={(filters) =>
            navigate({ ...filters, page: 1, limit: resolved.query.limit ?? 20 })
          }
          onClear={() => navigate({})}
          query={resolved.query}
        />
        {!resolved.valid ? (
          <p className="p-5 text-sm leading-6 text-danger" role="alert">
            Os filtros da URL são inválidos. Revise o período e a paginação ou use Limpar. Nenhuma
            consulta sem filtros foi apresentada.
          </p>
        ) : null}
        {resolved.valid && query.isLoading ? (
          <p className="flex items-center gap-2 p-5 text-sm text-muted">
            <Loader2 aria-hidden className="h-5 w-5 animate-spin" />
            Carregando observações locais...
          </p>
        ) : null}
        {resolved.valid && query.isError ? (
          <div className="space-y-3 p-5">
            <p className="text-sm text-danger" role="alert">
              {resolveApiError(query.error)}
            </p>
            <p className="text-xs leading-5 text-muted">
              Não foi possível confirmar os dados locais. Nenhuma leitura externa é executada ao
              tentar atualizar esta listagem.
            </p>
            <button
              className="min-h-11 rounded-control border border-border px-4 text-sm font-bold text-primary"
              onClick={() => void query.refetch()}
              type="button"
            >
              Tentar consulta local novamente
            </button>
          </div>
        ) : null}
        {resolved.valid && !query.isError && query.data ? (
          <>
            <StripeFeeTable
              activeReceipt={observation.variables}
              busy={observation.isPending}
              items={query.data.items}
              onObserve={(item) => void observe(item)}
            />
            <AdminPagination
              onChangePage={(page) => navigate({ ...resolved.query, page })}
              onLimit={(limit) => navigate({ ...resolved.query, page: 1, limit })}
              page={query.data.pagination.page}
              pages={Math.max(1, query.data.pagination.total_pages)}
              perPage={query.data.pagination.limit}
            />
          </>
        ) : null}
      </section>
    </div>
  );
};
