"use client";

import { CheckCircle2, Circle, KeyRound, Loader2, RotateCcw, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/api/callers/auth";
import { InlineAlert } from "@/components/ui/inline-alert";
import { useUserSet } from "@/hooks/user-set";
import { Button } from "@/registry/new-york-v4/ui/button";
import { type ResetPasswordForm, useForm } from "./use-form";

type ApiErrorData = {
  error?: string;
  message?: string;
  status?: number;
};

type ApiError = Error & {
  data?: ApiErrorData;
};

const resolveResetErrorMessage = (error: unknown) => {
  const apiError = error as ApiError;
  const rawMessage =
    apiError?.data?.error ||
    apiError?.data?.message ||
    (error instanceof Error ? error.message : "");
  const normalized = rawMessage.toLowerCase();

  if (normalized.includes("expirado") || normalized.includes("expired")) {
    return "O link de recuperação expirou. Solicite um novo link para redefinir sua senha.";
  }

  if (normalized.includes("incorreto") || normalized.includes("incorrect")) {
    return "O link de recuperação é inválido ou já foi utilizado. Solicite um novo link.";
  }

  if (normalized.includes("device") || apiError?.data?.status === 403) {
    return "Não foi possível identificar seu dispositivo. Atualize a página e tente novamente.";
  }

  return rawMessage || "Não foi possível redefinir sua senha agora. Tente novamente.";
};

const passwordRequirements = (password: string) => [
  {
    label: "Mínimo 10 caracteres",
    valid: password.length >= 10,
  },
];

export const ResetPasswordLogic = () => {
  const { setter } = useUserSet("/dashboard");
  const { Form, formProps, hook } = useForm();
  const searchParams = useSearchParams();
  const code = searchParams.get("code")?.trim() || "";
  const password = hook.watch("password") || "";
  const requirements = useMemo(() => passwordRequirements(password), [password]);
  const [apiError, setApiError] = useState<string | null>(null);

  const { resetPassword } = useAuth({
    callbacks: {
      resetPassword: {
        onSuccess: (data) => {
          setApiError(null);
          toast.success("Senha redefinida com sucesso");
          setter(data);
        },
        onError: (error) => {
          setApiError(resolveResetErrorMessage(error));
        },
      },
    },
  });

  const handleSubmit = (data: ResetPasswordForm) => {
    if (!code) {
      setApiError("Link de recuperação inválido ou incompleto. Solicite um novo link.");
      return;
    }

    setApiError(null);
    resetPassword.mutate({ code, body: data });
  };

  if (!code) {
    return (
      <main className="min-h-dvh bg-background text-foreground">
        <header className="border-b border-border bg-surface px-4 py-3 text-center">
          <h1 className="text-lg font-extrabold">Recuperar Senha</h1>
        </header>

        <section className="mx-auto flex min-h-[calc(100dvh-49px)] w-full max-w-[390px] flex-col justify-center px-4 py-6 text-center sm:py-8">
          <div className="rounded-[var(--lectum-card-radius)] border border-border bg-surface px-6 py-8 shadow-[var(--lectum-shadow-soft)]">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-danger/10 text-danger">
              <KeyRound className="h-8 w-8" aria-hidden="true" />
            </span>
            <h2 className="mt-6 text-xl font-extrabold">Link inválido</h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              O link de recuperação está incompleto ou não possui código. Solicite um novo e-mail
              para continuar.
            </p>
            <div className="mt-6 grid gap-3">
              <Button asChild className="w-full">
                <Link href="/auth/recovery">
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  Solicitar novo link
                </Link>
              </Button>
              <Button asChild className="w-full" variant="ghost">
                <Link href="/auth/login">Voltar para o Login</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border bg-surface px-4 py-3 text-center">
        <h1 className="text-lg font-extrabold">Recuperar Senha</h1>
      </header>

      <section className="mx-auto flex min-h-[calc(100dvh-49px)] w-full max-w-[390px] flex-col px-4 py-6 sm:py-8">
        <div className="grid justify-items-center text-center">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-primary-soft text-primary">
            <KeyRound className="h-8 w-8" aria-hidden="true" />
          </span>

          <h2 className="mt-6 text-xl font-extrabold leading-tight">Criar nova senha</h2>
          <p className="mt-3 max-w-[330px] text-sm leading-6 text-muted">
            Use pelo menos 10 caracteres. Frases com espaços também são aceitas.
          </p>
        </div>

        <Form
          className="mt-7 grid gap-2.5"
          {...formProps}
          onSubmit={hook.handleSubmit(handleSubmit)}
        >
          {apiError ? (
            <InlineAlert variant="error" title="Não foi possível redefinir a senha">
              {apiError}{" "}
              <Link className="font-semibold underline" href="/auth/recovery">
                Solicitar novo link.
              </Link>
            </InlineAlert>
          ) : null}

          <div className="rounded-[var(--lectum-card-radius)] border border-border bg-surface p-4">
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

          <Button className="mt-2 w-full" disabled={resetPassword.isPending} type="submit">
            {resetPassword.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : null}
            {resetPassword.isPending ? "Redefinindo senha" : "Redefinir Senha"}
          </Button>
        </Form>

        <div className="mt-7 border-t border-border pt-5 text-center text-[13px] text-muted sm:text-sm">
          Lembrou sua senha?{" "}
          <Link className="font-semibold text-primary hover:text-primary-hover" href="/auth/login">
            Voltar para o Login
          </Link>
        </div>
      </section>
    </main>
  );
};
