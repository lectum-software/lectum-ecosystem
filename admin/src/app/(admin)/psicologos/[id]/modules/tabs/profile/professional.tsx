"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { FormProvider, type SubmitHandler, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { useAdminPsychologistUpdateProfessionalData } from "@/api/callers/psychologists";
import { useAdminSettingsCatalogs } from "@/api/callers/settings";
import { resolveApiError } from "@/api/handle";
import type { AdminPsychologistDetail } from "@/api/req/psychologists";
import { SelectController, TextareaController } from "@/components/controllers";
import { cn } from "@/lib/utils";
import { Badge, ErrorState } from "../../components/shared";
import {
  EMPTY_SELECT_OPTION,
  getStaticOptionLabel,
  MODALITY_OPTIONS,
  mergeCurrentOption,
  PROFILE_STATUS_COPY,
} from "../../support/config";
import { formatDate } from "../../support/date-period";
import { emptyToNull, formatNullable, listText } from "../../support/formatters";
import type { ProfileProfessionalDataFormValues } from "../../support/schemas";
import { profileProfessionalDataSchema } from "../../support/schemas";
import { FieldRow } from "../general/index";
import { ProfileFormActions } from "./personal";

const activeOrSelected = <T extends { active: boolean; id?: string; name: string; slug: string }>(
  item: T,
  selectedValues: string[],
  value: string,
) => item.active || selectedValues.includes(value);

type AdminProfessionalOption = {
  label: string;
  value: string;
};

type AdminProfessionalOptionGroup = {
  options: AdminProfessionalOption[];
  title: string;
};

const toggleSelectedValue = (values: string[], value: string) =>
  values.includes(value) ? values.filter((item) => item !== value) : [...values, value];

const AdminProfessionalTagField = ({
  disabled = false,
  error,
  groups,
  label,
  onChange,
  options,
  placeholder,
  selected,
}: {
  disabled?: boolean;
  error?: string;
  groups?: AdminProfessionalOptionGroup[];
  label: string;
  onChange: (values: string[]) => void;
  options: AdminProfessionalOption[];
  placeholder: string;
  selected: string[];
}) => {
  const [open, setOpen] = useState(false);
  const optionMap = useMemo(
    () => new Map(options.map((option) => [option.value, option] as const)),
    [options],
  );
  const selectedOptions = selected.map((value) => optionMap.get(value) ?? { label: value, value });
  const renderGroups =
    groups?.filter((group) => group.options.length > 0) ??
    (options.length > 0 ? [{ options, title: "Opções" }] : []);
  const hasError = Boolean(error);

  return (
    <div className="w-full">
      <span className="mb-2 block text-sm font-black text-foreground">{label}</span>
      <div
        className={cn(
          "rounded-3xl border bg-surface p-3 shadow-sm transition",
          hasError ? "border-danger" : "border-border",
          disabled
            ? "opacity-60"
            : "focus-within:border-primary focus-within:ring-2 focus-within:ring-primary-soft",
        )}
      >
        <div className="flex min-h-12 flex-wrap items-center gap-2">
          {selectedOptions.length > 0 ? (
            selectedOptions.map((option) => (
              <span
                className="inline-flex items-center gap-2 rounded-full border border-primary bg-primary-soft px-3 py-2 text-xs font-black text-primary"
                key={option.value}
              >
                {option.label}
                <button
                  aria-label={`Remover ${option.label}`}
                  className="rounded-full p-0.5 text-primary transition hover:bg-surface"
                  disabled={disabled}
                  onClick={(event) => {
                    event.stopPropagation();
                    onChange(selected.filter((value) => value !== option.value));
                  }}
                  type="button"
                >
                  <X aria-hidden className="h-3.5 w-3.5" />
                </button>
              </span>
            ))
          ) : (
            <span className="text-sm font-bold text-subtle">{placeholder}</span>
          )}
          <button
            aria-expanded={open}
            className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-full text-muted transition hover:bg-surface-muted"
            disabled={disabled}
            onClick={() => setOpen((current) => !current)}
            type="button"
          >
            <ChevronDown
              aria-hidden
              className={cn("h-4 w-4 transition-transform", open ? "rotate-180" : "")}
            />
          </button>
        </div>
        {open && !disabled ? (
          <div className="mt-3 max-h-72 overflow-y-auto rounded-2xl border border-border bg-surface-muted p-2">
            {renderGroups.length > 0 ? (
              renderGroups.map((group) => (
                <div className="py-1" key={group.title}>
                  {group.title ? (
                    <p className="px-2 py-2 text-xs font-black uppercase tracking-wide text-subtle">
                      {group.title}
                    </p>
                  ) : null}
                  <div className="grid gap-1">
                    {group.options.map((option) => {
                      const isSelected = selected.includes(option.value);

                      return (
                        <button
                          className={cn(
                            "flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left text-sm font-bold transition",
                            isSelected
                              ? "bg-primary-soft text-primary"
                              : "text-foreground hover:bg-surface",
                          )}
                          key={option.value}
                          onClick={() => onChange(toggleSelectedValue(selected, option.value))}
                          type="button"
                        >
                          <span>{option.label}</span>
                          {isSelected ? (
                            <span className="text-xs font-black">Selecionado</span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <p className="px-3 py-4 text-sm font-bold text-muted">
                Nenhuma opção ativa disponível no catálogo.
              </p>
            )}
          </div>
        ) : null}
      </div>
      <span
        className={cn(
          "mt-1 block min-h-5 text-xs font-bold",
          hasError ? "text-danger" : "text-transparent",
        )}
      >
        {error || " "}
      </span>
    </div>
  );
};

const AdminProfessionalChipPicker = ({
  disabled = false,
  error,
  label,
  onChange,
  options,
  selected,
}: {
  disabled?: boolean;
  error?: string;
  label: string;
  onChange: (values: string[]) => void;
  options: AdminProfessionalOption[];
  selected: string[];
}) => {
  const hasError = Boolean(error);

  return (
    <fieldset className="w-full">
      <legend className="mb-2 text-sm font-black text-foreground">{label}</legend>
      <div
        className={cn(
          "flex flex-wrap gap-2 rounded-3xl border bg-surface p-3 shadow-sm",
          hasError ? "border-danger" : "border-border",
          disabled ? "opacity-60" : "",
        )}
      >
        {options.length > 0 ? (
          options.map((option) => {
            const isSelected = selected.includes(option.value);

            return (
              <button
                aria-pressed={isSelected}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-black transition",
                  isSelected
                    ? "border-primary bg-primary-soft text-primary ring-1 ring-primary"
                    : "border-border bg-surface text-foreground hover:border-primary hover:text-primary",
                )}
                disabled={disabled}
                key={option.value}
                onClick={() => onChange(toggleSelectedValue(selected, option.value))}
                type="button"
              >
                {option.label}
              </button>
            );
          })
        ) : (
          <p className="px-1 py-2 text-sm font-bold text-muted">
            Nenhuma opção ativa disponível no catálogo.
          </p>
        )}
      </div>
      <span
        className={cn(
          "mt-1 block min-h-5 text-xs font-bold",
          hasError ? "text-danger" : "text-transparent",
        )}
      >
        {error || " "}
      </span>
    </fieldset>
  );
};

export const ProfileProfessionalEditForm = ({
  detail,
  id,
  onCancel,
}: {
  detail: AdminPsychologistDetail;
  id: string;
  onCancel: () => void;
}) => {
  const professional = detail.profile.professional;
  const mutation = useAdminPsychologistUpdateProfessionalData(id);
  const catalogsQuery = useAdminSettingsCatalogs();
  const form = useForm<ProfileProfessionalDataFormValues>({
    defaultValues: {
      approach_ids: professional.approaches.map((item) => item.id),
      language: professional.languages[0] || "",
      modality: professional.modality || "",
      reason: "",
      service_ids: professional.services.map((item) => item.id),
      specialty_ids: professional.specialties.map((item) => item.id),
      target_audience: professional.target_audience,
    },
    mode: "onSubmit",
    resolver: zodResolver(profileProfessionalDataSchema),
  });
  const disabled = mutation.isPending || catalogsQuery.isLoading;
  const catalogs = catalogsQuery.data;

  useEffect(() => {
    form.reset({
      approach_ids: professional.approaches.map((item) => item.id),
      language: professional.languages[0] || "",
      modality: professional.modality || "",
      reason: "",
      service_ids: professional.services.map((item) => item.id),
      specialty_ids: professional.specialties.map((item) => item.id),
      target_audience: professional.target_audience,
    });
  }, [form, professional]);

  const selected = useWatch({ control: form.control });
  const specialtyGroups = useMemo(() => {
    const selectedIds = selected.specialty_ids ?? [];

    return (catalogs?.specialty_categories ?? [])
      .map((category) => ({
        options: category.specialties
          .filter((item) => activeOrSelected(item, selectedIds, item.id))
          .map((item) => ({ label: item.name, value: item.id })),
        title: category.name,
      }))
      .filter((group) => group.options.length > 0);
  }, [catalogs?.specialty_categories, selected.specialty_ids]);
  const specialtyOptions = useMemo(
    () => specialtyGroups.flatMap((group) => group.options),
    [specialtyGroups],
  );
  const approachOptions = useMemo(() => {
    const selectedIds = selected.approach_ids ?? [];

    return (catalogs?.approaches ?? [])
      .filter((item) => activeOrSelected(item, selectedIds, item.id))
      .map((item) => ({ label: item.name, value: item.id }));
  }, [catalogs?.approaches, selected.approach_ids]);
  const serviceOptions = useMemo(() => {
    const selectedIds = selected.service_ids ?? [];

    return (catalogs?.services ?? [])
      .filter((item) => activeOrSelected(item, selectedIds, item.id))
      .map((item) => ({ label: item.name, value: item.id }));
  }, [catalogs?.services, selected.service_ids]);
  const languageOptions = useMemo(() => {
    const selectedValues = selected.language ? [selected.language] : [];

    return (catalogs?.languages ?? [])
      .filter((item) => activeOrSelected(item, selectedValues, item.name))
      .map((item) => ({ label: item.name, value: item.name }));
  }, [catalogs?.languages, selected.language]);
  const targetAudienceOptions = useMemo(() => {
    const selectedValues = selected.target_audience ?? [];

    return (catalogs?.target_audiences ?? [])
      .filter((item) => activeOrSelected(item, selectedValues, item.slug))
      .map((item) => ({ label: item.name, value: item.slug }));
  }, [catalogs?.target_audiences, selected.target_audience]);
  const catalogError = catalogsQuery.error ? resolveApiError(catalogsQuery.error) : null;

  const onSubmit: SubmitHandler<ProfileProfessionalDataFormValues> = async (values) => {
    try {
      await mutation.mutateAsync({
        approach_ids: values.approach_ids,
        languages: values.language ? [values.language] : [],
        modality: emptyToNull(values.modality) as "hibrido" | "online" | "presencial" | null,
        reason: values.reason.trim(),
        service_ids: values.service_ids,
        specialty_ids: values.specialty_ids,
        target_audience: values.target_audience,
      });
      toast.success("Dados profissionais atualizados.");
      onCancel();
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  return (
    <FormProvider {...form}>
      <form className="space-y-4" noValidate onSubmit={form.handleSubmit(onSubmit)}>
        {catalogError ? (
          <ErrorState message={catalogError} onRetry={() => void catalogsQuery.refetch()} />
        ) : null}
        <SelectController<ProfileProfessionalDataFormValues>
          disabled={disabled}
          insetChevron
          label="Modalidades"
          name="modality"
          options={mergeCurrentOption(MODALITY_OPTIONS, professional.modality)}
        />
        <AdminProfessionalTagField
          disabled={disabled}
          error={form.formState.errors.specialty_ids?.message}
          groups={specialtyGroups}
          label="Especialidades"
          onChange={(values) =>
            form.setValue("specialty_ids", values, { shouldDirty: true, shouldValidate: true })
          }
          options={specialtyOptions}
          placeholder="Selecione as especialidades"
          selected={selected.specialty_ids ?? []}
        />
        <AdminProfessionalTagField
          disabled={disabled}
          error={form.formState.errors.approach_ids?.message}
          label="Abordagens"
          onChange={(values) =>
            form.setValue("approach_ids", values, { shouldDirty: true, shouldValidate: true })
          }
          options={approachOptions}
          placeholder="Selecione as abordagens"
          selected={selected.approach_ids ?? []}
        />
        <SelectController<ProfileProfessionalDataFormValues>
          disabled={disabled}
          insetChevron
          label="Idiomas"
          name="language"
          options={mergeCurrentOption(
            [EMPTY_SELECT_OPTION, ...languageOptions],
            professional.languages[0],
          )}
        />
        <AdminProfessionalChipPicker
          disabled={disabled}
          error={form.formState.errors.service_ids?.message}
          label="Serviços"
          onChange={(values) =>
            form.setValue("service_ids", values, { shouldDirty: true, shouldValidate: true })
          }
          options={serviceOptions}
          selected={selected.service_ids ?? []}
        />
        <AdminProfessionalChipPicker
          disabled={disabled}
          error={form.formState.errors.target_audience?.message}
          label="Público"
          onChange={(values) =>
            form.setValue("target_audience", values, { shouldDirty: true, shouldValidate: true })
          }
          options={targetAudienceOptions}
          selected={selected.target_audience ?? []}
        />
        <TextareaController<ProfileProfessionalDataFormValues>
          disabled={disabled}
          label="Motivo/observação interna"
          name="reason"
          placeholder="Descreva a justificativa operacional da correção profissional."
          required
          rows={3}
        />
        <ProfileFormActions disabled={disabled} onCancel={onCancel} />
      </form>
    </FormProvider>
  );
};

export const ProfileReadOnlyProfessionalData = ({
  detail,
}: {
  detail: AdminPsychologistDetail;
}) => {
  const professional = detail.profile.professional;
  const personal = detail.profile.personal;
  const visibilityStatus = detail.header.active ? "active" : "inactive";
  const visibilityDescription = detail.header.active
    ? "Perfil aparece para pacientes na busca pública."
    : detail.header.published
      ? "Visibilidade ativada pelo psicólogo, mas o perfil ainda não cumpre todos os critérios públicos."
      : "Visibilidade desativada pelo psicólogo.";

  return (
    <>
      <FieldRow label="Especialidades" value={listText(professional.specialties)} />
      <FieldRow label="Abordagens" value={listText(professional.approaches)} />
      <FieldRow label="Serviços" value={listText(professional.services)} />
      <FieldRow label="Público atendido" value={listText(professional.target_audience)} />
      <FieldRow label="Idiomas" value={listText(professional.languages)} />
      <FieldRow
        label="Modalidades"
        value={getStaticOptionLabel(MODALITY_OPTIONS, professional.modality)}
      />
      <FieldRow
        label="Perfil visível para pacientes"
        value={
          <span className="flex flex-col items-start gap-2">
            <Badge className={PROFILE_STATUS_COPY[visibilityStatus].className}>
              {detail.header.active ? "Sim" : "Não"}
            </Badge>
            <span className="text-xs font-bold leading-5 text-muted">{visibilityDescription}</span>
          </span>
        }
      />
      <FieldRow label="Cadastro via" value={formatNullable(personal.provider)} />
      <FieldRow label="Data cadastro Lectum" value={formatDate(detail.header.created_at)} />
    </>
  );
};
