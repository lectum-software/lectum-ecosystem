"use client";

import { Loader2, LogInIcon } from "lucide-react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/api/callers/auth";
import { getSafeApiErrorMessage } from "@/api/errors";
import { AuthCard } from "@/components/ui/auth-card";
import { DividerWithLabel } from "@/components/ui/divider-with-label";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Logo } from "@/components/ui/logo";
import { useUserSet } from "@/hooks/user-set";
import { Button } from "@/registry/new-york-v4/ui/button";
import { AuthTemplate } from "@/templates/auth";
import { buildAuthRouteWithRedirect, resolveAuthReturnTo } from "@/utils/auth-redirect";
import { fingerprint } from "@/utils/fingerprint";
import { buildTrustedGoogleLoginUrl } from "@/utils/trusted-navigation";
import { type LoginForm, useForm } from "./use-form";

const allowedRoles = ["paciente", "psicologo"] as const;
const DEFAULT_AUTHENTICATED_REDIRECT = "/psicologos";

const resolveErrorMessage = (error: unknown) => {
  return getSafeApiErrorMessage(error, "Não foi possível entrar. Tente novamente.");
};

export const AuthLogic = () => {
  const { setter } = useUserSet(DEFAULT_AUTHENTICATED_REDIRECT);
  const { Form, formProps, hook } = useForm();
  const searchParams = useSearchParams();
  const [apiError, setApiError] = useState<string | null>(null);
  const [googlePending, setGooglePending] = useState(false);
  const authReturnTo = resolveAuthReturnTo(
    searchParams.get("redirectTo"),
    searchParams.get("callbackUrl"),
  );
  const signupHref = buildAuthRouteWithRedirect("/auth/profile-selection", authReturnTo);

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
      const role = searchParams.get("role");
      const query = new URLSearchParams();

      if (role && allowedRoles.includes(role as (typeof allowedRoles)[number])) {
        query.set("role", role);
      }

      if (authReturnTo) {
        query.set("redirectTo", authReturnTo);
      }

      window.location.href = buildTrustedGoogleLoginUrl(currentDeviceId, query);
    } catch {
      setGooglePending(false);
      setApiError("Não foi possível iniciar o login com Google. Tente novamente.");
    }
  };

  return (
    <AuthTemplate contentClassName="py-0 sm:py-0">
      <div className="flex w-full flex-col items-center">
        <Logo className="mb-4 w-[124px] sm:mb-4 sm:w-[136px]" priority />

        <AuthCard
          className="[&>div:first-child]:py-5 sm:[&>div:first-child]:py-6 [&>div:last-child]:py-3"
          footer={
            <span>
              Não tem uma conta?{" "}
              <a className="font-semibold text-primary hover:text-primary-hover" href={signupHref}>
                Cadastre-se
              </a>
            </span>
          }
        >
          <div className="mb-5 grid justify-items-center text-center">
            <h1 className="text-[1.55rem] font-extrabold leading-tight text-foreground sm:text-[1.7rem]">
              Bem-vindo de volta
            </h1>
            <p className="mt-1.5 text-sm text-muted">Faça o login na sua conta</p>
          </div>

          {apiError ? (
            <InlineAlert className="mb-4" variant="error">
              {apiError}
            </InlineAlert>
          ) : null}

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

          <DividerWithLabel className="my-4">ou</DividerWithLabel>

          <Form {...formProps} className="grid gap-1" onSubmit={hook.handleSubmit(handleSubmit)}>
            <a
              className="-mt-1 justify-self-end text-[13px] font-medium text-primary hover:text-primary-hover"
              href="/auth/recovery"
            >
              Esqueci minha senha
            </a>

            <Button
              className="mt-1 w-full"
              disabled={login.isPending || googlePending}
              type="submit"
            >
              {login.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <LogInIcon className="h-4 w-4" aria-hidden="true" />
              )}
              {login.isPending ? "Entrando" : "Entrar"}
            </Button>
          </Form>
        </AuthCard>
      </div>
    </AuthTemplate>
  );
};
