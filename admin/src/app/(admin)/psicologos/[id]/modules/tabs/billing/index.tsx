"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Gift, Loader2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { FormProvider, type SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  useAdminPsychologistBilling,
  useAdminPsychologistGrantCourtesy,
} from "@/api/callers/psychologists";
import { resolveApiError } from "@/api/handle";
import type { AdminPsychologistBilling, AdminPsychologistDetail } from "@/api/req/psychologists";
import { InputController, SelectController, TextareaController } from "@/components/controllers";
import { useAdminDialogLifecycle } from "@/hooks/use-admin-dialog-lifecycle";
import { CardShell, ErrorState, IconCircle } from "../../components/shared";
import {
  COURTESY_GRANT_CONFIRMATION,
  createCrpRegionSelectOptions,
  DATE_INPUT_MAX_FOUR_DIGIT_YEAR,
  resolveCrpRegionFieldValue,
} from "../../support/config";
import { formatDateOnly } from "../../support/date-period";
import {
  formatCpfInput,
  formatCrpRegion,
  formatInputDate,
  limitDateInputToFourDigitYear,
  normalizeCpfInput,
} from "../../support/formatters";
import type { CourtesyConfirmationFormValues, CourtesyFormValues } from "../../support/schemas";
import { courtesyConfirmationSchema, courtesyDetailsSchema } from "../../support/schemas";
import { FieldRow } from "../general/index";
import {
  ActiveCourtesyCard,
  BillingLoadingState,
  CurrentPlanCard,
  isCurrentCourtesyPlan,
  isCurrentFreePlan,
  PaymentHistoryCard,
  PaymentMethodCard,
} from "./cards";

const CourtesyGrantForm = ({ billing, id }: { billing: AdminPsychologistBilling; id: string }) => {
  const mutation = useAdminPsychologistGrantCourtesy(id);
  const [pendingCourtesyValues, setPendingCourtesyValues] = useState<CourtesyFormValues | null>(
    null,
  );
  const form = useForm<CourtesyFormValues>({
    defaultValues: {
      cpf: formatCpfInput(billing.courtesy.cpf),
      crp: billing.courtesy.registration_number || billing.courtesy.crp || "",
      crp_registration_date: formatInputDate(billing.courtesy.crp_registration_date),
      notes: "",
      period_days: String(billing.courtesy.period_options[1]?.days ?? 90),
      regional_crp: resolveCrpRegionFieldValue(billing.courtesy.regional_crp),
    },
    mode: "onSubmit",
    resolver: zodResolver(courtesyDetailsSchema),
  });
  const confirmationForm = useForm<CourtesyConfirmationFormValues>({
    defaultValues: {
      confirmation: "",
    },
    mode: "onSubmit",
    resolver: zodResolver(courtesyConfirmationSchema),
  });
  const disabled = !billing.courtesy.can_grant || mutation.isPending;
  const regionalOptions = useMemo(
    () => createCrpRegionSelectOptions(billing.courtesy.regional_crp),
    [billing.courtesy.regional_crp],
  );

  useEffect(() => {
    form.reset({
      cpf: formatCpfInput(billing.courtesy.cpf),
      crp: billing.courtesy.registration_number || billing.courtesy.crp || "",
      crp_registration_date: formatInputDate(billing.courtesy.crp_registration_date),
      notes: "",
      period_days: String(billing.courtesy.period_options[1]?.days ?? 90),
      regional_crp: resolveCrpRegionFieldValue(billing.courtesy.regional_crp),
    });
    confirmationForm.reset({ confirmation: "" });
  }, [billing.courtesy, confirmationForm, form]);

  const onSubmit: SubmitHandler<CourtesyFormValues> = async (values) => {
    confirmationForm.reset({ confirmation: "" });
    setPendingCourtesyValues(values);
  };

  const onConfirmSubmit: SubmitHandler<CourtesyConfirmationFormValues> = async (values) => {
    if (!pendingCourtesyValues) return;

    try {
      await mutation.mutateAsync({
        confirmation: values.confirmation.trim().toUpperCase(),
        cpf: normalizeCpfInput(pendingCourtesyValues.cpf),
        crp: pendingCourtesyValues.crp.trim(),
        crp_registration_date: pendingCourtesyValues.crp_registration_date.trim(),
        notes: pendingCourtesyValues.notes.trim(),
        period_days: Number(pendingCourtesyValues.period_days),
        regional_crp: pendingCourtesyValues.regional_crp.trim(),
      });
      confirmationForm.reset({ confirmation: "" });
      setPendingCourtesyValues(null);
      toast.success("Cortesia concedida com sucesso.");
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };
  const closeConfirmationModal = () => {
    if (mutation.isPending) return;

    confirmationForm.reset({ confirmation: "" });
    setPendingCourtesyValues(null);
  };
  const dialogRef = useAdminDialogLifecycle(closeConfirmationModal, {
    closeEnabled: !mutation.isPending,
    enabled: Boolean(pendingCourtesyValues),
  });
  const pendingPeriodLabel = pendingCourtesyValues
    ? (billing.courtesy.period_options.find(
        (option) => String(option.days) === pendingCourtesyValues.period_days,
      )?.label ?? `${pendingCourtesyValues.period_days} dias`)
    : null;

  return (
    <>
      <CardShell className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">Conceder cortesia</h2>
          </div>
          <IconCircle icon={Gift} />
        </div>

        {billing.courtesy.blocked_reason ? (
          <div className="mt-5 rounded-2xl border border-warning-border bg-warning-soft p-4 text-sm font-bold text-warning">
            {billing.courtesy.blocked_reason}
          </div>
        ) : null}

        <FormProvider {...form}>
          <form className="mt-5 space-y-4" noValidate onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-4 sm:grid-cols-3">
              <SelectController<CourtesyFormValues>
                disabled={disabled}
                label="Regional CRP"
                name="regional_crp"
                options={regionalOptions}
                required
              />
              <InputController<CourtesyFormValues>
                autoComplete="off"
                disabled={disabled}
                label="CRP"
                name="crp"
                placeholder="Numero do registro"
                required
              />
              <InputController<CourtesyFormValues>
                disabled={disabled}
                label="Data inscrição CRP"
                maskValue={limitDateInputToFourDigitYear}
                max={DATE_INPUT_MAX_FOUR_DIGIT_YEAR}
                name="crp_registration_date"
                required
                type="date"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <InputController<CourtesyFormValues>
                autoComplete="off"
                disabled={disabled}
                inputMode="numeric"
                label="CPF"
                maskValue={formatCpfInput}
                maxLength={14}
                name="cpf"
                placeholder="000.000.000-00"
                required
              />
              <SelectController<CourtesyFormValues>
                disabled={disabled}
                insetChevron
                label="Período de cortesia"
                name="period_days"
                options={billing.courtesy.period_options.map((option) => ({
                  label: option.label,
                  value: String(option.days),
                }))}
                required
              />
            </div>
            <TextareaController<CourtesyFormValues>
              disabled={disabled}
              label="Notas internas"
              name="notes"
              placeholder="Observações internas para auditoria"
              required
              rows={3}
            />

            <button
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-control border border-primary bg-surface px-4 text-sm font-black text-primary transition hover:bg-primary-soft disabled:cursor-not-allowed disabled:border-border disabled:text-muted"
              disabled={disabled}
              type="submit"
            >
              {mutation.isPending ? (
                <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
              ) : (
                <Gift aria-hidden className="h-4 w-4" />
              )}
              Conceder cortesia
            </button>
          </form>
        </FormProvider>
      </CardShell>

      {pendingCourtesyValues ? (
        <div
          aria-labelledby="courtesy-confirmation-title"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 sm:items-center sm:p-4"
          ref={dialogRef}
          role="dialog"
          tabIndex={-1}
        >
          <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-[28px] border border-border bg-surface p-5 shadow-admin-soft sm:max-w-2xl sm:rounded-[28px]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">
                  Confirmação forte
                </p>
                <h3
                  className="mt-1 text-xl font-bold text-foreground"
                  id="courtesy-confirmation-title"
                >
                  Conceder cortesia
                </h3>
              </div>
              <button
                aria-label="Fechar"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
                disabled={mutation.isPending}
                onClick={closeConfirmationModal}
                type="button"
              >
                <X aria-hidden className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-warning-border bg-warning-soft p-4 text-sm font-bold leading-6 text-warning">
              Confira os dados de CRP inseridos. A cortesia cria acesso profissional gratuito e fica
              registrada para auditoria.
            </div>

            <dl className="mt-5 divide-y divide-border rounded-2xl border border-border bg-surface-muted px-4 text-sm">
              <FieldRow
                label="Regional CRP"
                value={formatCrpRegion(pendingCourtesyValues.regional_crp)}
              />
              <FieldRow label="CRP" value={pendingCourtesyValues.crp} />
              <FieldRow
                label="Data inscrição CRP"
                value={formatDateOnly(pendingCourtesyValues.crp_registration_date)}
              />
              <FieldRow label="CPF" value={formatCpfInput(pendingCourtesyValues.cpf)} />
              <FieldRow label="Período de cortesia" value={pendingPeriodLabel} />
            </dl>

            <FormProvider {...confirmationForm}>
              <form
                className="mt-5 space-y-4"
                noValidate
                onSubmit={confirmationForm.handleSubmit(onConfirmSubmit)}
              >
                <InputController<CourtesyConfirmationFormValues>
                  autoComplete="off"
                  disabled={mutation.isPending}
                  label={`Digite ${COURTESY_GRANT_CONFIRMATION} para confirmar`}
                  name="confirmation"
                  placeholder={COURTESY_GRANT_CONFIRMATION}
                  required
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    className="inline-flex h-12 items-center justify-center rounded-control border border-border bg-surface px-4 text-sm font-black text-foreground transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={mutation.isPending}
                    onClick={closeConfirmationModal}
                    type="button"
                  >
                    Cancelar
                  </button>
                  <button
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-control bg-primary px-4 text-sm font-black text-primary-foreground transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted"
                    disabled={mutation.isPending}
                    type="submit"
                  >
                    {mutation.isPending ? (
                      <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
                    ) : (
                      <Gift aria-hidden className="h-4 w-4" />
                    )}
                    Confirmar concessão
                  </button>
                </div>
              </form>
            </FormProvider>
          </div>
        </div>
      ) : null}
    </>
  );
};

const isCurrentProfessionalPlan = (billing: AdminPsychologistBilling) => {
  const planSlug = billing.plan.plan_slug?.trim().toLowerCase();
  const planName = billing.plan.plan_name?.trim().toLowerCase();

  return Boolean(
    billing.plan.id &&
      !billing.plan.is_courtesy &&
      !billing.courtesy.can_revoke &&
      (billing.plan.is_paid || planSlug === "profissional" || planName === "plano profissional"),
  );
};

const CourtesyActionCard = ({ billing, id }: { billing: AdminPsychologistBilling; id: string }) =>
  billing.plan.is_courtesy ||
  billing.courtesy.can_revoke ||
  isCurrentProfessionalPlan(billing) ? null : (
    <CourtesyGrantForm billing={billing} id={id} />
  );

export const PlanBillingTab = ({ detail, id }: { detail: AdminPsychologistDetail; id: string }) => {
  const query = useAdminPsychologistBilling(id);
  const errorMessage = query.error ? resolveApiError(query.error) : null;

  if (query.isLoading) return <BillingLoadingState />;

  if (query.isError && errorMessage) {
    return <ErrorState message={errorMessage} onRetry={() => void query.refetch()} />;
  }

  if (!query.data) return null;

  const showActiveCourtesy = isCurrentCourtesyPlan(query.data);
  const showCourtesyBesidePlan = showActiveCourtesy || isCurrentFreePlan(query.data);

  return (
    <div className="space-y-5" data-psychologist-detail-tab="plano">
      <div className="grid gap-5 xl:grid-cols-2">
        <CurrentPlanCard billing={query.data} detail={detail} />
        {showActiveCourtesy ? (
          <ActiveCourtesyCard billing={query.data} id={id} />
        ) : showCourtesyBesidePlan ? (
          <CourtesyActionCard billing={query.data} id={id} />
        ) : (
          <PaymentMethodCard billing={query.data} />
        )}
        {!showCourtesyBesidePlan ? <CourtesyActionCard billing={query.data} id={id} /> : null}
        <PaymentHistoryCard billing={query.data} />
      </div>
    </div>
  );
};
