"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, KeyRound, Loader2, LogOut, Mail, Send } from "lucide-react";
import { FormProvider, type SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  useAdminPatientChangeAccountEmail,
  useAdminPatientRevokeSessions,
  useAdminPatientSendEmailConfirmation,
  useAdminPatientSendPasswordReset,
  useAdminPatientSetTemporaryPassword,
  useAdminPatientStartViewAs,
} from "@/api/callers/patients";
import { resolveApiError } from "@/api/handle";
import type { AdminPatientAccount } from "@/api/req/patients";
import { InputController, TextareaController } from "@/components/controllers";
import {
  adminViewAsPopupBlockedMessage,
  buildAdminViewAsUrl,
  openPendingAdminViewAsTab,
} from "@/lib/admin-view-as";

import {
  type AccountChangeEmailFormValues,
  type AccountReasonFormValues,
  type AccountRevokeSessionsFormValues,
  type AccountTemporaryPasswordFormValues,
  accountChangeEmailSchema,
  accountReasonSchema,
  accountRevokeSessionsSchema,
  accountTemporaryPasswordSchema,
  STRONG_CONFIRMATIONS,
} from "../modules/detail-config";

import { AccountUnavailableNotice } from "./account-summary";

export const AccountChangeEmailForm = ({
  account,
  id,
}: {
  account: AdminPatientAccount;
  id: string;
}) => {
  const mutation = useAdminPatientChangeAccountEmail(id);
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
          placeholder={STRONG_CONFIRMATIONS.changeEmail}
          required
        />
        <button
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-control bg-primary px-4 text-sm font-black text-primary-foreground transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted"
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
  account: AdminPatientAccount;
  id: string;
}) => {
  const mutation = useAdminPatientSendEmailConfirmation(id);
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
  account: AdminPatientAccount;
  id: string;
}) => {
  const mutation = useAdminPatientSendPasswordReset(id);
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

export const AccountTemporaryPasswordForm = ({
  account,
  id,
}: {
  account: AdminPatientAccount;
  id: string;
}) => {
  const mutation = useAdminPatientSetTemporaryPassword(id);
  const form = useForm<AccountTemporaryPasswordFormValues>({
    defaultValues: {
      confirmation: "",
      password: "",
      password_confirm: "",
      reason: "",
    },
    mode: "onSubmit",
    resolver: zodResolver(accountTemporaryPasswordSchema),
  });
  const disabled = !account.capabilities.can_set_temporary_password || mutation.isPending;

  const onSubmit: SubmitHandler<AccountTemporaryPasswordFormValues> = async (values) => {
    try {
      await mutation.mutateAsync({
        confirmation: values.confirmation.trim().toUpperCase(),
        password: values.password,
        password_confirm: values.password_confirm,
        reason: values.reason.trim(),
      });
      form.reset();
      toast.success("Senha temporária definida. O paciente deverá trocá-la no próximo login.");
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  if (!account.capabilities.can_set_temporary_password) {
    return (
      <AccountUnavailableNotice>
        Esta conta acessa via Google. Alteração de senha local indisponível.
      </AccountUnavailableNotice>
    );
  }

  return (
    <FormProvider {...form}>
      <form className="grid gap-3" noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <div className="rounded-2xl border border-warning-border bg-warning-soft p-3 text-sm font-bold leading-6 text-warning">
          A senha temporária não será exibida novamente, não será gravada em auditoria e exigirá
          troca obrigatória no próximo login do paciente.
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <InputController<AccountTemporaryPasswordFormValues>
            autoComplete="new-password"
            disabled={disabled}
            label="Senha temporária"
            name="password"
            required
            type="password"
          />
          <InputController<AccountTemporaryPasswordFormValues>
            autoComplete="new-password"
            disabled={disabled}
            label="Confirmar senha temporária"
            name="password_confirm"
            required
            type="password"
          />
        </div>
        <TextareaController<AccountTemporaryPasswordFormValues>
          disabled={disabled}
          label="Motivo/observação interna"
          name="reason"
          placeholder="Registre o motivo excepcional para senha temporária."
          required
          rows={3}
        />
        <InputController<AccountTemporaryPasswordFormValues>
          autoComplete="off"
          disabled={disabled}
          label="Confirmação forte"
          name="confirmation"
          placeholder={STRONG_CONFIRMATIONS.temporaryPassword}
          required
        />
        <button
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-control bg-danger px-4 text-sm font-black text-primary-foreground transition hover:bg-danger/90 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted"
          disabled={disabled}
          type="submit"
        >
          {mutation.isPending ? (
            <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          ) : (
            <KeyRound aria-hidden className="h-4 w-4" />
          )}
          Definir senha temporária
        </button>
      </form>
    </FormProvider>
  );
};

export const AccountRevokeSessionsForm = ({
  account,
  id,
}: {
  account: AdminPatientAccount;
  id: string;
}) => {
  const mutation = useAdminPatientRevokeSessions(id);
  const form = useForm<AccountRevokeSessionsFormValues>({
    defaultValues: {
      confirmation: "",
      reason: "",
    },
    mode: "onSubmit",
    resolver: zodResolver(accountRevokeSessionsSchema),
  });
  const disabled = !account.capabilities.can_revoke_sessions || mutation.isPending;

  const onSubmit: SubmitHandler<AccountRevokeSessionsFormValues> = async (values) => {
    try {
      await mutation.mutateAsync({
        confirmation: values.confirmation.trim().toUpperCase(),
        reason: values.reason.trim(),
      });
      form.reset();
      toast.success("Sessões do paciente encerradas.");
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  return (
    <FormProvider {...form}>
      <form className="grid gap-3" noValidate onSubmit={form.handleSubmit(onSubmit)}>
        {!account.capabilities.can_revoke_sessions ? (
          <AccountUnavailableNotice>Nenhuma sessão ativa foi encontrada.</AccountUnavailableNotice>
        ) : null}
        <TextareaController<AccountRevokeSessionsFormValues>
          disabled={disabled}
          label="Motivo/observação interna"
          name="reason"
          placeholder="Explique por que as sessões serão encerradas."
          required
          rows={3}
        />
        <InputController<AccountRevokeSessionsFormValues>
          autoComplete="off"
          disabled={disabled}
          label="Confirmação forte"
          name="confirmation"
          placeholder={STRONG_CONFIRMATIONS.revokeSessions}
          required
        />
        <button
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-control border border-danger bg-surface px-4 text-sm font-black text-danger transition hover:bg-danger-soft disabled:cursor-not-allowed disabled:border-border disabled:text-muted"
          disabled={disabled}
          type="submit"
        >
          {mutation.isPending ? (
            <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut aria-hidden className="h-4 w-4" />
          )}
          Encerrar sessões
        </button>
      </form>
    </FormProvider>
  );
};

export const AccountViewAsForm = ({
  account,
  id,
}: {
  account: AdminPatientAccount;
  id: string;
}) => {
  const mutation = useAdminPatientStartViewAs(id);
  const form = useForm<AccountReasonFormValues>({
    defaultValues: { reason: "" },
    mode: "onSubmit",
    resolver: zodResolver(accountReasonSchema),
  });
  const disabled = !account.capabilities.can_view_as_user || mutation.isPending;

  const onSubmit: SubmitHandler<AccountReasonFormValues> = async (values) => {
    const tab = openPendingAdminViewAsTab();
    if (!tab) {
      toast.error(adminViewAsPopupBlockedMessage);
      return;
    }

    try {
      const session = await mutation.mutateAsync({ reason: values.reason.trim() });
      form.reset();
      if (tab.closed) {
        toast.error("A nova aba foi fechada antes da visualização carregar.");
        return;
      }

      tab.location.replace(buildAdminViewAsUrl(session));
      toast.success("Visualização como paciente aberta em nova aba.");
    } catch (error) {
      tab.close();
      toast.error(resolveApiError(error));
    }
  };

  return (
    <FormProvider {...form}>
      <form className="grid gap-3" noValidate onSubmit={form.handleSubmit(onSubmit)}>
        {!account.capabilities.can_view_as_user ? (
          <AccountUnavailableNotice>
            Disponível apenas para conta ativa e não excluída. Contas suspensas ou desativadas não
            podem ser visualizadas como usuário.
          </AccountUnavailableNotice>
        ) : null}
        <TextareaController<AccountReasonFormValues>
          disabled={disabled}
          label="Motivo/observação interna"
          name="reason"
          placeholder="Explique por que a equipe precisa visualizar a experiência do paciente."
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
            <Eye aria-hidden className="h-4 w-4" />
          )}
          Visualizar como usuário
        </button>
      </form>
    </FormProvider>
  );
};
