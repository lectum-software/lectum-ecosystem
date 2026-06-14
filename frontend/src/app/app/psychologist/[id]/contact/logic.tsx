"use client";

import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  LockKeyhole,
  MessageCircle,
  ShieldCheck,
  Smartphone,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDirectoryPsychologist, useDirectoryPsychologistContact } from "@/api/callers/directory";
import {
  openPsychologistWhatsApp,
  PsychologistWhatsAppRedirectModal,
  WHATSAPP_REDIRECT_FALLBACK_VISIBLE_DELAY_MS,
  WHATSAPP_REDIRECT_MIN_DELAY_MS,
} from "@/components/psychologists/psychologist-whatsapp-redirect-button";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { useAppSelector } from "@/hooks/redux";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { toContactPhoneE164, useForm, type WhatsAppContactForm } from "./use-form";

type ApiErrorData = {
  error?: string;
  message?: string;
  status?: number;
};

type ApiError = Error & {
  data?: ApiErrorData;
};

const resolveApiErrorMessage = (error: unknown, fallback: string) => {
  const apiError = error as ApiError;
  const rawMessage =
    apiError?.data?.error ||
    apiError?.data?.message ||
    (error instanceof Error ? error.message : "");
  const normalized = rawMessage.toLowerCase();

  if (apiError?.data?.status === 404 || normalized.includes("não encontr")) {
    return "Este perfil não está publicado ou não está disponível para contato.";
  }

  if (normalized.includes("whatsapp") && normalized.includes("verific")) {
    return "Este perfil ainda não possui WhatsApp verificado. O contato será liberado após verificação real.";
  }

  if (normalized.includes("whatsapp")) {
    return "Este perfil ainda não possui WhatsApp disponível para contato.";
  }

  if (normalized.includes("telefone") || normalized.includes("número")) {
    return "Informe um WhatsApp com DDD válido antes de continuar.";
  }

  if (normalized.includes("token") || normalized.includes("sess")) {
    return "Sua sessão precisa estar ativa para registrar o contato.";
  }

  if (normalized.includes("network") || normalized.includes("conex")) {
    return "Não foi possível conectar à API agora. Tente novamente em instantes.";
  }

  return rawMessage || fallback;
};

const getParamId = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) return value[0] || "";

  return value || "";
};

const getInitials = (name?: string | null) => {
  const parts = (name || "").split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "L";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const getPsychologistTitle = (gender?: string | null) => {
  const normalized = gender?.toLowerCase();

  return normalized === "feminino" ? "Psicóloga" : "Psicólogo";
};

const PrivacyCard = () => {
  return (
    <section className="grid gap-3 rounded-[var(--lectum-card-radius)] border border-border bg-surface-muted p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
          <LockKeyhole className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-sm font-extrabold text-foreground">Privacidade e consentimento</h2>
          <p className="mt-1 text-xs leading-5 text-muted">
            Registramos sua intenção de contato para segurança, analytics e elegibilidade de
            avaliação. O telefone do profissional só é usado para abrir o link direto do WhatsApp.
          </p>
        </div>
      </div>
      <div className="grid gap-2 rounded-2xl border border-border bg-surface p-3 text-xs leading-5 text-muted">
        <p className="flex gap-2">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          Não enviamos mensagens ativas por API do WhatsApp neste MVP.
        </p>
        <p className="flex gap-2">
          <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          Confirme seu número para manter o registro de contato associado à sua conta.
        </p>
      </div>
    </section>
  );
};

export const PsychologistContactLogic = () => {
  const params = useParams<{ id?: string | string[] }>();
  const psychologistId = getParamId(params?.id);
  const storedUser = useAppSelector((state) => state.user);
  const [apiError, setApiError] = useState<string | null>(null);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);
  const [whatsappRedirectUrl, setWhatsappRedirectUrl] = useState<string | null>(null);
  const [isWhatsAppTransitionOpen, setIsWhatsAppTransitionOpen] = useState(false);
  const [manualFallbackVisible, setManualFallbackVisible] = useState(false);
  const redirectTimersRef = useRef<number[]>([]);
  const { Form, formProps, hook } = useForm(storedUser?.patient_profile?.phone);

  const profile = useDirectoryPsychologist(psychologistId);

  useEffect(() => {
    const timers = redirectTimersRef.current;

    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
    };
  }, []);

  const setRedirectTimer = (callback: () => void, ms: number) => {
    const timer = window.setTimeout(callback, ms);
    redirectTimersRef.current.push(timer);
  };

  const startWhatsappTransition = (url: string) => {
    setWhatsappUrl(url);
    setWhatsappRedirectUrl(url);
    setManualFallbackVisible(false);
    setIsWhatsAppTransitionOpen(true);
    setRedirectTimer(
      () => setManualFallbackVisible(true),
      WHATSAPP_REDIRECT_FALLBACK_VISIBLE_DELAY_MS,
    );
    setRedirectTimer(() => openPsychologistWhatsApp(url), WHATSAPP_REDIRECT_MIN_DELAY_MS);
  };

  const handleManualWhatsappOpen = () => {
    if (!whatsappRedirectUrl) return;

    window.open(whatsappRedirectUrl, "_blank", "noopener,noreferrer");
  };

  const contact = useDirectoryPsychologistContact(psychologistId, {
    onSuccess: (data) => {
      setApiError(null);
      startWhatsappTransition(data.whatsapp_url);
    },
    onError: (error) => {
      setWhatsappUrl(null);
      setWhatsappRedirectUrl(null);
      setIsWhatsAppTransitionOpen(false);
      setManualFallbackVisible(false);
      setApiError(
        resolveApiErrorMessage(
          error,
          "Não foi possível registrar o contato agora. Tente novamente.",
        ),
      );
    },
  });

  const profileErrorMessage = useMemo(() => {
    if (!profile.error) return null;

    return resolveApiErrorMessage(
      profile.error,
      "Não foi possível carregar o perfil para contato agora.",
    );
  }, [profile.error]);

  const isProfileLoading = profile.isLoading || profile.isPending;
  const professional = profile.data;
  const isUnavailable = Boolean(professional && !professional.whatsapp_available);
  const submitDisabled =
    contact.isPending ||
    isWhatsAppTransitionOpen ||
    Boolean(whatsappUrl) ||
    isUnavailable ||
    !professional;

  const onSubmit = hook.handleSubmit((values: WhatsAppContactForm) => {
    setApiError(null);
    setWhatsappUrl(null);
    setWhatsappRedirectUrl(null);
    setIsWhatsAppTransitionOpen(false);
    setManualFallbackVisible(false);

    if (!professional?.whatsapp_available) {
      setApiError(
        "Este perfil ainda não possui WhatsApp verificado. O contato será liberado após verificação real.",
      );
      return;
    }

    contact.mutate({
      patient_phone: toContactPhoneE164(values.patient_phone),
      consent_accepted: values.consent_accepted,
    });
  });

  return (
    <PrivateTemplate>
      <div className="mx-auto flex w-full max-w-[430px] flex-col gap-5 sm:max-w-2xl lg:max-w-3xl">
        <header className="flex items-center justify-between gap-3">
          <Button asChild className="h-10 w-10 rounded-full p-0" variant="ghost">
            <Link aria-label="Voltar ao perfil" href={`/app/psychologist/${psychologistId}`}>
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Link>
          </Button>
          <div className="min-w-0 text-center">
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-subtle">
              Contato seguro
            </p>
            <h1 className="truncate text-base font-extrabold text-foreground">
              Confirmar WhatsApp
            </h1>
          </div>
          <span aria-hidden="true" className="h-10 w-10" />
        </header>

        <section className="overflow-hidden rounded-[32px] border border-border bg-surface shadow-[var(--lectum-shadow-soft)]">
          <div className="grid gap-4 bg-primary-soft px-5 py-6 text-primary sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-surface text-primary shadow-[var(--lectum-shadow-soft)]">
                <MessageCircle className="h-6 w-6" aria-hidden="true" />
              </span>
              <p className="mt-5 text-xs font-extrabold uppercase tracking-[0.2em]">
                Confirmação antes de abrir
              </p>
              <h2 className="mt-2 text-3xl font-extrabold leading-tight text-foreground sm:text-4xl">
                Chamar no WhatsApp com segurança
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted">
                A Lectum registra sua intenção de contato e só então abre o link oficial do WhatsApp
                do profissional.
              </p>
            </div>
            <div className="hidden h-28 w-28 place-items-center rounded-[28px] bg-surface/80 text-primary sm:grid">
              <Smartphone className="h-12 w-12" aria-hidden="true" />
            </div>
          </div>
        </section>

        {isProfileLoading ? (
          <section className="rounded-[var(--lectum-card-radius)] border border-border bg-surface p-8 shadow-[var(--lectum-shadow-soft)]">
            <LoadingState label="Carregando dados de contato" />
          </section>
        ) : null}

        {!isProfileLoading && profileErrorMessage ? (
          <EmptyState
            action={
              <Button asChild variant="outline">
                <Link href="/app/psychologists">Voltar para a busca</Link>
              </Button>
            }
            description={profileErrorMessage}
            icon={TriangleAlert}
            title="Contato indisponível"
          />
        ) : null}

        {!isProfileLoading && professional ? (
          <section className="grid gap-4 rounded-[32px] border border-border bg-surface p-5 shadow-[var(--lectum-shadow-soft)] sm:p-6">
            <div className="flex items-center gap-3 rounded-[var(--lectum-card-radius)] border border-border bg-surface-muted p-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary-soft text-lg font-extrabold text-primary">
                {getInitials(professional.name)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold text-foreground">
                  {professional.name}
                </p>
                <p className="line-clamp-2 text-xs leading-5 text-muted">
                  {professional.headline || "Perfil profissional Lectum"}
                </p>
              </div>
            </div>

            {isUnavailable ? (
              <InlineAlert title="WhatsApp ainda indisponível" variant="warning">
                Este perfil não possui WhatsApp verificado. O número só será liberado no fluxo de
                contato quando houver verificação real por SMS/OTP.
              </InlineAlert>
            ) : (
              <InlineAlert title="Número protegido" variant="info">
                O WhatsApp do profissional não é exibido nesta tela. Após o registro, abriremos o
                link direto com mensagem inicial autorizada.
              </InlineAlert>
            )}

            {apiError ? (
              <InlineAlert title="Não foi possível abrir o WhatsApp" variant="error">
                {apiError}
              </InlineAlert>
            ) : null}

            {whatsappUrl ? (
              <InlineAlert title="Contato registrado" variant="success">
                Abrindo o WhatsApp. Se nada acontecer, use o botão alternativo abaixo.
              </InlineAlert>
            ) : null}

            <PrivacyCard />

            {isUnavailable ? (
              <Button asChild className="w-full" variant="outline">
                <Link href={`/app/psychologist/${psychologistId}`}>Voltar ao perfil</Link>
              </Button>
            ) : (
              <Form {...formProps} className="grid gap-4" onSubmit={onSubmit}>
                <div className="grid gap-3 pt-1">
                  <Button
                    className={cn(
                      "h-14 w-full rounded-2xl text-base font-extrabold",
                      whatsappUrl && "bg-success hover:bg-success/90",
                    )}
                    disabled={submitDisabled}
                    type="submit"
                  >
                    {contact.isPending ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                        Registrando contato
                      </>
                    ) : whatsappUrl ? (
                      <>
                        <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                        WhatsApp registrado
                      </>
                    ) : (
                      <>
                        <MessageCircle className="h-5 w-5" aria-hidden="true" />
                        Registrar e abrir WhatsApp
                      </>
                    )}
                  </Button>

                  {whatsappUrl ? (
                    <Button
                      className="w-full"
                      onClick={() => startWhatsappTransition(whatsappUrl)}
                      type="button"
                      variant="outline"
                    >
                      Abrir WhatsApp agora
                    </Button>
                  ) : null}

                  <p className="text-center text-xs leading-5 text-muted">
                    Você será redirecionado para o WhatsApp após a intenção ser salva com sucesso.
                  </p>
                </div>
              </Form>
            )}
          </section>
        ) : null}

        <section className="grid gap-3 rounded-[var(--lectum-card-radius)] border border-border bg-surface-muted p-4 text-xs leading-5 text-muted">
          <p className="flex gap-2">
            <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            Para sua segurança, converse diretamente com o profissional e confirme agenda, valores e
            modalidade antes de iniciar o atendimento.
          </p>
        </section>
      </div>
      {professional ? (
        <PsychologistWhatsAppRedirectModal
          isOpen={isWhatsAppTransitionOpen}
          manualFallbackVisible={manualFallbackVisible}
          onClose={() => setIsWhatsAppTransitionOpen(false)}
          onManualOpen={handleManualWhatsappOpen}
          psychologist={{
            avatar: professional.avatar,
            crp: professional.crp,
            id: professional.id,
            name: professional.name,
            typeLabel: getPsychologistTitle(professional.gender),
            whatsappUrl: whatsappRedirectUrl ?? whatsappUrl,
          }}
          redirectUrl={whatsappRedirectUrl}
        />
      ) : null}
    </PrivateTemplate>
  );
};
