"use client";

import { ArrowLeft, CheckCircle2, Loader2, MessageSquareText } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { usePsychologistBilling } from "@/api/callers/psychologist-billing";
import { usePsychologistWhatsappVerification } from "@/api/callers/psychologist-whatsapp-verification";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { useAppSelector } from "@/hooks/redux";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { getAfterPhoneVerificationPath } from "@/utils/psychologist-onboarding";
import { toWhatsappPhoneE164, usePhoneForm, type WhatsappPhoneForm } from "./use-form";

type ApiErrorData = {
  error?: string;
  message?: string;
  status?: number;
};

type ApiError = Error & {
  data?: ApiErrorData;
};

const resolveApiError = (error: unknown) => {
  const apiError = error as ApiError;

  return (
    apiError?.data?.error ||
    apiError?.data?.message ||
    (error instanceof Error ? error.message : "") ||
    "Não foi possível salvar o WhatsApp agora."
  );
};

const formatDisplayPhone = (phone?: string | null) => {
  const digits = (phone || "").replace(/\D/g, "");
  const national = digits.startsWith("55") && digits.length > 11 ? digits.slice(2) : digits;

  if (national.length === 11) {
    return `(${national.slice(0, 2)}) ${national.slice(2, 7)}-${national.slice(7)}`;
  }

  if (national.length === 10) {
    return `(${national.slice(0, 2)}) ${national.slice(2, 6)}-${national.slice(6)}`;
  }

  return phone || "telefone informado";
};

const Header = ({ saved }: { saved: boolean }) => (
  <header className="text-center">
    <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-primary-soft text-primary">
      {saved ? (
        <CheckCircle2 className="h-10 w-10" aria-hidden="true" />
      ) : (
        <MessageSquareText className="h-10 w-10" aria-hidden="true" />
      )}
    </div>
    <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-primary">
      WhatsApp profissional
    </p>
    <h1 className="mt-3 text-2xl font-bold leading-tight text-foreground">
      Informe seu WhatsApp profissional
    </h1>
    <p className="mt-3 text-base leading-7 text-muted">
      A Lectum salva este número e gera internamente o link de contato para redirecionar pacientes
      ao WhatsApp.
    </p>
  </header>
);

export const WhatsappVerificationLogic = () => {
  const user = useAppSelector((state) => state.user);
  const { current } = usePsychologistBilling();
  const [apiError, setApiError] = useState<string | null>(null);
  const [savedPhone, setSavedPhone] = useState<string | null>(null);
  const phoneForm = usePhoneForm(user?.psychologist_profile?.whatsapp);
  const PhoneForm = phoneForm.Form;

  const initialPhone = user?.psychologist_profile?.whatsapp;
  const afterPhoneHref = getAfterPhoneVerificationPath(current.data?.current);
  const isPsychologist = user?.role === "psicologo";
  const savedLabel = useMemo(
    () => (savedPhone || initialPhone ? formatDisplayPhone(savedPhone || initialPhone) : null),
    [savedPhone, initialPhone],
  );

  const { request } = usePsychologistWhatsappVerification({
    callbacks: {
      request: {
        onSuccess: (data) => {
          setApiError(null);
          setSavedPhone(data.phone);
          toast.success("WhatsApp salvo com sucesso");
        },
        onError: (error) => setApiError(resolveApiError(error)),
      },
    },
  });

  const submitPhone = phoneForm.hook.handleSubmit((values: WhatsappPhoneForm) => {
    setApiError(null);
    request.mutate({
      phone: toWhatsappPhoneE164(values.phone),
    });
  });

  if (!user) {
    return (
      <PrivateTemplate showHeader={false}>
        <section className="grid min-h-[55vh] place-items-center">
          <LoadingState label="Carregando sua sessão" />
        </section>
      </PrivateTemplate>
    );
  }

  return (
    <PrivateTemplate showHeader={false}>
      <section className="mx-auto grid w-full max-w-[430px] gap-5 md:max-w-2xl">
        <Link
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted"
          href="/app/profile"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar para perfil
        </Link>

        <div className="rounded-[var(--lectum-card-radius)] border border-border bg-surface px-5 py-7 shadow-[var(--lectum-shadow-soft)]">
          <Header saved={Boolean(savedPhone)} />

          {!isPsychologist ? (
            <InlineAlert className="mt-6" title="Perfil não autorizado" variant="warning">
              Este campo é exclusivo para psicólogos cadastrados na Lectum.
            </InlineAlert>
          ) : null}

          {savedLabel && !savedPhone ? (
            <div className="mt-6 grid gap-3">
              <InlineAlert title="WhatsApp atual" variant="success">
                O número {savedLabel} já está salvo como contato profissional. Você pode continuar
                ou informar outro WhatsApp.
              </InlineAlert>
              <Button asChild className="h-12 rounded-full">
                <Link href={afterPhoneHref}>Continuar para próxima etapa</Link>
              </Button>
            </div>
          ) : null}

          {apiError ? (
            <InlineAlert className="mt-6" title="Não foi possível salvar" variant="error">
              {apiError}
            </InlineAlert>
          ) : null}

          <PhoneForm className="mt-8 grid gap-5" {...phoneForm.formProps} onSubmit={submitPhone}>
            <InlineAlert title="Privacidade do número" variant="info">
              O telefone não aparece no perfil público. Ele é usado apenas para montar o link de
              WhatsApp depois do registro da intenção de contato do paciente.
            </InlineAlert>
            <Button
              className="h-14 w-full rounded-full text-base"
              disabled={!isPsychologist || request.isPending}
              type="submit"
            >
              {request.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : null}
              Salvar WhatsApp
            </Button>
          </PhoneForm>

          {savedPhone ? (
            <div className="mt-8 grid gap-5 text-center">
              <InlineAlert title="WhatsApp salvo" variant="success">
                O número {formatDisplayPhone(savedPhone)} foi salvo e será usado para gerar o link
                interno de redirecionamento ao WhatsApp.
              </InlineAlert>
              <Button asChild className="h-12 rounded-full">
                <Link href={afterPhoneHref}>Continuar configuração</Link>
              </Button>
            </div>
          ) : null}
        </div>
      </section>
    </PrivateTemplate>
  );
};
