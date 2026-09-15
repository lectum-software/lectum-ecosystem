"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Loader2, Lock, type LucideIcon, X } from "lucide-react";
import { FormProvider, type SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  useAdminPatientDeactivateAccount,
  useAdminPatientDeleteAccount,
  useAdminPatientSuspendAccount,
} from "@/api/callers/patients";
import { resolveApiError } from "@/api/handle";
import type { AdminPatientAccount } from "@/api/req/patients";
import { InputController, SelectController, TextareaController } from "@/components/controllers";
import { cn } from "@/lib/utils";

import {
  type AccountStatusActionFormValues,
  accountDeactivateSchema,
  accountDeleteSchema,
  accountSuspendSchema,
  SUSPENSION_DURATION_OPTIONS,
} from "../modules/detail-config";
import { AccountUnavailableNotice } from "./account-summary";
import { IconCircle } from "./common";

export type AccountStatusActionKind = "deactivate" | "delete" | "suspend";

export const ACCOUNT_STATUS_ACTION_CONFIG: Record<
  AccountStatusActionKind,
  {
    blockedMessage: string;
    buttonClassName: string;
    buttonLabel: string;
    canRun: (account: AdminPatientAccount) => boolean;
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
      "Ação administrativa reversível por decisão futura: bloqueia login e encerra sessões do paciente.",
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
      "Ação permanente: anonimiza dados da conta, remove o perfil do paciente e encerra sessões.",
    icon: AlertTriangle,
    schema: accountDeleteSchema,
    successMessage: "Conta excluída. Retornando para a lista de pacientes.",
    title: "Excluir conta",
  },
  suspend: {
    blockedMessage: "A conta já está suspensa ou não pode receber esta ação.",
    buttonClassName: "bg-danger px-4 text-primary-foreground hover:bg-danger/90",
    buttonLabel: "Suspender conta",
    canRun: (account) => account.capabilities.can_suspend_account,
    confirmation: "SUSPENDER CONTA",
    description:
      "Ação punitiva/operacional temporária: bloqueia login e encerra sessões sem apagar dados.",
    icon: Lock,
    schema: accountSuspendSchema,
    successMessage: "Conta suspensa e sessões encerradas.",
    title: "Suspender conta",
  },
};

export const AccountStatusActionForm = ({
  account,
  id,
  kind,
  onDeleted,
}: {
  account: AdminPatientAccount;
  id: string;
  kind: AccountStatusActionKind;
  onDeleted?: () => void;
}) => {
  const config = ACCOUNT_STATUS_ACTION_CONFIG[kind];
  const suspendMutation = useAdminPatientSuspendAccount(id);
  const deactivateMutation = useAdminPatientDeactivateAccount(id);
  const deleteMutation = useAdminPatientDeleteAccount(id);
  const mutation =
    kind === "suspend"
      ? suspendMutation
      : kind === "deactivate"
        ? deactivateMutation
        : deleteMutation;
  const form = useForm<AccountStatusActionFormValues>({
    defaultValues: {
      confirmation: "",
      reason: "",
      suspension_duration_days: "30",
    },
    mode: "onSubmit",
    resolver: zodResolver(config.schema),
  });
  const allowed = config.canRun(account);
  const disabled = !allowed || mutation.isPending;
  const Icon = config.icon;

  const onSubmit: SubmitHandler<AccountStatusActionFormValues> = async (values) => {
    try {
      const payload = {
        confirmation: values.confirmation.trim().toUpperCase(),
        reason: values.reason.trim(),
      };

      if (kind === "suspend") {
        await suspendMutation.mutateAsync({
          ...payload,
          suspension_duration_days: Number(values.suspension_duration_days),
        });
      } else if (kind === "deactivate") {
        await deactivateMutation.mutateAsync(payload);
      } else {
        await deleteMutation.mutateAsync(payload);
      }

      form.reset();
      toast.success(config.successMessage);
      if (kind === "delete") onDeleted?.();
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  return (
    <div className="rounded-3xl border border-border bg-surface p-4">
      <div className="flex items-start gap-3">
        <IconCircle icon={Icon} />
        <div>
          <h3 className="text-base font-bold text-foreground">{config.title}</h3>
          <p className="mt-1 text-sm font-bold leading-6 text-muted">{config.description}</p>
        </div>
      </div>

      {!allowed ? (
        <div className="mt-4">
          <AccountUnavailableNotice>
            {kind === "delete" && account.delete_blocked_reason
              ? account.delete_blocked_reason
              : config.blockedMessage}
          </AccountUnavailableNotice>
        </div>
      ) : null}

      <FormProvider {...form}>
        <form className="mt-4 grid gap-3" noValidate onSubmit={form.handleSubmit(onSubmit)}>
          {kind === "suspend" ? (
            <SelectController<AccountStatusActionFormValues>
              disabled={disabled}
              label="Prazo da suspensão"
              name="suspension_duration_days"
              options={SUSPENSION_DURATION_OPTIONS}
              required
            />
          ) : null}
          <TextareaController<AccountStatusActionFormValues>
            disabled={disabled}
            label="Motivo/observação interna"
            name="reason"
            placeholder="Registre a justificativa administrativa da ação."
            required
            rows={3}
          />
          <InputController<AccountStatusActionFormValues>
            autoComplete="off"
            disabled={disabled}
            label="Confirmação forte"
            name="confirmation"
            placeholder={config.confirmation}
            required
          />
          <button
            className={cn(
              "inline-flex h-12 w-full items-center justify-center gap-2 rounded-control text-sm font-black transition disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-muted disabled:text-muted",
              config.buttonClassName,
            )}
            disabled={disabled}
            type="submit"
          >
            {mutation.isPending ? (
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
            ) : (
              <Icon aria-hidden className="h-4 w-4" />
            )}
            {config.buttonLabel}
          </button>
        </form>
      </FormProvider>
    </div>
  );
};
