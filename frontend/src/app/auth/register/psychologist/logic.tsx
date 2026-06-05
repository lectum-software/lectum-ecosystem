"use client";

import { ArrowRight, CheckCircle2, Loader2, ShieldCheck, UserPlus } from "lucide-react";
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

      window.location.href = `${loginUrl}/${currentDeviceId}?${query.toString()}`;
    } catch {
      setGooglePending(false);
      setApiError("Não foi possível iniciar o cadastro com Google. Tente novamente.");
    }
  };

  return (
    <AuthTemplate>
      <AuthCard
        className="max-w-[410px]"
        footer={
          <span>
            Já possui uma conta?{" "}
            <Link
              className="font-semibold text-primary hover:text-primary-hover"
              href="/auth/login?role=psicologo"
            >
              Fazer login
            </Link>
          </span>
        }
      >
        <div className="mb-7 border-b border-border pb-6">
          <div className="flex items-center justify-between gap-3">
            <Logo className="w-[170px]" priority />
            <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
              Para Psicólogos
            </span>
          </div>
        </div>

        <div className="mb-7 grid justify-items-center text-center">
          <h1 className="max-w-[310px] text-3xl font-bold leading-tight text-foreground">
            Cadastre-se para converter pacientes para o WhatsApp
          </h1>
          <p className="mt-4 max-w-[320px] text-sm leading-6 text-muted">
            Pessoas buscam psicólogos na internet todos os dias. Crie sua conta profissional e
            inicie a validação do seu CRP sem publicar seu perfil automaticamente.
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

        <p className="mt-3 text-center text-xs leading-5 text-muted">
          Ao continuar com Google, você aceita os termos profissionais, os termos de uso e a
          política de privacidade. O texto legal final ainda será revisado nas próximas etapas de
          LGPD.
        </p>

        <DividerWithLabel className="my-7">ou e-mail</DividerWithLabel>

        <Form className="grid gap-2" {...formProps} onSubmit={hook.handleSubmit(handleSubmit)}>
          {apiError ? <InlineAlert variant="error">{apiError}</InlineAlert> : null}

          <InlineAlert variant="success" title="Perfil protegido">
            Seu perfil profissional nasce pendente e não fica público antes da aprovação de CRP/CFP.
          </InlineAlert>

          <Button className="mt-2 w-full" disabled={isPending} type="submit">
            {registerPsychologist.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <UserPlus className="h-4 w-4" aria-hidden="true" />
            )}
            {registerPsychologist.isPending ? "Criando conta" : "Criar conta e escolher plano"}
            {!registerPsychologist.isPending ? (
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            ) : null}
          </Button>
        </Form>

        <div className="mt-8 grid gap-3 text-center text-xs text-subtle sm:grid-cols-3">
          <span className="inline-flex items-center justify-center gap-1.5">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Seguro e criptografado
          </span>
          <span className="inline-flex items-center justify-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Configuração rápida
          </span>
          <span className="inline-flex items-center justify-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Sem publicação automática
          </span>
        </div>
      </AuthCard>
    </AuthTemplate>
  );
};
