"use client";

import { Loader2, LogInIcon } from "lucide-react";
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
const DEFAULT_AUTHENTICATED_REDIRECT = "/app/psychologists";

const resolveErrorMessage = (error: unknown) => {
  return error instanceof Error ? error.message : "Não foi possível entrar. Tente novamente.";
};

export const AuthLogic = () => {
  const { setter } = useUserSet(DEFAULT_AUTHENTICATED_REDIRECT);
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
      const redirectTo = searchParams.get("redirectTo");
      const callbackUrl = searchParams.get("callbackUrl");
      const query = new URLSearchParams();

      if (role && allowedRoles.includes(role as (typeof allowedRoles)[number])) {
        query.set("role", role);
      }

      if (redirectTo) {
        query.set("redirectTo", redirectTo);
      } else if (callbackUrl) {
        query.set("callbackUrl", callbackUrl);
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
        <div className="mb-6 grid justify-items-center text-center">
          <Logo className="w-[200px] sm:w-[210px]" priority />
          <h1 className="mt-5 text-[1.55rem] font-extrabold leading-tight text-foreground sm:text-[1.7rem]">
            Bem-vindo de volta
          </h1>
          <p className="mt-1.5 text-sm text-muted">Faça o login na sua conta</p>
        </div>

        <Form {...formProps} className="grid gap-1.5" onSubmit={hook.handleSubmit(handleSubmit)}>
          {apiError ? <InlineAlert variant="error">{apiError}</InlineAlert> : null}

          <a
            className="-mt-1 justify-self-end text-[13px] font-medium text-primary hover:text-primary-hover"
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
          </Button>
        </Form>

        <DividerWithLabel className="my-5 sm:my-6">ou</DividerWithLabel>

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
            <Image src="/svg/google.svg" alt="Google" width={22} height={22} />
          )}
          {googlePending ? "Conectando com Google" : "Continuar com Google"}
        </Button>
      </AuthCard>
    </AuthTemplate>
  );
};
