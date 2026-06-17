"use client";

import { ArrowRight, Loader2, ShieldCheck, Zap } from "lucide-react";
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
import { Button } from "@/registry/new-york-v4/ui/button";
import { fingerprint } from "@/utils/fingerprint";
import { type RegisterPsychologistForm, TERMS_VERSION, useForm } from "./use-form";

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
    return "Aceite os termos profissionais para continuar.";
  }

  if (normalized.includes("device") || normalized.includes("dispositivo")) {
    return "Não foi possível identificar seu dispositivo. Atualize a página e tente novamente.";
  }

  return message || "Não foi possível criar sua conta profissional agora. Tente novamente.";
};

export const RegisterPsychologistLogic = () => {
  const { setter } = useUserSet("/auth/verify-email");
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? searchParams.get("callbackUrl");
  const { Form, formProps, hook } = useForm();
  const [apiError, setApiError] = useState<string | null>(null);
  const [googlePending, setGooglePending] = useState(false);

  const { registerPsychologist } = useAuth({
    callbacks: {
      registerPsychologist: {
        onSuccess: (data) => {
          setApiError(null);
          toast.success("Conta profissional criada com sucesso");
          setter(data);
        },
        onError: (error) => {
          setApiError(resolveRegisterErrorMessage(error));
        },
      },
    },
  });

  const isPending = registerPsychologist.isPending || googlePending;

  const handleSubmit = (data: RegisterPsychologistForm) => {
    setApiError(null);
    registerPsychologist.mutate({
      name: data.name.trim(),
      email: data.email,
      password: data.password,
      password_confirm: data.password_confirm,
      role: "psicologo",
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
        role: "psicologo",
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
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[398px] flex-col px-5 py-9 sm:max-w-[420px] sm:py-12">
        <section className="overflow-hidden rounded-[var(--lectum-auth-radius)] border border-border bg-surface shadow-[var(--lectum-shadow)]">
          <div className="border-b border-border px-6 py-7">
            <div className="flex items-center justify-between gap-3">
              <Logo className="w-[158px]" priority />
              <span className="whitespace-nowrap rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary">
                Para Psicólogos
              </span>
            </div>
          </div>

          <div className="px-6 pb-7 pt-7">
            <div className="grid justify-items-center text-center">
              <h1 className="max-w-[310px] text-[25px] font-bold leading-[1.18] text-foreground sm:text-[26px]">
                Cadastre-se para converter pacientes para o WhatsApp
              </h1>
              <p className="mt-4 max-w-[310px] text-[15px] leading-6 text-muted">
                Todos os dias, milhares de pessoas buscam por psicólogos na internet e nós os
                conectamos ao seu WhatsApp. Comece agora, gratuitamente.
              </p>
            </div>

            <Button
              className="mt-8 h-[50px] w-full rounded-[var(--lectum-control-radius)] text-base"
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

            <DividerWithLabel className="my-7">ou e-mail</DividerWithLabel>

            <Form className="grid gap-1" {...formProps} onSubmit={hook.handleSubmit(handleSubmit)}>
              {apiError ? <InlineAlert variant="error">{apiError}</InlineAlert> : null}

              <Button
                className="mt-3 h-14 w-full rounded-[18px] text-base"
                disabled={isPending}
                type="submit"
              >
                {registerPsychologist.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : null}
                {registerPsychologist.isPending ? "Criando conta" : "Criar conta gratuita"}
                {!registerPsychologist.isPending ? (
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                ) : null}
              </Button>
            </Form>
          </div>

          <div className="border-t border-border bg-surface-muted px-6 py-5 text-center text-sm text-muted">
            Já possui uma conta?{" "}
            <Link
              className="font-semibold text-primary hover:text-primary-hover"
              href={
                redirectTo
                  ? `/auth/login?role=psicologo&redirectTo=${encodeURIComponent(redirectTo)}`
                  : "/auth/login?role=psicologo"
              }
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
            Perfil protegido até validação profissional
          </span>
        </div>
      </div>
    </main>
  );
};
