"use client";

import { ArrowRight, ChevronDown, Loader2, Mail, ShieldCheck, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/api/callers/auth";
import { DividerWithLabel } from "@/components/ui/divider-with-label";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Logo } from "@/components/ui/logo";
import { useUserSet } from "@/hooks/user-set";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { fingerprint } from "@/utils/fingerprint";
import { type RegisterPatientForm, TERMS_VERSION, useForm } from "./use-form";

const resolveRegisterErrorMessage = (error: unknown) => {
  const message = error instanceof Error ? error.message : "";
  const normalized = message.toLowerCase();

  if (normalized.includes("email") && normalized.includes("cadastrad")) {
    return "Este e-mail já está cadastrado. Faça login ou use outro e-mail.";
  }

  if (normalized.includes("senha") || normalized.includes("password")) {
    return "A senha precisa ter no mínimo 10 caracteres.";
  }

  if (normalized.includes("termos") || normalized.includes("terms")) {
    return "Aceite os termos para continuar.";
  }

  if (normalized.includes("device") || normalized.includes("dispositivo")) {
    return "Não foi possível identificar seu dispositivo. Atualize a página e tente novamente.";
  }

  return message || "Não foi possível criar sua conta agora. Tente novamente.";
};

const PATIENT_EMAIL_FORM_ID = "patient-email-register-form";

export const RegisterPatientLogic = () => {
  const { setter } = useUserSet("/auth/verify-email");
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? searchParams.get("callbackUrl");
  const { Form, formProps, hook } = useForm();
  const [apiError, setApiError] = useState<string | null>(null);
  const [googlePending, setGooglePending] = useState(false);
  const [emailFormOpen, setEmailFormOpen] = useState(false);

  const { registerPatient } = useAuth({
    callbacks: {
      registerPatient: {
        onSuccess: (data) => {
          setApiError(null);
          toast.success("Conta criada com sucesso");
          setter(data);
        },
        onError: (error) => {
          setApiError(resolveRegisterErrorMessage(error));
        },
      },
    },
  });

  const isPending = registerPatient.isPending || googlePending;

  const handleSubmit = (data: RegisterPatientForm) => {
    setApiError(null);
    registerPatient.mutate({
      name: data.name.trim(),
      email: data.email,
      password: data.password,
      password_confirm: data.password_confirm,
      role: "paciente",
      terms_accepted: true,
      terms_version: TERMS_VERSION,
    });
  };

  const handleGoogleRegister = async () => {
    try {
      setGooglePending(true);
      setApiError(null);
      hook.setValue("terms_accepted", true, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });

      const currentDeviceId = await fingerprint();
      const loginUrl =
        process.env.NEXT_PUBLIC_LOGIN_URL ||
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"}/api/public/google/login`;
      const query = new URLSearchParams({
        role: "paciente",
        terms_accepted: "true",
        terms_version: TERMS_VERSION,
      });
      if (redirectTo) {
        query.set("redirectTo", redirectTo);
      }

      window.location.href = `${loginUrl}/${currentDeviceId}?${query.toString()}`;
    } catch {
      setGooglePending(false);
      setApiError("Não foi possível iniciar o cadastro com Google. Tente novamente.");
    }
  };

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col px-4 py-5 sm:py-6">
        <section className="overflow-hidden rounded-[var(--lectum-auth-radius)] border border-border bg-surface shadow-[var(--lectum-shadow)]">
          <div className="border-b border-border px-5 py-6 text-center sm:px-6">
            <Logo className="mx-auto w-[136px] sm:w-[148px]" priority />
          </div>

          <div className="px-5 pb-6 pt-6 sm:px-6">
            <h1 className="text-center text-[1.45rem] font-extrabold leading-tight text-foreground">
              Cadastre-se
            </h1>
            <p className="mx-auto mt-2 max-w-[300px] text-center text-sm leading-6 text-muted">
              Encontre psicólogos e salve favoritos.
            </p>

            <Button
              className="mt-5 h-12 w-full rounded-[var(--lectum-control-radius)] text-sm"
              disabled={isPending}
              onClick={handleGoogleRegister}
              type="button"
              variant="outline"
            >
              {googlePending ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
              ) : (
                <Image src="/svg/google.svg" alt="Google" width={22} height={22} />
              )}
              {googlePending ? "Conectando com Google" : "Criar conta com Google"}
            </Button>

            <p className="mx-auto mt-2 max-w-[280px] text-center text-[10px] leading-4 text-subtle">
              Ao continuar, você aceita os Termos e a Privacidade.
            </p>

            {apiError ? (
              <InlineAlert className="mt-4" variant="error">
                {apiError}
              </InlineAlert>
            ) : null}

            <DividerWithLabel className="my-5">ou</DividerWithLabel>

            <button
              aria-controls={PATIENT_EMAIL_FORM_ID}
              aria-expanded={emailFormOpen}
              className="flex h-12 w-full items-center justify-between rounded-[var(--lectum-control-radius)] border border-border bg-surface-muted px-4 text-left text-sm font-semibold text-foreground transition hover:border-primary/40 hover:bg-primary-soft/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isPending}
              onClick={() => setEmailFormOpen((open) => !open)}
              type="button"
            >
              <span className="inline-flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" aria-hidden="true" />
                Cadastrar com e-mail
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted transition-transform",
                  emailFormOpen && "rotate-180",
                )}
                aria-hidden="true"
              />
            </button>

            <div id={PATIENT_EMAIL_FORM_ID}>
              {emailFormOpen ? (
                <Form
                  className="mt-4 grid gap-2"
                  {...formProps}
                  onSubmit={hook.handleSubmit(handleSubmit)}
                >
                  <Button
                    className="mt-2 h-12 w-full rounded-[var(--lectum-control-radius)] text-sm"
                    disabled={isPending}
                    type="submit"
                  >
                    {registerPatient.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : null}
                    {registerPatient.isPending ? "Criando conta" : "Criar conta com e-mail"}
                    {!registerPatient.isPending ? (
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    ) : null}
                  </Button>
                </Form>
              ) : null}
            </div>
          </div>

          <div className="border-t border-border bg-surface-muted px-5 py-4 text-center text-[13px] leading-5 text-muted sm:px-6 sm:text-sm">
            Já possui uma conta?{" "}
            <Link
              className="font-semibold text-primary hover:text-primary-hover"
              href={
                redirectTo
                  ? `/auth/login?redirectTo=${encodeURIComponent(redirectTo)}`
                  : "/auth/login"
              }
            >
              Fazer login
            </Link>
          </div>
        </section>

        <div className="grid gap-3 pt-4 text-center text-[11px] font-medium leading-5 text-subtle sm:text-xs">
          <div className="grid grid-cols-2 gap-3">
            <span className="inline-flex items-center justify-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Seguro e Criptografado
            </span>
            <span className="inline-flex items-center justify-center gap-1.5">
              <Zap className="h-3.5 w-3.5" aria-hidden="true" />
              Configuração em 2 minutos
            </span>
          </div>
          <span className="inline-flex items-center justify-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Perfil paciente protegido
          </span>
        </div>
      </div>
    </main>
  );
};
