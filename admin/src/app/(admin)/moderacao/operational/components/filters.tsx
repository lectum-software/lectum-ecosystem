"use client";
import { Loader2 } from "lucide-react";
import { FormProvider, type UseFormReturn } from "react-hook-form";
import type { AdminModerationOperationalAlertsGroup } from "@/api/req/moderation";
import { InputController, SelectController } from "@/components/controllers";
import { cn } from "@/lib/utils";

import {
  compliancePlanOptions,
  complianceProfileStatusOptions,
  type DenunciaFiltersFormValues,
  denunciaContentTypeOptions,
  denunciaReasonOptions,
  denunciaReporterOptions,
  denunciaStatusOptions,
  numberFormatter,
  type OperationalCategoryFiltersFormValues,
  operationalCategoryTypeOptions,
  operationalUserRoleOptions,
} from "../modules/report-support";

export const DenunciaFiltersBar = ({
  disabled,
  form,
  isFetching,
  onDateBlur,
  resultCount,
}: {
  disabled: boolean;
  form: UseFormReturn<DenunciaFiltersFormValues>;
  isFetching: boolean;
  onDateBlur: () => void;
  resultCount: number;
}) => (
  <div className="border-b border-border bg-surface/80 p-4">
    <FormProvider {...form}>
      <form
        className="grid min-w-0 gap-3 md:grid-cols-2 2xl:grid-cols-[minmax(260px,1.25fr)_repeat(5,minmax(150px,1fr))]"
        noValidate
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="md:col-span-2 2xl:col-span-1">
          <SelectController<DenunciaFiltersFormValues>
            disabled={disabled}
            label="Tipo"
            name="contentType"
            options={denunciaContentTypeOptions}
          />
          <p className="-mt-1 flex min-h-5 flex-wrap items-center gap-x-2 gap-y-1 text-xs font-bold text-muted">
            <span>{numberFormatter.format(resultCount)} registro(s) encontrado(s)</span>
            {isFetching ? (
              <span className="inline-flex items-center gap-1">
                <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
                Atualizando
              </span>
            ) : null}
          </p>
        </div>
        <InputController<DenunciaFiltersFormValues>
          disabled={disabled}
          label="De"
          name="from"
          onBlur={onDateBlur}
          type="date"
        />
        <InputController<DenunciaFiltersFormValues>
          disabled={disabled}
          label="Até"
          name="to"
          onBlur={onDateBlur}
          type="date"
        />
        <SelectController<DenunciaFiltersFormValues>
          disabled={disabled}
          label="Motivo"
          name="reason"
          options={denunciaReasonOptions}
        />
        <SelectController<DenunciaFiltersFormValues>
          disabled={disabled}
          label="Status"
          name="status"
          options={denunciaStatusOptions}
        />
        <SelectController<DenunciaFiltersFormValues>
          disabled={disabled}
          label="Denunciante"
          name="reporter"
          options={denunciaReporterOptions}
        />
      </form>
    </FormProvider>
  </div>
);

export const OperationalCategoryFiltersBar = ({
  disabled,
  form,
  group,
  isFetching,
  onDateBlur,
  resultCount,
}: {
  disabled: boolean;
  form: UseFormReturn<OperationalCategoryFiltersFormValues>;
  group: Exclude<AdminModerationOperationalAlertsGroup, "all" | "denuncias">;
  isFetching: boolean;
  onDateBlur: () => void;
  resultCount: number;
}) => {
  const isCompliance = group === "compliance";

  return (
    <div className="border-b border-border bg-surface/80 p-4">
      <FormProvider {...form}>
        <form
          className={cn(
            "grid min-w-0 gap-3 md:grid-cols-2",
            isCompliance
              ? "2xl:grid-cols-[minmax(220px,1fr)_minmax(150px,0.7fr)_minmax(150px,0.7fr)_minmax(190px,0.85fr)_minmax(190px,0.85fr)]"
              : "2xl:grid-cols-[minmax(260px,1.15fr)_minmax(190px,0.85fr)_minmax(150px,0.75fr)_minmax(150px,0.75fr)]",
          )}
          noValidate
          onSubmit={(event) => event.preventDefault()}
        >
          <div className="md:col-span-2 2xl:col-span-1">
            <SelectController<OperationalCategoryFiltersFormValues>
              disabled={disabled}
              label="Tipo"
              name="alertType"
              options={operationalCategoryTypeOptions[group]}
            />
            <p className="-mt-1 flex min-h-5 flex-wrap items-center gap-x-2 gap-y-1 text-xs font-bold text-muted">
              <span>{numberFormatter.format(resultCount)} registro(s) encontrado(s)</span>
              {isFetching ? (
                <span className="inline-flex items-center gap-1">
                  <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
                  Atualizando
                </span>
              ) : null}
            </p>
          </div>
          {!isCompliance ? (
            <SelectController<OperationalCategoryFiltersFormValues>
              disabled={disabled}
              label="Usuário"
              name="userRole"
              options={operationalUserRoleOptions}
            />
          ) : null}
          <InputController<OperationalCategoryFiltersFormValues>
            disabled={disabled}
            label="De"
            name="from"
            onBlur={onDateBlur}
            type="date"
          />
          <InputController<OperationalCategoryFiltersFormValues>
            disabled={disabled}
            label="Até"
            name="to"
            onBlur={onDateBlur}
            type="date"
          />
          {isCompliance ? (
            <>
              <SelectController<OperationalCategoryFiltersFormValues>
                disabled={disabled}
                label="Plano"
                name="plan"
                options={compliancePlanOptions}
              />
              <SelectController<OperationalCategoryFiltersFormValues>
                disabled={disabled}
                label="Status de perfil"
                name="profileStatus"
                options={complianceProfileStatusOptions}
              />
            </>
          ) : null}
        </form>
      </FormProvider>
    </div>
  );
};
