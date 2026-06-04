"use client";

import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Loader2,
  MailCheck,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/api/callers/auth";
import type { user } from "@/api/generator/types";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { useAppSelector } from "@/hooks/redux";
import { useUserSet } from "@/hooks/user-set";
import { Button } from "@/registry/new-york-v4/ui/button";
import { useForm, type VerifyEmailForm } from "./use-form";

type ApiErrorData = {
  error?: string;
  message?: string;
  status?: number;
};

type ApiError = Error & {
  data?: ApiErrorData;
};

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

const getRawErrorMessage = (error: unknown) => {
  const apiError = error as ApiError;

  return (
    apiError?.data?.error ||
    apiError?.data?.message ||
    (error instanceof Error ? error.message : "")
  );
};

const resolveVerificationErrorMessage = (error: unknown) => {
  const rawMessage = getRawErrorMessage(error);
  const normalized = rawMessage.toLowerCase();

  if (normalized.includes("expir") || normalized.includes("expired")) {
    return "O código expirou. Solicite um novo código para continuar.";
  }

  if (normalized.includes("incorret") || normalized.includes("incorrect")) {
    return "Código incorreto. Confira os 6 dígitos enviados para o seu e-mail.";
  }

  if (normalized.includes("confirm") || normalized.includes("utilizado")) {
    return "Este e-mail já foi confirmado. Continue para acessar sua conta.";
  }

  if (normalized.includes("device") || (error as ApiError)?.data?.status === 403) {
    return "Não foi possível identificar seu dispositivo. Atualize a página e tente novamente.";
  }

  return rawMessage || "Não foi possível verificar o código agora. Tente novamente.";
};

const resolveSendCodeErrorMessage = (error: unknown) => {
  const rawMessage = getRawErrorMessage(error);
  const normalized = rawMessage.toLowerCase();

  if (normalized.includes("confirm") || normalized.includes("confirmed")) {
    return "Este e-mail já foi confirmado. Continue para acessar sua conta.";
  }

  if (normalized.includes("auth") || normalized.includes("sess")) {
    return "Sua sessão precisa estar ativa para reenviar o código. Faça login novamente.";
  }

  if (normalized.includes("device") || (error as ApiError)?.data?.status === 403) {
    return "Não foi possível identificar seu dispositivo. Atualize a página e tente novamente.";
  }

  return rawMessage || "Não foi possível enviar o código agora. Tente novamente.";
};

const isAlreadyConfirmedError = (error: unknown) => {
  const normalized = getRawErrorMessage(error).toLowerCase();

  return normalized.includes("confirm") || normalized.includes("confirmed");
};

const maskEmail = (email?: string | null) => {
  if (!email) return "seu e-mail cadastrado";

  const [local, domain] = email.split("@");
  if (!local || !domain) return email;

  const visible = local.slice(0, Math.min(2, local.length));
  const hiddenLength = Math.max(local.length - visible.length, 3);

  return `${visible}${"•".repeat(hiddenLength)}@${domain}`;
};

const formatCooldown = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
};

export const VerifyEmailLogic = () => {
  const { setter } = useUserSet("/dashboard");
  const { Form, formProps, hook } = useForm();
  const storedUser = useAppSelector((state) => state.user);
  const [apiError, setApiError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [codeSent, setCodeSent] = useState(false);
  const [alreadyConfirmed, setAlreadyConfirmed] = useState(false);
  const initialRequestSent = useRef(false);
  const sendMode = useRef<"initial" | "manual">("initial");

  const code = hook.watch("code") || "";

  const { hidrate, sendConfirmCode, verifyCode } = useAuth({
    enableHidrate: true,
    callbacks: {
      sendConfirmCode: {
        onSuccess: () => {
          setApiError(null);
          setCodeSent(true);
          setCooldown(RESEND_COOLDOWN_SECONDS);

          if (sendMode.current === "manual") {
            toast.success("Código reenviado para o seu e-mail");
          }
        },
        onError: (error) => {
          const message = resolveSendCodeErrorMessage(error);
          setApiError(message);

          if (isAlreadyConfirmedError(error)) {
            setAlreadyConfirmed(true);
          }
        },
      },
      verifyCode: {
        onSuccess: (data) => {
          setApiError(null);
          toast.success("E-mail confirmado com sucesso");
          setter(data);
        },
        onError: (error) => {
          const message = resolveVerificationErrorMessage(error);
          setApiError(message);

          if (isAlreadyConfirmedError(error)) {
            setAlreadyConfirmed(true);
          }
        },
      },
    },
  });

  const hydratedUser = hidrate.data;
  const currentUser = useMemo<Partial<user> | null>(
    () => hydratedUser || storedUser || null,
    [hydratedUser, storedUser],
  );
  const continueHref = currentUser?.role === "paciente" ? "/patient/welcome" : "/dashboard";
  const currentEmail = maskEmail(currentUser?.email);
  const isConfirmed = Boolean(currentUser?.confirmed) || alreadyConfirmed;
  const isHydrating = hidrate.isLoading || hidrate.isPending;
  const canSubmit = code.length === CODE_LENGTH && !verifyCode.isPending && !isConfirmed;
  const canResend =
    cooldown === 0 && !sendConfirmCode.isPending && !verifyCode.isPending && !isConfirmed;

  const requestCode = useCallback(
    (mode: "initial" | "manual") => {
      sendMode.current = mode;
      setApiError(null);
      sendConfirmCode.mutate();
    },
    [sendConfirmCode],
  );

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = window.setInterval(() => {
      setCooldown((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    if (!hydratedUser?.confirmed) return;

    setter(hydratedUser);
  }, [hydratedUser, setter]);

  useEffect(() => {
    if (initialRequestSent.current || isHydrating || isConfirmed || hidrate.isError) {
      return;
    }

    initialRequestSent.current = true;
    requestCode("initial");
  }, [hidrate.isError, isConfirmed, isHydrating, requestCode]);

  const handleSubmit = (data: VerifyEmailForm) => {
    setApiError(null);
    verifyCode.mutate({ code: data.code });
  };

  const handleResend = () => {
    if (!canResend) return;

    requestCode("manual");
  };

  if (isConfirmed) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <header className="border-b border-border bg-surface px-4 py-4 text-center">
          <h1 className="text-xl font-bold">Confirmação de E-mail</h1>
        </header>

        <section className="mx-auto flex min-h-[calc(100vh-57px)] w-full max-w-[390px] flex-col justify-center px-4 py-10">
          <div className="rounded-[var(--lectum-card-radius)] border border-border bg-surface px-6 py-10 text-center shadow-[var(--lectum-shadow-soft)]">
            <span className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-success/10 text-success">
              <CheckCircle2 className="h-12 w-12" aria-hidden="true" />
            </span>
            <h2 className="mt-8 text-2xl font-bold">E-mail confirmado</h2>
            <p className="mt-4 text-base leading-7 text-muted">
              Sua conta já está verificada. Continue para acessar a Lectum.
            </p>
            <Button asChild className="mt-8 w-full">
              <Link href={continueHref}>
                Continuar
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-surface px-4 py-4 text-center">
        <h1 className="text-xl font-bold">Confirmação de E-mail</h1>
      </header>

      <section className="mx-auto flex min-h-[calc(100vh-57px)] w-full max-w-[390px] flex-col px-4 py-10">
        <div className="grid justify-items-center text-center">
          <div className="relative grid h-32 w-32 place-items-center rounded-full bg-primary-soft text-primary shadow-[var(--lectum-shadow-soft)]">
            <span className="grid h-20 w-20 place-items-center rounded-full bg-surface shadow-[var(--lectum-shadow-soft)]">
              <MailCheck className="h-10 w-10" aria-hidden="true" />
            </span>
            <span className="absolute -right-1 top-4 grid h-10 w-10 place-items-center rounded-full bg-primary text-white shadow-[var(--lectum-shadow-soft)]">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
          </div>

          <h2 className="mt-10 text-2xl font-bold leading-tight">Verifique seu e-mail</h2>
          <p className="mt-4 max-w-[330px] text-base leading-7 text-muted">
            Enviamos um código de {CODE_LENGTH} dígitos para{" "}
            <strong className="font-semibold text-foreground">{currentEmail}</strong>. Digite o
            código para confirmar sua conta.
          </p>
        </div>

        <div className="mt-8" aria-live="polite">
          {isHydrating ? <LoadingState label="Atualizando sua sessão" /> : null}
          {!isHydrating && sendConfirmCode.isPending ? (
            <LoadingState label="Enviando código de confirmação" />
          ) : null}
        </div>

        {codeSent && !apiError ? (
          <InlineAlert className="mt-6" variant="success">
            Código enviado. Confira sua caixa de entrada e a pasta de spam.
          </InlineAlert>
        ) : null}

        <Form className="mt-8 grid gap-3" {...formProps} onSubmit={hook.handleSubmit(handleSubmit)}>
          {apiError ? (
            <InlineAlert variant="error" title="Não foi possível confirmar o e-mail">
              {apiError}
            </InlineAlert>
          ) : null}

          <Button className="mt-2 w-full" disabled={!canSubmit} type="submit">
            {verifyCode.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            )}
            {verifyCode.isPending ? "Verificando" : "Verificar"}
          </Button>
        </Form>

        <div className="mt-8 rounded-[var(--lectum-card-radius)] border border-border bg-surface p-4 text-center text-sm text-muted shadow-[var(--lectum-shadow-soft)]">
          <div className="flex items-center justify-center gap-2">
            <Clock3 className="h-4 w-4 text-primary" aria-hidden="true" />
            <span>Não recebeu o código?</span>
          </div>

          <button
            className="mt-3 inline-flex items-center justify-center gap-2 font-semibold text-primary hover:text-primary-hover disabled:text-subtle"
            disabled={!canResend}
            onClick={handleResend}
            type="button"
          >
            {sendConfirmCode.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
            )}
            {cooldown > 0
              ? `Reenviar em ${formatCooldown(cooldown)}`
              : sendConfirmCode.isPending
                ? "Reenviando código"
                : "Reenviar código"}
          </button>
        </div>
      </section>
    </main>
  );
};
