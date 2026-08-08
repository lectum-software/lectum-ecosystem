"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Mail, Send, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { FormProvider, type SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  useAdminPsychologistChangeAccountEmail,
  useAdminPsychologistSendEmailConfirmation,
  useAdminPsychologistSendPasswordReset,
} from "@/api/callers/psychologists";
import { resolveApiError } from "@/api/handle";
import type { AdminPsychologistAccount } from "@/api/req/psychologists";
import { InputController, TextareaController } from "@/components/controllers";
import { Badge } from "../../components/shared";
import { numberFormatter } from "../../support/config";
import { formatDateTime } from "../../support/formatters";
import type { AccountChangeEmailFormValues, AccountReasonFormValues } from "../../support/schemas";
import { accountChangeEmailSchema, accountReasonSchema } from "../../support/schemas";
import { FieldRow, InfoCard } from "../general/index";

const booleanBadge = (value: boolean, labels: { false: string; true: string }) => (
  <Badge className={value ? "bg-emerald-50 text-success" : "bg-orange-50 text-orange-700"}>
    {value ? labels.true : labels.false}
  </Badge>
);

export const AccountUnavailableNotice = ({ children }: { children: ReactNode }) => (
  <div className="rounded-2xl border border-dashed border-border bg-surface-muted p-4 text-sm font-bold leading-6 text-muted">
    {children}
  </div>
);

export const ACCOUNT_STATUS_BADGE_CLASS: Record<
  AdminPsychologistAccount["account_status"],
  string
> = {
  active: "bg-primary-soft text-primary",
  deactivated: "bg-surface-muted text-muted",
  deleted: "bg-danger/10 text-danger",
  suspended: "bg-danger/10 text-danger",
};

export const AccountSummaryCard = ({ account }: { account: AdminPsychologistAccount }) => (
  <InfoCard icon={ShieldCheck} title="Resumo da conta">
    <dl className="divide-y divide-border">
      <FieldRow label="E-mail atual" value={account.email} />
      <FieldRow
        label="Status do e-mail"
        value={booleanBadge(account.confirmed, {
          false: "Pendente",
          true: "Confirmado",
        })}
      />
      <FieldRow label="Confirmado em" value={formatDateTime(account.confirmed_at)} />
      <FieldRow label="Método de login" value={account.provider_label} />
      <FieldRow
        label="Senha local"
        value={booleanBadge(account.has_password, {
          false: "Não possui senha local",
          true: "Possui senha local",
        })}
      />
      <FieldRow
        label="Status da conta"
        value={
          <Badge className={ACCOUNT_STATUS_BADGE_CLASS[account.account_status]}>
            {account.account_status_label}
          </Badge>
        }
      />
      <FieldRow
        label="Status alterado em"
        value={formatDateTime(account.account_status_changed_at)}
      />
      {account.account_status === "suspended" ? (
        <FieldRow label="Suspensa até" value={formatDateTime(account.account_status_expires_at)} />
      ) : null}
      <FieldRow
        label="Troca obrigatória"
        value={booleanBadge(account.need_reset, {
          false: "Sem pendência",
          true: "Pendente",
        })}
      />
      <FieldRow label="Conta criada em" value={formatDateTime(account.created_at)} />
      <FieldRow label="Último acesso" value={formatDateTime(account.last_access_at)} />
      <FieldRow
        label="Sessões ativas"
        value={`${numberFormatter.format(account.sessions.active_count)} sessão(ões) em ${numberFormatter.format(
          account.sessions.devices_count,
        )} dispositivo(s)`}
      />
    </dl>
  </InfoCard>
);

export const AccountChangeEmailForm = ({
  account,
  id,
}: {
  account: AdminPsychologistAccount;
  id: string;
}) => {
  const mutation = useAdminPsychologistChangeAccountEmail(id);
  const form = useForm<AccountChangeEmailFormValues>({
    defaultValues: {
      confirmation: "",
      email: "",
      reason: "",
    },
    mode: "onSubmit",
    resolver: zodResolver(accountChangeEmailSchema),
  });
  const disabled = !account.capabilities.can_change_email || mutation.isPending;

  const onSubmit: SubmitHandler<AccountChangeEmailFormValues> = async (values) => {
    try {
      await mutation.mutateAsync({
        confirmation: values.confirmation.trim().toUpperCase(),
        email: values.email.trim().toLowerCase(),
        reason: values.reason.trim(),
      });
      form.reset();
      toast.success("E-mail alterado. Confirmação enviada para o novo endereço.");
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  return (
    <FormProvider {...form}>
      <form className="grid gap-3" noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <InputController<AccountChangeEmailFormValues>
          autoComplete="off"
          disabled={disabled}
          label="Novo e-mail"
          name="email"
          placeholder="novo@email.com"
          required
          type="email"
        />
        <TextareaController<AccountChangeEmailFormValues>
          disabled={disabled}
          label="Motivo/observação interna"
          name="reason"
          placeholder="Explique a solicitação recebida pelo suporte."
          required
          rows={3}
        />
        <InputController<AccountChangeEmailFormValues>
          autoComplete="off"
          disabled={disabled}
          label="Confirmação forte"
          name="confirmation"
          placeholder="ALTERAR EMAIL"
          required
        />
        <button
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-control bg-primary px-4 text-sm font-black text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted"
          disabled={disabled}
          type="submit"
        >
          {mutation.isPending ? (
            <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          ) : (
            <Mail aria-hidden className="h-4 w-4" />
          )}
          Alterar e-mail
        </button>
      </form>
    </FormProvider>
  );
};

export const AccountSendEmailConfirmationForm = ({
  account,
  id,
}: {
  account: AdminPsychologistAccount;
  id: string;
}) => {
  const mutation = useAdminPsychologistSendEmailConfirmation(id);
  const form = useForm<AccountReasonFormValues>({
    defaultValues: { reason: "" },
    mode: "onSubmit",
    resolver: zodResolver(accountReasonSchema),
  });
  const disabled = !account.capabilities.can_send_email_confirmation || mutation.isPending;

  const onSubmit: SubmitHandler<AccountReasonFormValues> = async (values) => {
    try {
      await mutation.mutateAsync({ reason: values.reason.trim() });
      form.reset();
      toast.success("Confirmação de e-mail reenviada.");
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  if (!account.capabilities.can_send_email_confirmation) {
    return (
      <AccountUnavailableNotice>
        Reenvio disponível apenas quando o e-mail está pendente de confirmação.
      </AccountUnavailableNotice>
    );
  }

  return (
    <FormProvider {...form}>
      <form className="grid gap-3" noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <TextareaController<AccountReasonFormValues>
          disabled={disabled}
          label="Motivo/observação interna"
          name="reason"
          placeholder="Informe o motivo do reenvio."
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
            <Send aria-hidden className="h-4 w-4" />
          )}
          Reenviar confirmação
        </button>
      </form>
    </FormProvider>
  );
};

export const AccountPasswordResetForm = ({
  account,
  id,
}: {
  account: AdminPsychologistAccount;
  id: string;
}) => {
  const mutation = useAdminPsychologistSendPasswordReset(id);
  const form = useForm<AccountReasonFormValues>({
    defaultValues: { reason: "" },
    mode: "onSubmit",
    resolver: zodResolver(accountReasonSchema),
  });
  const disabled = !account.capabilities.can_send_password_reset || mutation.isPending;

  const onSubmit: SubmitHandler<AccountReasonFormValues> = async (values) => {
    try {
      await mutation.mutateAsync({ reason: values.reason.trim() });
      form.reset();
      toast.success("Link de redefinição enviado.");
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  if (!account.capabilities.can_send_password_reset) {
    return (
      <AccountUnavailableNotice>
        Esta conta acessa via Google. Redefinição de senha local indisponível.
      </AccountUnavailableNotice>
    );
  }

  return (
    <FormProvider {...form}>
      <form className="grid gap-3" noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <TextareaController<AccountReasonFormValues>
          disabled={disabled}
          label="Motivo/observação interna"
          name="reason"
          placeholder="Explique por que o link será enviado pelo Admin."
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
            <Send aria-hidden className="h-4 w-4" />
          )}
          Enviar link de redefinição
        </button>
      </form>
    </FormProvider>
  );
};
