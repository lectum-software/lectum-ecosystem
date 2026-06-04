"use client";

import { ArrowLeftToLine, Loader2, MailCheck, Send } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/api/callers/auth";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/registry/new-york-v4/ui/button";
import { type RecoveryForm, useForm } from "./use-form";

const resolveRecoveryErrorMessage = (error: unknown) => {
  const message = error instanceof Error ? error.message : null;

  return message || "Não foi possível enviar o link agora. Tente novamente em alguns instantes.";
};

export const RecoveryLogic = () => {
  const { Form, formProps, hook } = useForm();
  const [apiError, setApiError] = useState<string | null>(null);
  const [sentEmail, setSentEmail] = useState<string | null>(null);

  const { recovery } = useAuth({
    callbacks: {
      recovery: {
        onSuccess: () => {
          const currentEmail = hook.getValues("email");
          setSentEmail(currentEmail);
          setApiError(null);
        },
        onError: (error) => {
          setApiError(resolveRecoveryErrorMessage(error));
        },
      },
    },
  });

  const handleSubmit = (data: RecoveryForm) => {
    setApiError(null);
    recovery.mutate(data);
  };

  const handleResend = () => {
    const email = sentEmail || hook.getValues("email");

    if (!email) {
      setSentEmail(null);
      return;
    }

    setApiError(null);
    recovery.mutate({ email });
  };

  if (sentEmail) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <header className="border-b border-border bg-surface px-4 py-4 text-center">
          <h1 className="text-xl font-bold">Recuperar Senha</h1>
        </header>

        <section className="mx-auto flex min-h-[calc(100vh-57px)] w-full max-w-[390px] flex-col px-4 py-8">
          <div className="mt-4 grid flex-1 content-center rounded-[var(--lectum-card-radius)] border border-border bg-surface px-6 py-12 text-center shadow-[var(--lectum-shadow-soft)]">
            <div className="mx-auto grid h-44 w-44 place-items-center rounded-full bg-primary-soft/80 text-primary shadow-[inset_0_0_0_32px_rgb(255_255_255/55%)]">
              <span className="relative grid h-28 w-28 place-items-center rounded-full bg-surface shadow-[var(--lectum-shadow)]">
                <MailCheck className="h-14 w-14" aria-hidden="true" />
                <span className="absolute -right-2 -top-2 grid h-8 w-8 place-items-center rounded-full bg-primary text-white shadow-[var(--lectum-shadow-soft)]">
                  <Send className="h-4 w-4" aria-hidden="true" />
                </span>
              </span>
            </div>

            <div className="mt-10 grid gap-4">
              <h2 className="text-2xl font-bold">Link enviado!</h2>
              <p className="text-base leading-7 text-muted">
                Se o e-mail informado estiver cadastrado, você receberá um link de recuperação.
                Verifique sua caixa de entrada e a pasta de spam.
              </p>
            </div>

            {apiError ? (
              <InlineAlert className="mt-8 text-left" variant="error">
                {apiError}
              </InlineAlert>
            ) : null}

            <div className="mt-10 grid justify-items-center gap-3 text-sm text-muted">
              <span>Não recebeu?</span>
              <button
                className="font-semibold text-primary hover:text-primary-hover disabled:opacity-60"
                disabled={recovery.isPending}
                onClick={handleResend}
                type="button"
              >
                {recovery.isPending ? "Reenviando e-mail" : "Reenviar e-mail"}
              </button>
              <Link
                className="mt-4 font-medium text-primary hover:text-primary-hover"
                href="/auth/login"
              >
                Voltar para o Login
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-surface px-4 py-4 text-center">
        <h1 className="text-xl font-bold">Recuperar Senha</h1>
      </header>

      <section className="mx-auto flex min-h-[calc(100vh-57px)] w-full max-w-[390px] flex-col px-4 py-10">
        <div className="grid justify-items-center text-center">
          <Logo className="w-[210px]" priority />
          <h2 className="mt-10 text-xl font-bold leading-tight">Esqueceu sua senha?</h2>
          <p className="mt-5 max-w-[330px] text-base leading-6 text-muted">
            Não se preocupe! Insira o e-mail associado à sua conta e enviaremos um link para você
            redefinir sua senha.
          </p>
        </div>

        <Form
          className="mt-10 grid gap-3"
          {...formProps}
          onSubmit={hook.handleSubmit(handleSubmit)}
        >
          {apiError ? <InlineAlert variant="error">{apiError}</InlineAlert> : null}

          <Button className="mt-2 w-full" disabled={recovery.isPending} type="submit">
            {recovery.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="h-4 w-4" aria-hidden="true" />
            )}
            {recovery.isPending ? "Enviando link" : "Enviar Link de Recuperação"}
          </Button>
        </Form>

        <Button asChild className="mx-auto mt-10" variant="ghost">
          <Link href="/auth/login">
            <ArrowLeftToLine className="h-4 w-4" aria-hidden="true" />
            Voltar para o Login
          </Link>
        </Button>
      </section>
    </main>
  );
};
