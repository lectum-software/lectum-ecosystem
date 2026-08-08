"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  Eye,
  KeyRound,
  Loader2,
  Lock,
  LogOut,
  type LucideIcon,
  X,
} from "lucide-react";
import { FormProvider, type SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  useAdminPsychologistRevokeSessions,
  useAdminPsychologistSetTemporaryPassword,
  useAdminPsychologistStartViewAs,
} from "@/api/callers/psychologists";
import { resolveApiError } from "@/api/handle";
import type { AdminPsychologistAccount } from "@/api/req/psychologists";
import { InputController, TextareaController } from "@/components/controllers";
import {
  adminViewAsPopupBlockedMessage,
  buildAdminViewAsUrl,
  openPendingAdminViewAsTab,
} from "@/lib/admin-view-as";
import type {
  AccountReasonFormValues,
  AccountRevokeSessionsFormValues,
  AccountTemporaryPasswordFormValues,
} from "../../support/schemas";
import {
  accountDeactivateSchema,
  accountDeleteSchema,
  accountReasonSchema,
  accountRevokeSessionsSchema,
  accountSuspendSchema,
  accountTemporaryPasswordSchema,
} from "../../support/schemas";
import { AccountUnavailableNotice } from "./summary";

export const AccountTemporaryPasswordForm = ({
  account,
  id,
}: {
  account: AdminPsychologistAccount;
  id: string;
}) => {
  const mutation = useAdminPsychologistSetTemporaryPassword(id);
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
      toast.success("Senha temporária definida. O psicólogo deverá trocá-la no próximo login.");
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
          troca obrigatória no próximo login do psicólogo.
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
          placeholder="ALTERAR SENHA"
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
  account: AdminPsychologistAccount;
  id: string;
}) => {
  const mutation = useAdminPsychologistRevokeSessions(id);
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
      toast.success("Sessões do psicólogo encerradas.");
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
          placeholder="ENCERRAR SESSOES"
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
  account: AdminPsychologistAccount;
  id: string;
}) => {
  const mutation = useAdminPsychologistStartViewAs(id);
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
      toast.success("Visualização como psicólogo aberta em nova aba.");
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
          placeholder="Explique por que a equipe precisa visualizar a experiência do psicólogo."
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

export type AccountStatusActionKind = "deactivate" | "delete" | "suspend";

export const ACCOUNT_STATUS_ACTION_CONFIG: Record<
  AccountStatusActionKind,
  {
    blockedMessage: string;
    buttonClassName: string;
    buttonLabel: string;
    canRun: (account: AdminPsychologistAccount) => boolean;
    confirmation: string;
    description: string;
    icon: LucideIcon;
    schema: typeof accountSuspendSchema;
    successMessage: string;
    title: string;
  }
> = {
  deactivate: {
    blockedMessage: "A conta já está desativada ou não pode receber esta ação.",
    buttonClassName:
      "border border-border bg-surface px-4 text-foreground hover:border-primary hover:text-primary",
    buttonLabel: "Desativar conta",
    canRun: (account) => account.capabilities.can_deactivate_account,
    confirmation: "DESATIVAR CONTA",
    description:
      "Ação administrativa reversível por decisão futura: bloqueia login, encerra sessões e remove o perfil da descoberta pública.",
    icon: X,
    schema: accountDeactivateSchema,
    successMessage: "Conta desativada e sessões encerradas.",
    title: "Desativar conta",
  },
  delete: {
    blockedMessage: "Exclusão indisponível para esta conta no estado atual.",
    buttonClassName: "bg-danger px-4 text-primary-foreground hover:bg-danger/90",
    buttonLabel: "Excluir conta",
    canRun: (account) => account.capabilities.can_delete_account,
    confirmation: "EXCLUIR CONTA",
    description:
      "Ação permanente: aplica soft delete, anonimiza dados da conta, remove o perfil público e encerra sessões. Não cancela cobrança ativa em gateway.",
    icon: AlertTriangle,
    schema: accountDeleteSchema,
    successMessage: "Conta excluída. Retornando para a lista de psicólogos.",
    title: "Excluir conta",
  },
  suspend: {
    blockedMessage: "A conta já está suspensa ou não pode receber esta ação.",
    buttonClassName: "bg-danger px-4 text-primary-foreground hover:bg-danger/90",
    buttonLabel: "Suspender conta",
    canRun: (account) => account.capabilities.can_suspend_account,
    confirmation: "SUSPENDER CONTA",
    description:
      "Ação punitiva/operacional temporária: bloqueia login, encerra sessões e remove o perfil da descoberta pública sem apagar dados.",
    icon: Lock,
    schema: accountSuspendSchema,
    successMessage: "Conta suspensa e sessões encerradas.",
    title: "Suspender conta",
  },
};
