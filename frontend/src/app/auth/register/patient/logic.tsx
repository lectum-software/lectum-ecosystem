"use client";

import { CheckCircle2, Loader2, ShieldCheck, UserPlus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/api/callers/auth";
import { AuthCard } from "@/components/ui/auth-card";
import { DividerWithLabel } from "@/components/ui/divider-with-label";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Logo } from "@/components/ui/logo";
import { useUserSet } from "@/hooks/user-set";
import { Button } from "@/registry/new-york-v4/ui/button";
import { AuthTemplate } from "@/templates/auth";
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
    const hasAcceptedTerms = hook.getValues("terms_accepted");

    if (!hasAcceptedTerms) {
      hook.setError("terms_accepted", {
        type: "manual",
        message: "Aceite os termos para continuar",
      });
      return;
    }

    try {
      setGooglePending(true);
      setApiError(null);

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
    <AuthTemplate>
      <AuthCard
        footer={
          <span>
            Já possui uma conta?{" "}
            <Link
              className="font-semibold text-primary hover:text-primary-hover"
              href="/auth/login"
            >
              Fazer login
            </Link>
          </span>
        }
      >
        <div className="mb-7 grid justify-items-center text-center">
          <Logo className="w-[200px]" priority />
          <h1 className="mt-8 text-3xl font-bold leading-tight text-foreground">Cadastre-se</h1>
          <p className="mt-2 max-w-[300px] text-sm leading-6 text-muted">
            Crie sua conta gratuita de paciente para acessar a Lectum.
          </p>
        </div>

        <Button
          className="w-full"
          disabled={isPending}
          onClick={handleGoogleRegister}
          type="button"
          variant="outline"
        >
          {googlePending ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
          ) : (
            <Image src="/svg/google.svg" alt="Google" width={30} height={30} />
          )}
          {googlePending ? "Conectando com Google" : "Continuar com Google"}
        </Button>

        <DividerWithLabel className="my-7">ou e-mail</DividerWithLabel>

        <Form className="grid gap-2" {...formProps} onSubmit={hook.handleSubmit(handleSubmit)}>
          {apiError ? <InlineAlert variant="error">{apiError}</InlineAlert> : null}

          <div className="rounded-[var(--lectum-card-radius)] border border-border bg-primary-soft/50 p-4 text-sm leading-6 text-muted">
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
              Seguro e criptografado
            </div>
            <p className="mt-2">
              Após o cadastro, enviaremos um código para confirmar seu e-mail antes do onboarding.
            </p>
          </div>

          <Button className="mt-2 w-full" disabled={isPending} type="submit">
            {registerPatient.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <UserPlus className="h-4 w-4" aria-hidden="true" />
            )}
            {registerPatient.isPending ? "Criando conta" : "Criar conta gratuita"}
          </Button>
        </Form>

        <div className="mt-8 grid gap-3 text-center text-xs text-subtle sm:grid-cols-3">
          <span className="inline-flex items-center justify-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Seguro
          </span>
          <span className="inline-flex items-center justify-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Configuração rápida
          </span>
          <span className="inline-flex items-center justify-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Perfil paciente
          </span>
        </div>
      </AuthCard>
    </AuthTemplate>
  );
};
