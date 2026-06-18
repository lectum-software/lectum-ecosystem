"use client";

import { ArrowLeft, CheckCircle2, Loader2, UserRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { usePsychologistWhatsappVerification } from "@/api/callers/psychologist-whatsapp-verification";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { useAppSelector } from "@/hooks/redux";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { toWhatsappPhoneE164, usePhoneForm, type WhatsappPhoneForm } from "./use-form";

const PROFILE_SETUP_HREF = "/app/professional/profile/setup";

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

const FormHeader = () => (
  <header className="text-center">
    <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-primary-soft text-primary">
      <WhatsAppIcon className="h-10 w-10" aria-hidden="true" />
    </div>
    <h1 className="mt-6 text-2xl font-bold leading-tight text-foreground">
      Informe seu WhatsApp profissional
    </h1>
    <p className="mt-3 text-base leading-7 text-muted">
      Usaremos este número para gerar o link de contato para o seu WhatsApp. Altere quando quiser.
    </p>
  </header>
);

const SavedConfirmation = ({ phone }: { phone: string }) => (
  <div className="grid min-h-[520px] content-between gap-8 text-center">
    <div>
      <div className="mx-auto grid h-28 w-28 place-items-center rounded-full bg-surface text-primary shadow-[var(--lectum-shadow-soft)]">
        <CheckCircle2 className="h-14 w-14" aria-hidden="true" />
      </div>
      <h1 className="mt-9 text-2xl font-bold leading-tight text-foreground">WhatsApp salvo!</h1>
      <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-muted">
        O número {formatDisplayPhone(phone)} foi salvo com sucesso. Agora a Lectum pode gerar o link
        de contato por WhatsApp para pacientes.
      </p>

      <div className="mt-10 rounded-[var(--lectum-card-radius)] border border-border bg-surface px-5 py-6 text-left shadow-[var(--lectum-shadow-soft)]">
        <div className="flex items-start gap-4">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
            <UserRound className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
              Última etapa
            </p>
            <h2 className="mt-1 text-xl font-bold text-foreground">
              Vídeo de apresentação e perfil profissional
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              Envie um vídeo vertical de apresentação para ativar sua exibição na página de
              psicólogos. Aproveite para completar seu perfil e gerar mais oportunidades de
              atendimento.
            </p>
          </div>
        </div>
      </div>
    </div>

    <Button
      asChild
      className="h-14 w-full rounded-full text-base shadow-[var(--lectum-shadow-soft)]"
    >
      <Link href={PROFILE_SETUP_HREF}>Configurar perfil</Link>
    </Button>
  </div>
);

export const WhatsappVerificationLogic = () => {
  const user = useAppSelector((state) => state.user);
  const [apiError, setApiError] = useState<string | null>(null);
  const [savedPhone, setSavedPhone] = useState<string | null>(null);
  const phoneForm = usePhoneForm(user?.psychologist_profile?.whatsapp);
  const PhoneForm = phoneForm.Form;

  const isPsychologist = user?.role === "psicologo";

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
      phone: toWhatsappPhoneE164(values.phone, values.countryCode),
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
        {savedPhone ? (
          <button
            className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-muted transition hover:text-foreground"
            onClick={() => setSavedPhone(null)}
            type="button"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Voltar para configuração de WhatsApp
          </button>
        ) : (
          <Link
            className="inline-flex items-center gap-2 text-sm font-semibold text-muted"
            href="/app/professional/billing/plans"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Voltar para planos
          </Link>
        )}

        <div className="rounded-[var(--lectum-card-radius)] border border-border bg-surface px-5 py-7 shadow-[var(--lectum-shadow-soft)]">
          {savedPhone ? (
            <SavedConfirmation phone={savedPhone} />
          ) : (
            <>
              <FormHeader />

              {!isPsychologist ? (
                <InlineAlert className="mt-6" title="Perfil não autorizado" variant="warning">
                  Este campo é exclusivo para psicólogos cadastrados na Lectum.
                </InlineAlert>
              ) : null}

              {apiError ? (
                <InlineAlert className="mt-6" title="Não foi possível salvar" variant="error">
                  {apiError}
                </InlineAlert>
              ) : null}

              <PhoneForm
                className="mt-8 grid gap-5"
                {...phoneForm.formProps}
                onSubmit={submitPhone}
              >
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
            </>
          )}
        </div>
      </section>
    </PrivateTemplate>
  );
};
