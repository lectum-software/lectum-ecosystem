"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Loader2, ShieldCheck, X } from "lucide-react";
import { type ReactNode, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { FormProvider, type SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  useAdminPsychologistApproveRegistryVerification,
  useAdminPsychologistRejectRegistryVerification,
  useAdminPsychologistUpdateRegistryIdentity,
} from "@/api/callers/psychologists";
import { resolveApiError } from "@/api/handle";
import type {
  AdminPsychologistRegistryVerification,
  AdminPsychologistRegistryVerificationAttempt,
} from "@/api/req/psychologists";
import { InputController, SelectController, TextareaController } from "@/components/controllers";
import { cn } from "@/lib/utils";
import { Badge } from "../../components/shared";
import {
  createCrpRegionSelectOptions,
  DATE_INPUT_MAX_FOUR_DIGIT_YEAR,
  REGISTRY_VERIFICATION_TONE,
  resolveCrpRegionFieldValue,
} from "../../support/config";
import { formatDateOnly } from "../../support/date-period";
import {
  formatCpfInput,
  formatCrpRegion,
  formatDateTime,
  formatInputDate,
  formatNullable,
  limitDateInputToFourDigitYear,
  normalizeCpfInput,
} from "../../support/formatters";
import type {
  RegistryApproveFormValues,
  RegistryIdentityFormValues,
  RegistryRejectFormValues,
  RegistrySaveFormValues,
} from "../../support/schemas";
import {
  registryApproveSchema,
  registryIdentitySchema,
  registryRejectSchema,
  registrySaveSchema,
} from "../../support/schemas";

export const registryVerificationBadge = (registry: AdminPsychologistRegistryVerification) => (
  <Badge
    className={REGISTRY_VERIFICATION_TONE[registry.summary.status] ?? "bg-surface-muted text-muted"}
  >
    {registry.summary.approval_label}
  </Badge>
);

export const RegistryAttemptItem = ({
  attempt,
}: {
  attempt: AdminPsychologistRegistryVerificationAttempt;
}) => (
  <li className="rounded-2xl border border-border bg-surface-muted/50 p-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <p className="text-sm font-black text-foreground">{attempt.result_label}</p>
        <p className="text-xs font-bold text-muted">
          {attempt.source_label} · {formatDateTime(attempt.checked_at)}
        </p>
      </div>
      <Badge
        className={attempt.found ? "bg-success-soft text-success" : "bg-surface-muted text-muted"}
      >
        {attempt.found ? "Ativo" : "Inativo"}
      </Badge>
    </div>
    <div className="mt-3 grid gap-2 text-xs font-bold text-muted sm:grid-cols-2">
      <span>
        CRP:{" "}
        {[attempt.regional_crp, attempt.registration_number].filter(Boolean).join(" / ") ||
          "Não informado"}
      </span>
    </div>
    {attempt.responsible_admin ? (
      <p className="mt-2 text-xs font-bold text-muted">
        Responsável:{" "}
        {[attempt.responsible_admin.name, attempt.responsible_admin.email]
          .filter(Boolean)
          .join(" · ") || "Admin Lectum"}
      </p>
    ) : null}
    {attempt.notes || attempt.reason ? (
      <p className="mt-2 rounded-xl bg-surface px-3 py-2 text-xs font-bold leading-5 text-muted">
        {attempt.notes || attempt.reason}
      </p>
    ) : null}
  </li>
);

export const RegistryVerificationDialog = ({
  children,
  onClose,
  title,
}: {
  children: ReactNode;
  onClose: () => void;
  title: string;
}) => {
  const dialog = (
    <div
      aria-modal="true"
      className="admin-premium-pilot fixed inset-0 z-50 flex items-end justify-center bg-overlay p-0 backdrop-blur-[2px] sm:items-center sm:p-5"
      role="dialog"
    >
      <div className="w-full rounded-t-[32px] border border-border bg-surface p-5 shadow-admin sm:max-w-[54rem] sm:rounded-[32px] sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">
              Verificação profissional
            </p>
            <h3 className="mt-1 text-2xl font-bold text-foreground">{title}</h3>
          </div>
          <button
            aria-label="Fechar"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-muted shadow-control transition hover:bg-surface-muted"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );

  return typeof document === "undefined" ? null : createPortal(dialog, document.body);
};

export const RegistryIdentityForm = ({
  canApprove,
  canReject,
  onApprove,
  onReject,
  onSave,
  registry,
}: {
  canApprove: boolean;
  canReject: boolean;
  onApprove: (values: RegistryIdentityFormValues) => void;
  onReject: () => void;
  onSave: (values: RegistryIdentityFormValues) => void;
  registry: AdminPsychologistRegistryVerification;
}) => {
  const form = useForm<RegistryIdentityFormValues>({
    defaultValues: {
      crp: registry.identity.registration_number || "",
      crp_registration_date: formatInputDate(registry.identity.crp_registration_date),
      regional_crp: resolveCrpRegionFieldValue(registry.identity.regional_crp),
    },
    mode: "onSubmit",
    resolver: zodResolver(registryIdentitySchema),
  });
  const regionalOptions = useMemo(
    () => createCrpRegionSelectOptions(registry.identity.regional_crp),
    [registry.identity.regional_crp],
  );

  useEffect(() => {
    form.reset({
      crp: registry.identity.registration_number || "",
      crp_registration_date: formatInputDate(registry.identity.crp_registration_date),
      regional_crp: resolveCrpRegionFieldValue(registry.identity.regional_crp),
    });
  }, [form, registry.identity]);

  const actionButtonCount = 1 + Number(canApprove) + Number(canReject);
  const actionGridClassName = cn(
    "grid gap-3",
    actionButtonCount === 2 ? "sm:grid-cols-2" : "",
    actionButtonCount >= 3 ? "sm:grid-cols-2 xl:grid-cols-3" : "",
  );

  const normalizeValues = (values: RegistryIdentityFormValues): RegistryIdentityFormValues => ({
    crp: values.crp.trim(),
    crp_registration_date: values.crp_registration_date.trim(),
    regional_crp: values.regional_crp.trim(),
  });

  const onSubmit: SubmitHandler<RegistryIdentityFormValues> = (values) => {
    const normalizedValues = normalizeValues(values);
    onSave(normalizedValues);
  };

  const onApproveSubmit: SubmitHandler<RegistryIdentityFormValues> = (values) => {
    const normalizedValues = normalizeValues(values);
    onApprove({
      crp: normalizedValues.crp,
      crp_registration_date: normalizedValues.crp_registration_date,
      regional_crp: normalizedValues.regional_crp,
    });
  };

  return (
    <FormProvider {...form}>
      <form className="space-y-4" noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectController<RegistryIdentityFormValues>
            label="Regional CRP"
            name="regional_crp"
            options={regionalOptions}
            required
          />
          <InputController<RegistryIdentityFormValues>
            autoComplete="off"
            label="Nº CRP"
            name="crp"
            placeholder="Número do registro"
            required
          />
          <div className="sm:col-span-2">
            <InputController<RegistryIdentityFormValues>
              label="Data de inscrição no CRP"
              maskValue={limitDateInputToFourDigitYear}
              max={DATE_INPUT_MAX_FOUR_DIGIT_YEAR}
              name="crp_registration_date"
              required
              type="date"
            />
          </div>
        </div>
        <div className={actionGridClassName}>
          <button
            className="inline-flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-control border border-primary bg-surface px-4 text-sm font-black text-primary transition hover:bg-primary-soft disabled:cursor-not-allowed disabled:border-border disabled:text-muted"
            disabled={!form.formState.isDirty}
            type="submit"
          >
            Salvar
          </button>
          {canApprove ? (
            <button
              className="inline-flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-control bg-primary px-4 text-sm font-black text-primary-foreground transition hover:bg-primary-hover"
              onClick={form.handleSubmit(onApproveSubmit)}
              type="button"
            >
              <ShieldCheck aria-hidden className="h-4 w-4" />
              Aprovar
            </button>
          ) : null}
          {canReject ? (
            <button
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-control border border-danger bg-surface px-4 text-sm font-black text-danger transition hover:bg-danger-soft"
              onClick={onReject}
              type="button"
            >
              <AlertTriangle aria-hidden className="h-4 w-4" />
              Rejeitar
            </button>
          ) : null}
        </div>
      </form>
    </FormProvider>
  );
};

export const RegistrySaveIdentityForm = ({
  id,
  identityDraft,
  onClose,
  registry,
}: {
  id: string;
  identityDraft: RegistryIdentityFormValues;
  onClose: () => void;
  registry: AdminPsychologistRegistryVerification;
}) => {
  const mutation = useAdminPsychologistUpdateRegistryIdentity(id);
  const confirmationText = registry.actions.strong_save_confirmation;
  const form = useForm<RegistrySaveFormValues>({
    defaultValues: { confirmation: "" },
    mode: "onSubmit",
    resolver: zodResolver(registrySaveSchema),
  });

  useEffect(() => {
    form.reset({ confirmation: "" });
  }, [form]);

  const registrySummaryItems = [
    { label: "Regional CRP", value: formatCrpRegion(identityDraft.regional_crp) },
    { label: "Nº CRP", value: formatNullable(identityDraft.crp) },
    { label: "Data de inscrição", value: formatDateOnly(identityDraft.crp_registration_date) },
  ];

  const onSubmit: SubmitHandler<RegistrySaveFormValues> = async (values) => {
    try {
      await mutation.mutateAsync({
        ...identityDraft,
        confirmation: values.confirmation.trim(),
      });
      toast.success("Registro profissional atualizado.");
      onClose();
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  return (
    <FormProvider {...form}>
      <form className="grid gap-4" noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <div className="rounded-[28px] border border-primary/20 bg-primary-soft/70 p-4 text-sm font-bold leading-6 text-muted sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-primary">
                Registro editado
              </p>
              <p className="mt-1 text-base font-black text-foreground">
                Confirme antes de salvar a alteração do registro profissional.
              </p>
            </div>
            <span className="inline-flex w-fit items-center rounded-full border border-primary/15 bg-surface px-3 py-1 text-xs font-black text-primary shadow-control">
              Ação sensível
            </span>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {registrySummaryItems.map((item) => (
              <div
                className="rounded-[20px] border border-border/80 bg-surface p-4 shadow-control"
                key={item.label}
              >
                <p className="text-xs font-black uppercase tracking-[0.08em] text-muted">
                  {item.label}
                </p>
                <p className="mt-2 break-words text-base font-black text-foreground">
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-3">
            Esta ação altera os dados públicos do conselho sem aprovar, rejeitar ou revalidar
            automaticamente o CRP. Digite <strong>{confirmationText}</strong> para continuar.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px] sm:items-start">
          <InputController<RegistrySaveFormValues>
            autoComplete="off"
            disabled={mutation.isPending}
            label="Confirmação forte"
            name="confirmation"
            placeholder={`Digite ${confirmationText}`}
            required
          />
          <button
            className="inline-flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-control bg-primary px-4 text-sm font-black text-primary-foreground shadow-control transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted sm:mt-7"
            disabled={mutation.isPending}
            type="submit"
          >
            {mutation.isPending ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
            Salvar
          </button>
        </div>
      </form>
    </FormProvider>
  );
};

export const RegistryApproveForm = ({
  id,
  identityDraft,
  onClose,
  registry,
}: {
  id: string;
  identityDraft?: RegistryIdentityFormValues | null;
  onClose: () => void;
  registry: AdminPsychologistRegistryVerification;
}) => {
  const mutation = useAdminPsychologistApproveRegistryVerification(id);
  const identityDefaults = useMemo(
    () => ({
      crp: identityDraft?.crp ?? registry.identity.registration_number ?? "",
      crp_registration_date:
        identityDraft?.crp_registration_date ??
        formatInputDate(registry.identity.crp_registration_date),
      regional_crp: resolveCrpRegionFieldValue(
        identityDraft?.regional_crp ?? registry.identity.regional_crp,
      ),
    }),
    [
      identityDraft,
      registry.identity.crp_registration_date,
      registry.identity.regional_crp,
      registry.identity.registration_number,
    ],
  );
  const form = useForm<RegistryApproveFormValues>({
    defaultValues: {
      confirmation: "",
      cpf: formatCpfInput(registry.identity.cpf),
      crp: identityDefaults.crp,
      crp_registration_date: identityDefaults.crp_registration_date,
      regional_crp: identityDefaults.regional_crp,
      situation_confirmed: "",
    },
    mode: "onSubmit",
    resolver: zodResolver(registryApproveSchema),
  });

  useEffect(() => {
    form.reset({
      confirmation: "",
      cpf: formatCpfInput(registry.identity.cpf),
      crp: identityDefaults.crp,
      crp_registration_date: identityDefaults.crp_registration_date,
      regional_crp: identityDefaults.regional_crp,
      situation_confirmed: "",
    });
  }, [form, identityDefaults, registry.identity.cpf]);

  const onSubmit: SubmitHandler<RegistryApproveFormValues> = async (values) => {
    try {
      await mutation.mutateAsync({
        confirmation: values.confirmation.trim(),
        cpf: normalizeCpfInput(values.cpf),
        crp: values.crp.trim(),
        crp_registration_date: values.crp_registration_date.trim(),
        regional_crp: values.regional_crp.trim(),
        situation_confirmed: values.situation_confirmed === "sim",
      });
      toast.success("CRP aprovado manualmente.");
      onClose();
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  return (
    <FormProvider {...form}>
      <form className="space-y-4" noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid gap-4">
          <InputController<RegistryApproveFormValues>
            autoComplete="off"
            disabled={mutation.isPending}
            inputMode="numeric"
            label="CPF"
            maskValue={formatCpfInput}
            maxLength={14}
            name="cpf"
            placeholder="000.000.000-00"
            required
          />
        </div>
        <SelectController<RegistryApproveFormValues>
          disabled={mutation.isPending}
          label="Situação confirmada"
          name="situation_confirmed"
          options={[
            { label: "Selecione", value: "" },
            {
              label:
                "Sim, verifiquei manualmente a situação do registro no Conselho Federal de Psicologia",
              value: "sim",
            },
          ]}
          required
        />
        <InputController<RegistryApproveFormValues>
          autoComplete="off"
          disabled={mutation.isPending}
          label="Confirmação forte"
          name="confirmation"
          placeholder="Digite APROVAR CRP"
          required
        />
        <button
          className="inline-flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-control bg-primary px-4 text-sm font-black text-primary-foreground transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted"
          disabled={mutation.isPending}
          type="submit"
        >
          {mutation.isPending ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
          Aprovar
        </button>
      </form>
    </FormProvider>
  );
};

export const RegistryRejectForm = ({ id, onClose }: { id: string; onClose: () => void }) => {
  const mutation = useAdminPsychologistRejectRegistryVerification(id);
  const form = useForm<RegistryRejectFormValues>({
    defaultValues: {
      confirmation: "",
      reason: "",
    },
    mode: "onSubmit",
    resolver: zodResolver(registryRejectSchema),
  });

  const onSubmit: SubmitHandler<RegistryRejectFormValues> = async (values) => {
    try {
      await mutation.mutateAsync({
        confirmation: values.confirmation.trim(),
        reason: values.reason.trim(),
      });
      toast.success("Verificação rejeitada.");
      onClose();
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  return (
    <FormProvider {...form}>
      <form className="space-y-4" noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <TextareaController<RegistryRejectFormValues>
          disabled={mutation.isPending}
          label="Motivo da rejeição"
          name="reason"
          placeholder="Explique em PT-BR o motivo operacional da rejeição."
          required
          rows={5}
        />
        <InputController<RegistryRejectFormValues>
          autoComplete="off"
          disabled={mutation.isPending}
          label="Confirmação forte"
          name="confirmation"
          placeholder="Digite REJEITAR CRP"
          required
        />
        <button
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-control bg-danger px-4 text-sm font-black text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted"
          disabled={mutation.isPending}
          type="submit"
        >
          {mutation.isPending ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
          Rejeitar
        </button>
      </form>
    </FormProvider>
  );
};
