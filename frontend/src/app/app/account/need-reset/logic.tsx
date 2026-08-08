"use client";

import { CheckCircle2, Circle, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/api/callers/auth";
import { getSafeApiErrorMessage } from "@/api/errors";
import { InlineAlert } from "@/components/ui/inline-alert";
import { useAppDispatch } from "@/hooks/redux";
import { Button } from "@/registry/new-york-v4/ui/button";
import * as userActions from "@/store/modules/user/actions";
import { PrivateTemplate } from "@/templates/private";
import { resolveAuthRedirect } from "@/utils/auth-redirect";
import { normalizeSafeInternalRedirect } from "@/utils/safe-redirect";
import { type NeedResetPasswordForm, useNeedResetPasswordForm } from "./use-form";

type ApiErrorData = {
  error?: string;
  message?: string;
  status?: number;
};

type ApiError = Error & {
  data?: ApiErrorData;
};

const NEED_RESET_PATH = "/app/conta/redefinir-senha";

const resolveNeedResetErrorMessage = (error: unknown) => {
  const apiError = error as ApiError;
  const rawMessage = getSafeApiErrorMessage(error, "");
  const normalized = rawMessage.toLowerCase();

  if (normalized.includes("não precisa") || normalized.includes("not_need_reset")) {
    return "Sua conta não possui troca obrigatória pendente. Atualize a página para continuar.";
  }

  if (normalized.includes("senha") && normalized.includes("iguais")) {
    return "As senhas precisam ser iguais.";
  }

  if (normalized.includes("device") || apiError?.data?.status === 403) {
    return "Não foi possível identificar sua sessão. Faça login novamente e tente outra vez.";
  }

  if (normalized.includes("network") || normalized.includes("conex")) {
    return "Não foi possível conectar à API agora. Tente novamente em instantes.";
  }

  return rawMessage || "Não foi possível trocar sua senha agora. Tente novamente.";
};

const passwordRequirements = (password: string) => [
  {
    label: "Mínimo 10 caracteres",
    valid: password.length >= 10,
  },
];

const normalizeSafeRedirect = (value: string | null) => {
  const safeRedirect = normalizeSafeInternalRedirect(value);
  if (!safeRedirect) return null;

  const normalized = safeRedirect.replace(/\/+$/, "") || "/";
  if (normalized === NEED_RESET_PATH || normalized.startsWith(`${NEED_RESET_PATH}/`)) return null;

  return safeRedirect;
};

export const NeedResetPasswordLogic = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const { Form, formProps, hook } = useNeedResetPasswordForm();
  const password = hook.watch("password") || "";
  const requirements = useMemo(() => passwordRequirements(password), [password]);
  const [apiError, setApiError] = useState<string | null>(null);

  const { needResetPassword } = useAuth({
    callbacks: {
      needResetPassword: {
        onSuccess: (data) => {
          setApiError(null);
          dispatch(userActions.create(data));
          hook.reset({ password: "", password_confirm: "" });
          toast.success("Senha atualizada com sucesso");

          const redirectTo = normalizeSafeRedirect(searchParams.get("redirectTo"));
          const target = resolveAuthRedirect(data, redirectTo, "/psicologos");
          router.replace(target || "/psicologos");
        },
        onError: (error) => {
          setApiError(resolveNeedResetErrorMessage(error));
        },
      },
    },
  });

  const handleSubmit = (data: NeedResetPasswordForm) => {
    setApiError(null);
    needResetPassword.mutate(data);
  };

  return (
    <PrivateTemplate
      contentClassName="bg-background px-0 py-0"
      desktopSidebarDefaultCollapsed
      showMobileNavigation={false}
    >
      <section className="mx-auto min-h-screen w-full max-w-[430px] bg-background px-5 py-5 sm:max-w-xl md:py-8">
        <header className="mb-4 grid h-14 place-items-center rounded-[var(--lectum-card-radius)] border border-border bg-surface px-4 shadow-[var(--lectum-shadow-soft)]">
          <p className="text-center text-base font-extrabold tracking-[-0.02em] text-foreground">
            Troca de senha obrigatória
          </p>
        </header>

        <div className="grid justify-items-center rounded-[var(--lectum-card-radius)] border border-border bg-surface px-5 py-7 text-center shadow-[var(--lectum-shadow-soft)]">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-primary-soft text-primary">
            <KeyRound className="h-8 w-8" aria-hidden="true" />
          </span>
          <h1 className="mt-5 text-xl font-extrabold leading-tight text-foreground">
            Crie uma senha definitiva
          </h1>
          <p className="mt-3 max-w-[330px] text-sm leading-6 text-muted">
            Um administrador definiu uma senha temporária para suporte. Para continuar usando a
            Lectum, defina uma nova senha que só você conhece.
          </p>
        </div>

        <Form className="mt-7 grid gap-3" {...formProps} onSubmit={hook.handleSubmit(handleSubmit)}>
          {apiError ? (
            <InlineAlert title="Não foi possível trocar a senha" variant="error">
              {apiError}
            </InlineAlert>
          ) : null}

          <div className="rounded-[var(--lectum-card-radius)] border border-border bg-surface p-4 shadow-[var(--lectum-shadow-soft)]">
            <div className="flex items-center gap-2 border-b border-border pb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
              <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
              Requisitos de segurança
            </div>
            <ul className="mt-3 grid gap-2.5 text-[13px] leading-5 text-muted">
              {requirements.map((requirement) => {
                const Icon = requirement.valid ? CheckCircle2 : Circle;

                return (
                  <li className="flex items-center gap-3" key={requirement.label}>
                    <Icon
                      className={requirement.valid ? "h-4 w-4 text-primary" : "h-4 w-4 text-subtle"}
                      aria-hidden="true"
                    />
                    <span className={requirement.valid ? "text-foreground" : undefined}>
                      {requirement.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <Button
            className="mt-2 h-14 rounded-full text-base"
            disabled={needResetPassword.isPending}
            type="submit"
          >
            {needResetPassword.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : null}
            {needResetPassword.isPending ? "Salvando nova senha" : "Salvar nova senha"}
          </Button>

          <p className="px-4 text-center text-xs leading-5 text-muted">
            A senha temporária não será exibida novamente e não fica registrada no histórico.
          </p>
        </Form>
      </section>
    </PrivateTemplate>
  );
};
