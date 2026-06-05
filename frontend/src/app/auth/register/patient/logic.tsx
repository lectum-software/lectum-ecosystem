"use client";

import { ArrowRight, Loader2, ShieldCheck, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/api/callers/auth";
import { DividerWithLabel } from "@/components/ui/divider-with-label";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Logo } from "@/components/ui/logo";
import { useUserSet } from "@/hooks/user-set";
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
    return "A senha precisa ter no mínimo 12 caracteres, maiúscula, minúscula, número e caractere especial.";
  }

  if (normalized.includes("termos") || normalized.includes("terms")) {
    return "Aceite os termos para continuar.";
  }

  if (normalized.includes("device") || normalized.includes("dispositivo")) {
    return "Não foi possível identificar seu dispositivo. Atualize a página e tente novamente.";
  }

  return message || "Não foi possível criar sua conta agora. Tente novamente.";
};

export const RegisterPatientLogic = () => {
  const { setter } = useUserSet("/auth/verify-email");
  const { Form, formProps, hook } = useForm();
  const [apiError, setApiError] = useState<string | null>(null);
  const [googlePending, setGooglePending] = useState(false);

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

      window.location.href = `${loginUrl}/${currentDeviceId}?${query.toString()}`;
    } catch {
      setGooglePending(false);
      setApiError("Não foi possível iniciar o cadastro com Google. Tente novamente.");
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[390px] flex-col px-4 py-8">
        <section className="mt-5 overflow-hidden rounded-[var(--lectum-auth-radius)] border border-border bg-surface shadow-[var(--lectum-shadow)]">
          <div className="border-b border-border px-6 py-8 text-center">
            <Logo className="mx-auto w-[160px]" priority />
          </div>

          <div className="px-6 pb-7 pt-6">
            <h1 className="text-center text-2xl font-bold leading-tight text-foreground">
              Cadastre-se
            </h1>

            <Button
              className="mt-6 h-[52px] w-full rounded-[var(--lectum-control-radius)] text-base"
              disabled={isPending}
              onClick={handleGoogleRegister}
              type="button"
              variant="outline"
            >
              {googlePending ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
              ) : (
                <Image src="/svg/google.svg" alt="Google" width={26} height={26} />
              )}
              {googlePending ? "Conectando com Google" : "Continuar com Google"}
            </Button>

            <DividerWithLabel className="my-6">ou e-mail</DividerWithLabel>

            <Form className="grid gap-2" {...formProps} onSubmit={hook.handleSubmit(handleSubmit)}>
              {apiError ? <InlineAlert variant="error">{apiError}</InlineAlert> : null}

              <Button
                className="mt-3 h-14 w-full rounded-[18px] text-base"
                disabled={isPending}
                type="submit"
              >
                {registerPatient.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : null}
                {registerPatient.isPending ? "Criando conta" : "Criar conta gratuita"}
                {!registerPatient.isPending ? (
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                ) : null}
              </Button>
            </Form>
          </div>

          <div className="border-t border-border bg-surface-muted px-6 py-5 text-center text-sm text-muted">
            Já possui uma conta?{" "}
            <Link
              className="font-semibold text-primary hover:text-primary-hover"
              href="/auth/login"
            >
              Fazer login
            </Link>
          </div>
        </section>

        <div className="grid gap-5 pt-7 text-center text-xs font-medium text-subtle">
          <div className="grid grid-cols-2 gap-3">
            <span className="inline-flex items-center justify-center gap-1.5">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Seguro e Criptografado
            </span>
            <span className="inline-flex items-center justify-center gap-1.5">
              <Zap className="h-4 w-4" aria-hidden="true" />
              Configuração em 2 minutos
            </span>
          </div>
          <span className="inline-flex items-center justify-center gap-1.5">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Perfil paciente protegido
          </span>
        </div>
      </div>
    </main>
  );
};
