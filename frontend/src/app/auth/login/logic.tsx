"use client";

import { ArrowRight, LogInIcon } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { useAuth } from "@/api/callers/auth";
import { AuthCard } from "@/components/ui/auth-card";
import { DividerWithLabel } from "@/components/ui/divider-with-label";
import { Logo } from "@/components/ui/logo";
import { useUserSet } from "@/hooks/user-set";
import { Button } from "@/registry/new-york-v4/ui/button";
import { AuthTemplate } from "@/templates/auth";
import { fingerprint } from "@/utils/fingerprint";
import { type LoginForm, useForm } from "./use-form";

export const AuthLogic = () => {
  const { setter } = useUserSet("/dashboard");
  const { Form, formProps, hook } = useForm();

  const { login } = useAuth({
    callbacks: {
      login: {
        onSuccess: setter,
        onError: (error) => {
          const message = error instanceof Error ? error.message : "Não foi possível entrar";
          toast.error(message);
        },
      },
    },
  });

  const handleSubmit = (data: LoginForm) => {
    login.mutate(data);
  };

  const handleGoogleLogin = async () => {
    const currentDeviceId = await fingerprint();
    const loginUrl =
      process.env.NEXT_PUBLIC_LOGIN_URL ||
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"}/api/public/google/login`;

    window.location.href = `${loginUrl}/${currentDeviceId}`;
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
          <a
            className="-mt-2 justify-self-end text-sm font-medium text-primary hover:text-primary-hover"
            href="/auth/recovery"
          >
            Esqueci minha senha
          </a>

          <Button className="mt-1 w-full" disabled={login.isPending} type="submit">
            <LogInIcon className="h-4 w-4" aria-hidden="true" />
            Entrar
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </Form>

        <DividerWithLabel className="my-8">ou</DividerWithLabel>

        <Button
          className="w-full"
          disabled={login.isPending}
          onClick={handleGoogleLogin}
          type="button"
          variant="outline"
        >
          <Image src="/svg/google.svg" alt="Google" width={30} height={30} />
          Continuar com Google
        </Button>
      </AuthCard>
    </AuthTemplate>
  );
};
