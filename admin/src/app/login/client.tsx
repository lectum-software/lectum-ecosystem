"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { resolveApiError } from "@/api/handle";
import { InputController } from "@/components/controllers";
import { Form } from "@/hooks/form";
import { useAdminAuth } from "@/providers/admin-auth";
import { type AdminLoginForm, useAdminLoginForm } from "./use-form";

export const LoginPageClient = () => {
  const form = useAdminLoginForm();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const { isAuthenticated, isHydrating, login } = useAdminAuth();

  useEffect(() => {
    if (!isHydrating && isAuthenticated) {
      router.replace(callbackUrl);
    }
  }, [callbackUrl, isAuthenticated, isHydrating, router]);

  const onSubmit = async (values: AdminLoginForm) => {
    try {
      await login(values);
      toast.success("Login administrativo realizado.");
      router.replace(callbackUrl);
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  return (
    <main className="grid min-h-dvh bg-background p-4 sm:p-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(440px,0.62fr)] lg:p-0">
      <section className="relative hidden overflow-hidden bg-sidebar p-10 text-sidebar-foreground lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(51,0,255,0.46),transparent_34%),radial-gradient(circle_at_82%_12%,rgba(48,140,232,0.32),transparent_28%)]" />
        <div className="relative z-10 flex h-full flex-col justify-between">
          <div>
            <Image alt="Lectum" height={54} priority src="/logo-light.png" width={190} />
            <div className="mt-16 max-w-xl">
              <p className="text-sm font-bold uppercase tracking-[0.32em] text-sidebar-muted">
                Ambiente administrativo
              </p>
              <h1 className="mt-5 text-5xl font-black leading-tight tracking-[-0.04em]">
                Gestão separada do site principal.
              </h1>
              <p className="mt-5 max-w-lg text-lg leading-8 text-sidebar-muted">
                Acesse com uma conta administrativa real criada no backend. Nenhum dado de usuário
                do app principal é reutilizado aqui.
              </p>
            </div>
          </div>
          <p className="text-sm text-sidebar-muted">Lectum Admin · porta local 3002</p>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-md flex-col justify-center lg:px-12">
        <div className="mb-8 flex items-center gap-3 lg:hidden">
          <Image alt="Lectum" height={42} priority src="/logo-icon.svg" width={42} />
          <span className="text-2xl font-black tracking-[-0.04em] text-foreground">
            lectum admin
          </span>
        </div>

        <div className="rounded-[28px] border border-border bg-surface p-6 shadow-admin sm:p-8">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-primary">Admin</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-foreground">
              Entrar no painel
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              Use as credenciais administrativas cadastradas pela fundação backend da TASK-45.
            </p>
          </div>

          <Form className="mt-8 space-y-4" form={form} onSubmit={onSubmit}>
            {form.fields.map((field) => (
              <InputController<AdminLoginForm>
                key={field.name}
                {...field}
                disabled={form.formState.isSubmitting || isHydrating}
              />
            ))}

            <button
              className="mt-2 h-12 w-full rounded-2xl bg-primary px-5 text-sm font-black text-white shadow-admin-soft transition hover:bg-primary-hover focus-visible:outline-primary disabled:opacity-60"
              disabled={form.formState.isSubmitting || isHydrating}
              type="submit"
            >
              {form.formState.isSubmitting ? "Entrando..." : "Entrar"}
            </button>
          </Form>
        </div>
      </section>
    </main>
  );
};
