"use client";

import { ArrowRight, Loader2, LogInIcon } from "lucide-react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
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
import { type LoginForm, useForm } from "./use-form";

const allowedRoles = ["paciente", "psicologo"] as const;

const resolveErrorMessage = (error: unknown) => {
  return error instanceof Error ? error.message : "Não foi possível entrar. Tente novamente.";
};

export const AuthLogic = () => {
  const { setter } = useUserSet("/dashboard");
  const { Form, formProps, hook } = useForm();
  const searchParams = useSearchParams();
  const [apiError, setApiError] = useState<string | null>(null);
  const [googlePending, setGooglePending] = useState(false);

  const { login } = useAuth({
    callbacks: {
      login: {
        onSuccess: (data) => {
          setApiError(null);
          toast.success("Login realizado com sucesso");
          setter(data);
        },
        onError: (error) => {
          setApiError(resolveErrorMessage(error));
        },
      },
    },
  });

  const handleSubmit = (data: LoginForm) => {
    setApiError(null);
    login.mutate(data);
  };

  const handleGoogleLogin = async () => {
    try {
      setGooglePending(true);
      setApiError(null);

      const currentDeviceId = await fingerprint();
      const loginUrl =
        process.env.NEXT_PUBLIC_LOGIN_URL ||
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"}/api/public/google/login`;

      const role = searchParams.get("role");
      const query = new URLSearchParams();

      if (role && allowedRoles.includes(role as (typeof allowedRoles)[number])) {
        query.set("role", role);
      }

      const queryString = query.toString();
      window.location.href = `${loginUrl}/${currentDeviceId}${
        queryString ? `?${queryString}` : ""
      }`;
    } catch {
      setGooglePending(false);
      setApiError("Não foi possível iniciar o login com Google. Tente novamente.");
    }
  };

  return (
    <AuthTemplate>
      <AuthCard
        footer={
          <span>
            Não tem uma conta?{" "}
            <a
              className="font-semibold text-primary hover:text-primary-hover"
              href="/auth/profile-selection"
            >
              Cadastre-se
            </a>
          </span>
        }
      >
        <div className="mb-8 grid justify-items-center text-center">
          <Logo className="w-[200px]" priority />
          <h1 className="mt-8 text-3xl font-bold leading-tight text-foreground">
            Bem-vindo de volta
          </h1>
          <p className="mt-2 text-base text-muted">Faça o login na sua conta</p>
        </div>

        <Form {...formProps} className="grid gap-2" onSubmit={hook.handleSubmit(handleSubmit)}>
          {apiError ? <InlineAlert variant="error">{apiError}</InlineAlert> : null}

          <a
            className="-mt-2 justify-self-end text-sm font-medium text-primary hover:text-primary-hover"
            href="/auth/recovery"
          >
            Esqueci minha senha
          </a>

          <Button className="mt-1 w-full" disabled={login.isPending || googlePending} type="submit">
            {login.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <LogInIcon className="h-4 w-4" aria-hidden="true" />
            )}
            {login.isPending ? "Entrando" : "Entrar"}
            {!login.isPending ? <ArrowRight className="h-4 w-4" aria-hidden="true" /> : null}
          </Button>
        </Form>

        <DividerWithLabel className="my-8">ou</DividerWithLabel>

        <Button
          className="w-full"
          disabled={login.isPending || googlePending}
          onClick={handleGoogleLogin}
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
      </AuthCard>
    </AuthTemplate>
  );
};
