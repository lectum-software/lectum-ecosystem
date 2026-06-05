"use client";

import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, LockKeyhole, Sparkles } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { usePatient } from "@/api/callers/patient";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { useAppSelector } from "@/hooks/redux";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { genderOptions, goalOptions, type PatientOnboardingForm, useForm } from "./use-form";

const TOTAL_STEPS = 3;
const PROGRESS_STEPS = ["welcome-progress-1", "welcome-progress-2", "welcome-progress-3"] as const;

type SelectedGender = (typeof genderOptions)[number]["value"];
type SelectedGoal = (typeof goalOptions)[number]["value"];

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

  return rawMessage || "Não foi possível carregar seu onboarding agora.";
};

export const WelcomePatientLogic = () => {
  const router = useRouter();
  const storedUser = useAppSelector((state) => state.user);
  const { Form, formProps, hook } = useForm(storedUser?.name || "");
  const [step, setStep] = useState(0);
  const [apiError, setApiError] = useState<string | null>(null);
  const [selectedGender, setSelectedGender] = useState<SelectedGender | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<SelectedGoal | null>(null);

  const genderError = hook.formState.errors.gender?.message;
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

  const profileError = useMemo(
    () => (profile.error ? resolvePatientErrorMessage(profile.error) : null),
    [profile.error],
  );
  const visibleError = apiError || profileError;

  const isInitialLoading = profile.isLoading || profile.isPending;
  const isCompleted = Boolean(profile.data?.onboarding_completed_at);
  const isLastStep = step === TOTAL_STEPS - 1;

  const goBack = () => {
    setApiError(null);
    setStep((current) => Math.max(current - 1, 0));
  };

  const goNext = async () => {
    setApiError(null);

    if (step === 1) {
      const data = hook.getValues();
      const name = String(data.name || "").trim();

      hook.clearErrors(["name", "gender"]);

      if (name.length < 2) {
        hook.setError("name", {
          message: "Informe seu nome e sobrenome",
          type: "manual",
        });
        return;
      }

      if (!selectedGender) {
        hook.setError("gender", {
          message: "Escolha seu gênero ou prefira não dizer",
          type: "manual",
        });
        return;
      }
    }

    setStep((current) => Math.min(current + 1, TOTAL_STEPS - 1));
  };

  const finish = async () => {
    setApiError(null);
    const data = hook.getValues() as PatientOnboardingForm;
    const name = String(data.name || "").trim();

    hook.clearErrors(["name", "gender", "goal"]);

    if (name.length < 2) {
      hook.setError("name", {
        message: "Informe seu nome e sobrenome",
        type: "manual",
      });
      return;
    }

    if (!selectedGender) {
      hook.setError("gender", {
        message: "Escolha seu gênero ou prefira não dizer",
        type: "manual",
      });
      setStep(1);
      return;
    }

    if (!selectedGoal) {
      hook.setError("goal", {
        message: "Escolha como prefere começar",
        type: "manual",
      });
      return;
    }

    completeOnboarding.mutate({
      name,
      gender: selectedGender,
      goal: selectedGoal,
    });
  };

  if (isInitialLoading || isCompleted) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <div className="mx-auto grid min-h-screen w-full max-w-[390px] place-items-center px-4 py-8">
          <div className="grid w-full justify-items-center gap-5 rounded-[var(--lectum-card-radius)] border border-border bg-surface p-8 text-center shadow-[var(--lectum-shadow-soft)]">
            <LoadingState
              label={isCompleted ? "Abrindo sua área privada" : "Carregando seu onboarding"}
            />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex min-h-screen w-full max-w-[390px] flex-col px-4 py-10 sm:max-w-xl">
        <div className="grid grid-cols-3 gap-2">
          {PROGRESS_STEPS.map((progressKey, index) => (
            <span
              className={cn(
                "h-1 rounded-full transition",
                index <= step ? "bg-primary" : "bg-border",
              )}
              key={progressKey}
            />
          ))}
        </div>

        <div className="flex flex-1 flex-col justify-center py-8">
          {step === 0 ? (
            <div className="grid justify-items-center text-center">
              <p className="text-3xl leading-tight text-muted">Bem-vindo(a)</p>
              <h1 className="mt-1 text-4xl font-bold leading-tight text-foreground">à Lectum</h1>
              <Image
                alt="Abraço acolhedor Lectum"
                className="mt-12 h-auto w-[260px] max-w-full"
                height={218}
                priority
                src="/images/patient-welcome-hug.png"
                width={260}
              />
              <p className="mt-12 max-w-[330px] text-lg leading-8 text-muted">
                Você está em um ambiente seguro e será acolhido com empatia e humanidade 💙
              </p>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="grid gap-6">
              <div>
                <h1 className="text-2xl font-bold leading-tight text-foreground">
                  Conte-nos sobre você
                </h1>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Como os profissionais devem se referir a você?
                </p>
              </div>

              <Form
                className="grid gap-2"
                {...formProps}
                onSubmit={(event) => event.preventDefault()}
              />

              <div className="grid gap-3">
                <p className="text-xs font-bold uppercase tracking-wide text-foreground">Gênero</p>
                <div className="flex flex-wrap gap-3">
                  {genderOptions.map((option) => {
                    const selected = selectedGender === option.value;

                    return (
                      <button
                        aria-pressed={selected}
                        className={cn(
                          "h-12 rounded-full border px-5 text-base font-medium text-muted shadow-sm transition hover:border-primary hover:bg-primary-soft hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                          selected
                            ? "border-primary bg-primary-soft text-primary"
                            : "border-border bg-surface",
                        )}
                        key={option.value}
                        onClick={() => {
                          setSelectedGender(option.value);
                          hook.setValue("gender", option.value, {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: false,
                          });
                          hook.clearErrors("gender");
                        }}
                        type="button"
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
                <span
                  className="block min-h-4 text-xs font-medium leading-4 text-danger"
                  role="alert"
                >
                  {genderError}
                </span>
              </div>

              <div className="rounded-[var(--lectum-card-radius)] border border-border bg-surface p-5 shadow-[var(--lectum-shadow-soft)]">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-primary">
                  <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                  Privacidade
                </div>
                <p className="mt-3 text-sm leading-6 text-muted">
                  Seus dados são protegidos por criptografia de ponta a ponta e nunca serão
                  compartilhados com terceiros sem seu consentimento explícito.
                </p>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="grid gap-7">
              <div className="text-center">
                <h1 className="mx-auto max-w-[300px] text-3xl font-bold leading-tight text-foreground">
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
                      onClick={() => {
                        setSelectedGoal(option.value);
                        hook.setValue("goal", option.value, {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: false,
                        });
                        hook.clearErrors("goal");
                      }}
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
        </footer>
      </section>
    </main>
  );
};
