"use client";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  HeartHandshake,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { usePatient } from "@/api/callers/patient";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { Logo } from "@/components/ui/logo";
import { useAppSelector } from "@/hooks/redux";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { goalOptions, type PatientOnboardingForm, useForm } from "./use-form";

const steps = ["Acolhimento", "Informações", "Objetivo"] as const;

type ApiErrorData = {
  error?: string;
  message?: string;
  status?: number;
};

type ApiError = Error & {
  data?: ApiErrorData;
};

const resolvePatientErrorMessage = (error: unknown) => {
  const apiError = error as ApiError;
  const rawMessage =
    apiError?.data?.error ||
    apiError?.data?.message ||
    (error instanceof Error ? error.message : "");
  const normalized = rawMessage.toLowerCase();

  if (normalized.includes("perfil") || normalized.includes("autoriz")) {
    return "Este onboarding é exclusivo para pacientes.";
  }

  if (normalized.includes("token") || normalized.includes("sess")) {
    return "Sua sessão precisa estar ativa para continuar.";
  }

  if (normalized.includes("telefone") || normalized.includes("phone")) {
    return "Confira o telefone informado e tente novamente.";
  }

  return rawMessage || "Não foi possível carregar seu onboarding agora.";
};

const normalizePhoneToE164 = (phone?: string | null) => {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return undefined;

  if (digits.startsWith("55") && digits.length > 11) return `+${digits}`;

  return `+55${digits}`;
};

export const WelcomePatientLogic = () => {
  const router = useRouter();
  const storedUser = useAppSelector((state) => state.user);
  const { Form, formProps, hook } = useForm();
  const [step, setStep] = useState(0);
  const [apiError, setApiError] = useState<string | null>(null);

  const selectedGoal = hook.watch("goal");
  const goalError = hook.formState.errors.goal?.message;

  const { completeOnboarding, profile } = usePatient({
    callbacks: {
      completeOnboarding: {
        onSuccess: () => {
          setApiError(null);
          toast.success("Boas-vindas concluídas");
          router.replace("/dashboard");
        },
        onError: (error) => {
          setApiError(resolvePatientErrorMessage(error));
        },
      },
    },
  });

  useEffect(() => {
    if (profile.data?.onboarding_completed_at) {
      router.replace("/dashboard");
    }
  }, [profile.data?.onboarding_completed_at, router]);

  const firstName = useMemo(() => {
    const [name] = String(storedUser?.name || "")
      .trim()
      .split(" ");
    return name || "você";
  }, [storedUser?.name]);
  const profileError = useMemo(
    () => (profile.error ? resolvePatientErrorMessage(profile.error) : null),
    [profile.error],
  );
  const visibleError = apiError || profileError;

  const isInitialLoading = profile.isLoading || profile.isPending;
  const isCompleted = Boolean(profile.data?.onboarding_completed_at);
  const isLastStep = step === steps.length - 1;

  const goBack = () => {
    setApiError(null);
    setStep((current) => Math.max(current - 1, 0));
  };

  const goNext = async () => {
    setApiError(null);

    setStep((current) => Math.min(current + 1, steps.length - 1));
  };

  const finish = async () => {
    setApiError(null);
    const valid = await hook.trigger();
    if (!valid) return;

    const data = hook.getValues() as PatientOnboardingForm;

    completeOnboarding.mutate({
      goal: data.goal || undefined,
      birthdate: data.birthdate || undefined,
      phone: normalizePhoneToE164(data.phone),
    });
  };

  if (isInitialLoading || isCompleted) {
    return (
      <PrivateTemplate>
        <div className="mx-auto grid min-h-[60vh] w-full max-w-[390px] place-items-center px-4">
          <div className="grid w-full justify-items-center gap-5 rounded-[var(--lectum-card-radius)] border border-border bg-surface p-8 text-center shadow-[var(--lectum-shadow-soft)]">
            <Logo className="w-[160px]" />
            <LoadingState
              label={isCompleted ? "Abrindo sua área privada" : "Carregando seu onboarding"}
            />
          </div>
        </div>
      </PrivateTemplate>
    );
  }

  return (
    <PrivateTemplate>
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[390px] flex-col px-4 py-6 text-foreground sm:max-w-xl">
        <div className="grid gap-2">
          <div className="grid grid-cols-3 gap-2">
            {steps.map((item, index) => (
              <span
                className={cn(
                  "h-1 rounded-full transition",
                  index <= step ? "bg-primary" : "bg-border",
                )}
                key={item}
              />
            ))}
          </div>
          <p className="text-center text-xs font-medium text-subtle">
            Etapa {step + 1} de {steps.length}: {steps[step]}
          </p>
        </div>

        <div className="flex flex-1 flex-col justify-center py-8">
          {step === 0 ? (
            <div className="grid justify-items-center text-center">
              <div className="grid h-48 w-48 place-items-center rounded-[48px] bg-primary-soft text-primary shadow-[var(--lectum-shadow-soft)]">
                <HeartHandshake className="h-28 w-28" aria-hidden="true" />
              </div>
              <p className="mt-10 text-3xl leading-tight text-muted">Bem-vindo(a)</p>
              <h1 className="mt-1 text-4xl font-bold leading-tight text-foreground">à Lectum</h1>
              <p className="mt-10 max-w-[330px] text-lg leading-8 text-muted">
                {firstName}, você está em um ambiente seguro e será acolhido com empatia e
                humanidade.
              </p>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="grid gap-6">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                  Informações pessoais
                </p>
                <h1 className="mt-2 text-2xl font-bold leading-tight text-foreground">
                  Conte-nos um pouco sobre você
                </h1>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Esses dados ajudam a personalizar sua jornada. Você poderá revisar tudo depois.
                </p>
              </div>

              <Form
                className="grid gap-2"
                {...formProps}
                onSubmit={(event) => event.preventDefault()}
              />

              <div className="rounded-[var(--lectum-card-radius)] border border-border bg-surface p-5 shadow-[var(--lectum-shadow-soft)]">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-primary">
                  <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                  Privacidade
                </div>
                <p className="mt-3 text-sm leading-6 text-muted">
                  Seus dados são protegidos e nunca serão compartilhados com terceiros sem seu
                  consentimento explícito.
                </p>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="grid gap-7">
              <div className="text-center">
                <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                  Escolha do objetivo
                </p>
                <h1 className="mx-auto mt-2 max-w-[300px] text-3xl font-bold leading-tight text-foreground">
                  Como você prefere começar?
                </h1>
              </div>

              <div className="grid gap-4">
                {goalOptions.map((option) => {
                  const selected = selectedGoal === option.value;

                  return (
                    <button
                      aria-pressed={selected}
                      className={cn(
                        "flex w-full items-center justify-between gap-4 rounded-[var(--lectum-card-radius)] border bg-surface p-5 text-left shadow-[var(--lectum-shadow-soft)] transition hover:border-primary hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                        selected ? "border-primary bg-primary-soft" : "border-border",
                      )}
                      key={option.value}
                      onClick={() =>
                        hook.setValue("goal", option.value, {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        })
                      }
                      type="button"
                    >
                      <span>
                        <span className="block text-lg font-semibold text-primary">
                          {option.title}
                        </span>
                        <span className="mt-2 block text-sm leading-6 text-muted">
                          {option.description}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "grid h-12 w-12 shrink-0 place-items-center rounded-full",
                          selected ? "bg-primary text-white" : "bg-primary-soft text-primary",
                        )}
                      >
                        {selected ? (
                          <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                        ) : (
                          <ArrowRight className="h-5 w-5" aria-hidden="true" />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>

              <span
                className="block min-h-4 text-xs font-medium leading-4 text-danger"
                role="alert"
              >
                {goalError}
              </span>

              <InlineAlert variant="info">
                Seu objetivo fica salvo no perfil do paciente e evita repetir o onboarding em outro
                dispositivo.
              </InlineAlert>
            </div>
          ) : null}
        </div>

        {visibleError ? (
          <InlineAlert className="mb-4" title="Não foi possível continuar" variant="error">
            {visibleError}
          </InlineAlert>
        ) : null}

        <footer className="grid gap-3">
          {isLastStep ? (
            <Button
              className="w-full"
              disabled={completeOnboarding.isPending}
              onClick={finish}
              type="button"
            >
              {completeOnboarding.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              )}
              {completeOnboarding.isPending ? "Concluindo" : "Finalizar boas-vindas"}
            </Button>
          ) : (
            <Button className="w-full" onClick={goNext} type="button">
              {step === 0 ? "Vamos lá" : "Próximo"}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}

          {step > 0 ? (
            <Button
              className="w-full"
              disabled={completeOnboarding.isPending}
              onClick={goBack}
              type="button"
              variant="ghost"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Voltar
            </Button>
          ) : null}

          <div className="flex items-center justify-center gap-2 text-center text-xs leading-5 text-subtle">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Progresso salvo somente após confirmação no backend.
          </div>
        </footer>
      </section>
    </PrivateTemplate>
  );
};
