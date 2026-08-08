"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Lock, Pencil } from "lucide-react";
import { useEffect, useMemo } from "react";
import { FormProvider, type SubmitHandler, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { useAdminPsychologistUpdatePersonalData } from "@/api/callers/psychologists";
import { resolveApiError } from "@/api/handle";
import type { AdminPsychologistDetail } from "@/api/req/psychologists";
import { InputController, SelectController, TextareaController } from "@/components/controllers";
import {
  CPF_CHANGE_CONFIRMATION_OPTIONS,
  GENDER_OPTIONS,
  getStaticOptionLabel,
  mergeCurrentOption,
  RACE_COLOR_OPTIONS,
  RELIGION_OPTIONS,
  STATE_OPTIONS,
} from "../../support/config";
import { formatDateOnly } from "../../support/date-period";
import {
  emptyToNull,
  formatCpfDisplay,
  formatCpfInput,
  formatInputDate,
  formatNullable,
  formatPersonalAddress,
  formatPhoneDisplay,
  formatWhatsappInput,
  formatZipInput,
} from "../../support/formatters";
import type { ProfilePersonalDataFormValues } from "../../support/schemas";
import { onlyDigits, profilePersonalDataBaseSchema } from "../../support/schemas";
import { FieldRow } from "../general/index";

export const ProfileEditButton = ({
  disabled,
  onClick,
}: {
  disabled?: boolean;
  onClick: () => void;
}) => (
  <button
    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-control border border-primary px-4 text-sm font-black text-primary transition hover:bg-primary-soft disabled:cursor-not-allowed disabled:border-border disabled:text-muted sm:w-auto"
    disabled={disabled}
    onClick={onClick}
    type="button"
  >
    <Pencil aria-hidden className="h-4 w-4" />
    Editar
  </button>
);

export const ProfileFormActions = ({
  disabled,
  onCancel,
}: {
  disabled?: boolean;
  onCancel: () => void;
}) => (
  <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
    <button
      className="inline-flex h-11 items-center justify-center rounded-control border border-border px-4 text-sm font-black text-foreground transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:text-muted"
      disabled={disabled}
      onClick={onCancel}
      type="button"
    >
      Cancelar
    </button>
    <button
      className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-primary px-4 text-sm font-black text-primary-foreground transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted"
      disabled={disabled}
      type="submit"
    >
      {disabled ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
      Salvar alterações
    </button>
  </div>
);

const isValidDateInput = (value?: string | null) => {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [yearValue, monthValue, dayValue] = value.split("-");
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
  const date = new Date(Date.UTC(year, month - 1, day));
  const today = new Date();
  const todayTime = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    date.getTime() >= Date.UTC(1900, 0, 1) &&
    date.getTime() <= todayTime
  );
};

const createPersonalDataSchema = (isRegistryApproved: boolean, currentCpf?: string | null) =>
  profilePersonalDataBaseSchema.superRefine((values, ctx) => {
    if (values.birthdate && !isValidDateInput(values.birthdate)) {
      ctx.addIssue({
        code: "custom",
        message: "Informe uma data de nascimento válida.",
        path: ["birthdate"],
      });
    }

    const cpfChanged = onlyDigits(values.cpf) !== onlyDigits(currentCpf);
    if (isRegistryApproved && cpfChanged && values.confirm_cpf_change !== "sim") {
      ctx.addIssue({
        code: "custom",
        message:
          "Confirme que a alteração administrativa do CPF não revalida nem invalida o CRP automaticamente.",
        path: ["confirm_cpf_change"],
      });
    }
  });

export const PersonalDataEditForm = ({
  detail,
  id,
  onCancel,
}: {
  detail: AdminPsychologistDetail;
  id: string;
  onCancel: () => void;
}) => {
  const personal = detail.profile.personal;
  const professional = detail.profile.professional;
  const mutation = useAdminPsychologistUpdatePersonalData(id);
  const schema = useMemo(
    () => createPersonalDataSchema(professional.crp_status === "aprovado", personal.cpf),
    [personal.cpf, professional.crp_status],
  );
  const form = useForm<ProfilePersonalDataFormValues>({
    defaultValues: {
      address_city: personal.address.city || "",
      address_complement: personal.address.complement || "",
      address_district: personal.address.district || "",
      address_number: personal.address.number || "",
      address_state: personal.address.state || "",
      address_street: personal.address.street || "",
      address_zip: formatZipInput(personal.address.zip),
      birthdate: formatInputDate(personal.birthdate),
      confirm_cpf_change: "",
      cpf: formatCpfInput(personal.cpf),
      gender: professional.gender || "",
      race_color: professional.race_color || "",
      reason: "",
      religion: professional.religion || "",
      whatsapp: formatWhatsappInput(personal.phone),
    },
    mode: "onSubmit",
    resolver: zodResolver(schema),
  });
  const disabled = mutation.isPending;

  useEffect(() => {
    form.reset({
      address_city: personal.address.city || "",
      address_complement: personal.address.complement || "",
      address_district: personal.address.district || "",
      address_number: personal.address.number || "",
      address_state: personal.address.state || "",
      address_street: personal.address.street || "",
      address_zip: formatZipInput(personal.address.zip),
      birthdate: formatInputDate(personal.birthdate),
      confirm_cpf_change: "",
      cpf: formatCpfInput(personal.cpf),
      gender: professional.gender || "",
      race_color: professional.race_color || "",
      reason: "",
      religion: professional.religion || "",
      whatsapp: formatWhatsappInput(personal.phone),
    });
  }, [form, personal, professional.gender, professional.race_color, professional.religion]);

  const watchedCpf = useWatch({ control: form.control, name: "cpf" });
  const isApprovedCpfChanged =
    professional.crp_status === "aprovado" && onlyDigits(watchedCpf) !== onlyDigits(personal.cpf);

  const onSubmit: SubmitHandler<ProfilePersonalDataFormValues> = async (values) => {
    try {
      await mutation.mutateAsync({
        address_city: emptyToNull(values.address_city),
        address_complement: emptyToNull(values.address_complement),
        address_district: emptyToNull(values.address_district),
        address_number: emptyToNull(values.address_number),
        address_state: emptyToNull(values.address_state)?.toUpperCase() ?? null,
        address_street: emptyToNull(values.address_street),
        address_zip: emptyToNull(values.address_zip ? onlyDigits(values.address_zip) : ""),
        birthdate: emptyToNull(values.birthdate),
        confirm_cpf_change: isApprovedCpfChanged && values.confirm_cpf_change === "sim",
        cpf: emptyToNull(values.cpf ? onlyDigits(values.cpf) : ""),
        gender: emptyToNull(values.gender),
        race_color: emptyToNull(values.race_color),
        reason: values.reason.trim(),
        religion: emptyToNull(values.religion),
        whatsapp: emptyToNull(values.whatsapp ? onlyDigits(values.whatsapp) : ""),
      });
      toast.success("Dados pessoais atualizados.");
      onCancel();
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  return (
    <FormProvider {...form}>
      <form className="space-y-4" noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid gap-4 md:grid-cols-2">
          <InputController<ProfilePersonalDataFormValues>
            disabled={disabled}
            inputMode="numeric"
            label="CPF"
            maskValue={formatCpfInput}
            maxLength={14}
            name="cpf"
            placeholder="000.000.000-00"
          />
          <InputController<ProfilePersonalDataFormValues>
            disabled={disabled}
            inputMode="tel"
            label="WhatsApp"
            maskValue={formatWhatsappInput}
            maxLength={20}
            name="whatsapp"
            placeholder="+55 (00) 00000-0000"
          />
          <InputController<ProfilePersonalDataFormValues>
            disabled={disabled}
            label="Data de nascimento"
            name="birthdate"
            type="date"
          />
          <SelectController<ProfilePersonalDataFormValues>
            disabled={disabled}
            insetChevron
            label="Gênero"
            name="gender"
            options={mergeCurrentOption(GENDER_OPTIONS, professional.gender)}
          />
          <SelectController<ProfilePersonalDataFormValues>
            disabled={disabled}
            insetChevron
            label="Raça/cor"
            name="race_color"
            options={mergeCurrentOption(RACE_COLOR_OPTIONS, professional.race_color)}
          />
          <SelectController<ProfilePersonalDataFormValues>
            disabled={disabled}
            insetChevron
            label="Religião"
            name="religion"
            options={mergeCurrentOption(RELIGION_OPTIONS, professional.religion)}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <InputController<ProfilePersonalDataFormValues>
            disabled={disabled}
            label="Logradouro"
            name="address_street"
            placeholder="Rua, avenida..."
          />
          <InputController<ProfilePersonalDataFormValues>
            disabled={disabled}
            label="Número"
            name="address_number"
          />
          <InputController<ProfilePersonalDataFormValues>
            disabled={disabled}
            label="Complemento"
            name="address_complement"
          />
          <InputController<ProfilePersonalDataFormValues>
            disabled={disabled}
            label="Bairro"
            name="address_district"
          />
          <InputController<ProfilePersonalDataFormValues>
            disabled={disabled}
            inputMode="numeric"
            label="CEP"
            maskValue={formatZipInput}
            maxLength={9}
            name="address_zip"
          />
          <InputController<ProfilePersonalDataFormValues>
            disabled={disabled}
            label="Cidade"
            name="address_city"
          />
          <SelectController<ProfilePersonalDataFormValues>
            disabled={disabled}
            insetChevron
            label="UF"
            name="address_state"
            options={mergeCurrentOption(STATE_OPTIONS, personal.address.state)}
          />
        </div>
        {isApprovedCpfChanged ? (
          <div className="rounded-2xl border border-warning-border bg-warning-soft p-4 text-sm font-bold text-warning">
            Alterar CPF em psicólogo aprovado não revalida nem invalida automaticamente o CRP.
            Decisões de aprovação/rejeição continuam no card Registro profissional.
          </div>
        ) : null}
        {isApprovedCpfChanged ? (
          <SelectController<ProfilePersonalDataFormValues>
            disabled={disabled}
            insetChevron
            label="Confirmação para alteração de CPF aprovado"
            name="confirm_cpf_change"
            options={[...CPF_CHANGE_CONFIRMATION_OPTIONS]}
          />
        ) : null}
        <TextareaController<ProfilePersonalDataFormValues>
          disabled={disabled}
          label="Motivo/observação interna"
          name="reason"
          placeholder="Descreva a justificativa operacional da correção."
          required
          rows={4}
        />
        <ProfileFormActions disabled={disabled} onCancel={onCancel} />
      </form>
    </FormProvider>
  );
};

export const ProfileReadOnlyPersonalData = ({ detail }: { detail: AdminPsychologistDetail }) => {
  const professional = detail.profile.professional;
  const personal = detail.profile.personal;

  return (
    <>
      <FieldRow label="Nome completo" value={formatNullable(personal.full_name)} />
      <FieldRow label="CPF" value={formatCpfDisplay(personal.cpf)} />
      <FieldRow
        label="E-mail"
        value={
          <span className="inline-flex items-center gap-2">
            {personal.email}
            <Lock aria-label="Somente leitura" className="h-4 w-4 text-muted" />
          </span>
        }
      />
      <FieldRow label="WhatsApp" value={formatPhoneDisplay(personal.phone)} />
      <FieldRow label="Data de nascimento" value={formatDateOnly(personal.birthdate)} />
      <FieldRow label="Gênero" value={getStaticOptionLabel(GENDER_OPTIONS, professional.gender)} />
      <FieldRow
        label="Raça/cor"
        value={getStaticOptionLabel(RACE_COLOR_OPTIONS, professional.race_color)}
      />
      <FieldRow
        label="Religião"
        value={getStaticOptionLabel(RELIGION_OPTIONS, professional.religion)}
      />
      <FieldRow
        label="Endereço"
        value={
          <span className="whitespace-pre-line">{formatPersonalAddress(personal.address)}</span>
        }
      />
    </>
  );
};
