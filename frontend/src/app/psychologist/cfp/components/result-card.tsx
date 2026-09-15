"use client";

import { CheckCircle2 } from "lucide-react";
import type { CfpResult } from "@/api/generator/types";
import { cn } from "@/lib/utils";
import { formatCfpRegistrationDate } from "../modules/support";

export const ResultField = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="rounded-[18px] border border-border bg-surface-muted px-4 py-4">
    <p className="text-xs font-bold uppercase tracking-wide text-subtle">{label}</p>
    <div className="mt-2 text-base font-semibold text-foreground">{value}</div>
  </div>
);

export const ResultCard = ({
  result,
  selected,
  disabled = false,
  onSelect,
}: {
  result: CfpResult;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) => (
  <button
    aria-pressed={selected}
    disabled={disabled}
    className={cn(
      "w-full rounded-[24px] border bg-surface p-5 text-left shadow-[var(--lectum-shadow-soft)] transition md:p-6",
      selected ? "border-primary ring-4 ring-primary/10" : "border-border hover:border-primary/40",
    )}
    onClick={onSelect}
    type="button"
  >
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-subtle">Nome encontrado</p>
        <h2 className="mt-2 text-2xl font-bold text-foreground">
          {result.nome || "Nome não informado"}
        </h2>
      </div>
      {selected ? (
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
          <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
        </span>
      ) : null}
    </div>

    <div className="mt-5 grid gap-3 md:grid-cols-2">
      <ResultField label="Regional" value={result.nome_regional || "Não informado"} />
      <ResultField label="Registro" value={result.registro || "Não informado"} />
      <ResultField
        label="Situação"
        value={
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold",
              result.active ? "bg-success/10 text-success" : "bg-warning/10 text-warning",
            )}
          >
            <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" />
            {result.situacao || "Não informada"}
          </span>
        }
      />
      <ResultField
        label="Data de inscrição"
        value={formatCfpRegistrationDate(result.data_inscricao)}
      />
    </div>

    <p className="mt-5 border-border border-t pt-5 text-sm leading-6 text-muted">
      Dados retornados pela verificação automática.
    </p>
  </button>
);
