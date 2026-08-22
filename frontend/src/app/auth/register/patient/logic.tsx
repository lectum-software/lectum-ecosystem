"use client";

import { ArrowRight, ChevronDown, Loader2, Mail } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/api/callers/auth";
import { resolveRegisterErrorMessage } from "@/app/auth/register/error-message";
import { getOrCreateAnalyticsIdentity } from "@/components/analytics/storage";
import { DividerWithLabel } from "@/components/ui/divider-with-label";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Logo } from "@/components/ui/logo";
import { useUserSet } from "@/hooks/user-set";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { buildAuthRouteWithRedirect, resolveAuthReturnTo } from "@/utils/auth-redirect";
import { fingerprint } from "@/utils/fingerprint";
import { buildTrustedGoogleLoginUrl } from "@/utils/trusted-navigation";
import { type RegisterPatientForm, TERMS_VERSION, useForm } from "./use-form";

const PATIENT_EMAIL_FORM_ID = "patient-email-register-form";

export const RegisterPatientLogic = () => {
  const { setter } = useUserSet("/auth/verify-email");
  const searchParams = useSearchParams();
  const redirectTo = resolveAuthReturnTo(
    searchParams.get("redirectTo"),
    searchParams.get("callbackUrl"),
  );
  const loginHref = buildAuthRouteWithRedirect("/auth/login", redirectTo);
  const { Form, formProps, hook } = useForm();
  const [apiError, setApiError] = useState<string | null>(null);
  const [googlePending, setGooglePending] = useState(false);
  const [emailFormOpen, setEmailFormOpen] = useState(false);

  const { registerPatient } = useAuth({
    callbacks: {
      registerPatient: {
        onSuccess: (data) => {
          setApiError(null);
          toast.success("Conta criada com sucesso");
          setter(data);
        },
        onError: (error) => {
          setApiError(resolveRegisterErrorMessage(error, "patient"));
        },
      },
    },
  });

  const isPending = registerPatient.isPending || googlePending;

  const handleSubmit = (data: RegisterPatientForm) => {
    setApiError(null);
    const analyticsIdentity = getOrCreateAnalyticsIdentity();
    registerPatient.mutate({
      name: data.name.trim(),
      email: data.email,
      password: data.password,
      password_confirm: data.password_confirm,
      role: "paciente",
      terms_accepted: true,
      terms_version: TERMS_VERSION,
      ...(analyticsIdentity
        ? {
            analytics_session_id: analyticsIdentity.sessionId,
            analytics_visitor_id: analyticsIdentity.visitorId,
          }
        : {}),
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
      const query = new URLSearchParams({
        intent: "register",
        role: "paciente",
        terms_accepted: "true",
        terms_version: TERMS_VERSION,
      });
      const analyticsIdentity = getOrCreateAnalyticsIdentity();
      if (analyticsIdentity) {
        query.set("analytics_visitor_id", analyticsIdentity.visitorId);
        query.set("analytics_session_id", analyticsIdentity.sessionId);
      }
      if (redirectTo) {
        query.set("redirectTo", redirectTo);
      }

      window.location.href = buildTrustedGoogleLoginUrl(currentDeviceId, query);
    } catch {
      setGooglePending(false);
      setApiError("Não foi possível iniciar o cadastro com Google. Tente novamente.");
    }
  };

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col px-4 pb-1 pt-5 sm:pb-2 sm:pt-6">
        <Logo className="mx-auto mb-5 mt-1 w-[132px] sm:mb-6 sm:w-[144px]" priority />

        <section className="overflow-hidden rounded-[var(--lectum-auth-radius)] border border-border bg-surface shadow-[var(--lectum-shadow)]">
          <div className="px-5 pb-6 pt-6 sm:px-6">
            <h1 className="text-center text-[1.45rem] font-extrabold leading-tight text-foreground">
              Cadastre-se
            </h1>
            <p className="mx-auto mt-2 max-w-[300px] text-center text-sm leading-6 text-muted">
              Publique gratuitamente na comunidade e salve seus psicólogos favoritos.
            </p>

            <Button
              className="mt-5 h-12 w-full rounded-[var(--lectum-control-radius)] text-sm"
              disabled={isPending}
              onClick={handleGoogleRegister}
              type="button"
              variant="outline"
            >
              {googlePending ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
              ) : (
                <Image src="/svg/google.svg" alt="Google" width={22} height={22} />
              )}
              {googlePending ? "Conectando com Google" : "Criar conta com Google"}
            </Button>

            <p className="mx-auto mt-2 max-w-[280px] text-center text-[10px] leading-4 text-subtle">
              Ao continuar, você aceita os Termos e a Privacidade.
            </p>

            {apiError ? (
              <InlineAlert className="mt-4" variant="error">
                {apiError}
              </InlineAlert>
            ) : null}

            <DividerWithLabel className="my-5">ou</DividerWithLabel>

            <button
              aria-controls={PATIENT_EMAIL_FORM_ID}
              aria-expanded={emailFormOpen}
              className="flex h-12 w-full items-center justify-between rounded-[var(--lectum-control-radius)] border border-border bg-surface-muted px-4 text-left text-sm font-semibold text-foreground transition hover:border-primary/40 hover:bg-primary-soft/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isPending}
              onClick={() => setEmailFormOpen((open) => !open)}
              type="button"
            >
              <span className="inline-flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" aria-hidden="true" />
                Cadastrar com e-mail
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted transition-transform",
                  emailFormOpen && "rotate-180",
                )}
                aria-hidden="true"
              />
            </button>

            <div id={PATIENT_EMAIL_FORM_ID}>
              {emailFormOpen ? (
                <Form
                  className="mt-4 grid gap-2"
                  {...formProps}
                  onSubmit={hook.handleSubmit(handleSubmit)}
                >
                  <Button
                    className="mt-2 h-12 w-full rounded-[var(--lectum-control-radius)] text-sm"
                    disabled={isPending}
                    type="submit"
                  >
                    {registerPatient.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : null}
                    {registerPatient.isPending ? "Criando conta" : "Criar conta com e-mail"}
                    {!registerPatient.isPending ? (
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    ) : null}
                  </Button>
                </Form>
              ) : null}
            </div>
          </div>

          <div className="border-t border-border bg-surface-muted px-5 py-4 text-center text-[13px] leading-5 text-muted sm:px-6 sm:text-sm">
            Já possui uma conta?{" "}
            <Link className="font-semibold text-primary hover:text-primary-hover" href={loginHref}>
              Fazer login
            </Link>
          </div>
        </section>

        <footer className="mt-auto pb-1 pt-6 text-center text-[11px] leading-5 text-subtle sm:text-xs">
          © 2026 Lectum. Todos os direitos reservados.
        </footer>
      </div>
    </main>
  );
};
