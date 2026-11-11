"use client";

import type { FeeQuery } from "@/api/req/finance/fees";
import { InputController } from "@/components/controllers";
import { Form, useFormList } from "@/hooks/form";
import { type FeeFilterValues, feeFilterSchema } from "../modules/fee-policy";

export const FeeFilters = ({
  query,
  onApply,
  onClear,
}: {
  query: FeeQuery;
  onApply: (query: FeeQuery) => void;
  onClear: () => void;
}) => {
  const form = useFormList<FeeFilterValues>({
    fields: [],
    schema: feeFilterSchema,
    defaultValues: { from: query.from ?? "", to: query.to ?? "" },
  });
  return (
    <div className="border-b border-border p-4">
      <Form
        className="grid min-w-0 gap-x-3 sm:grid-cols-2 xl:grid-cols-3"
        form={form}
        onSubmit={({ from, to }) => onApply({ from: from || undefined, to: to || undefined })}
      >
        <InputController<FeeFilterValues>
          label="Recebimentos de · BRT"
          min="2000-01-01"
          max="2100-12-31"
          name="from"
          type="date"
        />
        <InputController<FeeFilterValues>
          label="Recebimentos até · BRT"
          min="2000-01-01"
          max="2100-12-31"
          name="to"
          type="date"
        />
        <div className="flex flex-col gap-2 pb-5 sm:flex-row sm:items-start sm:pt-7">
          <button
            className="min-h-12 flex-1 rounded-control bg-primary px-4 text-sm font-bold text-primary-foreground"
            type="submit"
          >
            Aplicar período
          </button>
          <button
            className="min-h-12 rounded-control border border-border px-4 text-sm font-bold text-muted"
            onClick={onClear}
            type="button"
          >
            Limpar
          </button>
        </div>
      </Form>
      <p className="text-xs leading-5 text-muted">
        O período considera a data do recebimento registrado no recibo. Ela é independente da
        ocorrência e da disponibilidade dos movimentos de saldo.
      </p>
    </div>
  );
};
