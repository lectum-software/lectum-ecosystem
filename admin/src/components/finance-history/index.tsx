"use client";

import axios from "axios";
import { type ReactNode, useState } from "react";
import { useAdminFinancialHistory } from "@/api/callers/finance/history";
import type { FinancialHistoryQuery } from "@/api/req/finance/history";
import { FinancialHistoryContent } from "./content";

export const FinancialHistoryCard = ({
  input,
  onPageChange,
  onLimitChange,
  showPsychologist = false,
  children,
}: {
  input: FinancialHistoryQuery;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  showPsychologist?: boolean;
  children?: ReactNode;
}) => {
  const query = useAdminFinancialHistory(input);
  return (
    <section className="min-w-0 max-w-full overflow-hidden rounded-card border border-border/80 bg-surface shadow-admin-soft">
      <header className="space-y-2 border-b border-border p-5">
        <h2 className="text-xl font-bold text-foreground">Histórico financeiro</h2>
        <p className="text-xs leading-5 text-muted">
          Pagamentos e eventos dos contratos, inclusive encerrados. Consulta e download de
          documentos existentes, sem cobrança ou emissão de notas.
        </p>
      </header>
      {children}
      <FinancialHistoryContent
        data={query.data}
        loading={query.isFetching}
        failed={query.isError}
        limitReached={
          axios.isAxiosError(query.error) &&
          query.error.response?.status === 503 &&
          query.error.response?.data?.code === "finance_history_filter_required"
        }
        onRetry={() => void query.refetch()}
        onPageChange={onPageChange}
        onLimitChange={onLimitChange}
        showPsychologist={showPsychologist}
      />
    </section>
  );
};

export const PsychologistFinancialHistory = ({ userId }: { userId: string }) => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  return (
    <FinancialHistoryCard
      input={{ user_id: userId, page, limit }}
      onPageChange={setPage}
      onLimitChange={(value) => {
        setLimit(value);
        setPage(1);
      }}
    />
  );
};
