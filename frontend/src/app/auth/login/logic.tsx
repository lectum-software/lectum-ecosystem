"use client";

import { ArrowRight, BookOpen, LogInIcon } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/api/callers/auth";
import { useUserSet } from "@/hooks/user-set";
import { Button } from "@/registry/new-york-v4/ui/button";
import { Input } from "@/registry/new-york-v4/ui/input";
import { AuthTemplate } from "@/templates/auth";
import { fingerprint } from "@/utils/fingerprint";

import { type LoginForm, useForm } from "./use-form";

export const AuthLogic = () => {
  const { setter } = useUserSet("/dashboard");
  const { hook, isDirty } = useForm();

  const { login } = useAuth({
    callbacks: {
      login: {
        onSuccess: setter,
        onError: (error) => {
          const message = error instanceof Error ? error.message : "Nao foi possivel entrar";
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
      <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-700">Lectum</p>
            <h1 className="mt-1 text-2xl font-semibold">Entrar</h1>
          </div>
          <span className="flex h-11 w-11 items-center justify-center rounded-md bg-amber-100 text-amber-700">
            <BookOpen className="h-5 w-5" aria-hidden="true" />
          </span>
        </div>

        <form className="grid gap-4" onSubmit={hook.handleSubmit(handleSubmit)}>
          <label className="grid gap-2 text-sm font-medium text-zinc-800" htmlFor="email">
            E-mail
            <Input
              id="email"
              autoComplete="email"
              placeholder="voce@empresa.com"
              type="email"
              {...hook.register("email")}
            />
            {hook.formState.errors.email?.message ? (
              <span className="text-xs font-normal text-red-600">
                {hook.formState.errors.email.message}
              </span>
            ) : null}
          </label>

          <label className="grid gap-2 text-sm font-medium text-zinc-800" htmlFor="password">
            Senha
            <Input
              id="password"
              autoComplete="current-password"
              placeholder="Sua senha"
              type="password"
              {...hook.register("password")}
            />
            {hook.formState.errors.password?.message ? (
              <span className="text-xs font-normal text-red-600">
                {hook.formState.errors.password.message}
              </span>
            ) : null}
          </label>

          <Button className="mt-2 w-full" disabled={!isDirty || login.isPending} type="submit">
            <LogInIcon className="h-4 w-4" aria-hidden="true" />
            Entrar
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3 text-xs text-zinc-400">
          <span className="h-px flex-1 bg-zinc-200" />
          ou
          <span className="h-px flex-1 bg-zinc-200" />
        </div>

        <Button
          className="w-full"
          disabled={login.isPending}
          onClick={handleGoogleLogin}
          type="button"
          variant="outline"
        >
          <span className="grid h-5 w-5 place-items-center rounded-full border border-zinc-300 text-xs font-semibold">
            G
          </span>
          Entrar com Google
        </Button>
      </div>
    </AuthTemplate>
  );
};
