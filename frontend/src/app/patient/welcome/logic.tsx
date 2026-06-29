"use client";

import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { usePatient } from "@/api/callers/patient";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";
import { goalOptions, useForm } from "./use-form";

const TOTAL_STEPS = 2;

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
    return "Este onboarding \u00e9 exclusivo para pacientes.";
  }

  if (normalized.includes("token") || normalized.includes("sess")) {
    return "Sua sess\u00e3o precisa estar ativa para continuar.";
  }

  return rawMessage || "N\u00e3o foi poss\u00edvel carregar seu onboarding agora.";
};

const welcomeBackgroundByVariant = {
  intro: {
    desktop: "/images/patient-welcome/welcome-intro-background-desktop.svg",
    mobile: "/images/patient-welcome/welcome-intro-background.svg",
  },
  choice: {
    desktop: "/images/patient-welcome/welcome-choice-background-desktop.svg",
    mobile: "/images/patient-welcome/welcome-choice-background.svg",
  },
} as const;

const WelcomeBackground = ({ variant }: { variant: keyof typeof welcomeBackgroundByVariant }) => {
  const sources = welcomeBackgroundByVariant[variant];

  return (
    <>
      <Image
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover sm:hidden"
        fill
        priority={variant === "intro"}
        sizes="100vw"
        src={sources.mobile}
        unoptimized
      />
      <Image
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 hidden h-full w-full object-cover sm:block"
        fill
        priority={variant === "intro"}
        sizes="100vw"
        src={sources.desktop}
        unoptimized
      />
    </>
  );
};

export const WelcomePatientLogic = () => {
  const router = useRouter();
  const { hook } = useForm();
  const [step, setStep] = useState(0);
  const [apiError, setApiError] = useState<string | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<SelectedGoal | null>(null);

  const goalError = hook.formState.errors.goal?.message;

  const { completeOnboarding, profile } = usePatient({
    callbacks: {
      completeOnboarding: {
        onSuccess: () => {
          setApiError(null);
          toast.success("Boas-vindas conclu\u00eddas");
          router.replace("/app");

          window.setTimeout(() => {
            if (window.location.pathname !== "/app") {
              window.location.assign("/app");
            }
          }, 800);
        },
        onError: (error) => {
          setApiError(resolvePatientErrorMessage(error));
        },
      },
    },
  });

  useEffect(() => {
    if (profile.data?.onboarding_completed_at) {
      router.replace("/app");
    }
  }, [profile.data?.onboarding_completed_at, router]);

  const profileError = useMemo(
    () => (profile.error ? resolvePatientErrorMessage(profile.error) : null),
    [profile.error],
  );
  const visibleError = apiError || profileError;

  const isInitialLoading = profile.isLoading || profile.isPending;
  const isCompleted = Boolean(profile.data?.onboarding_completed_at);

  const goNext = () => {
    setApiError(null);
    setStep((current) => Math.min(current + 1, TOTAL_STEPS - 1));
  };

  const completeWithGoal = (goal: SelectedGoal) => {
    if (completeOnboarding.isPending) return;

    setApiError(null);
    hook.clearErrors("goal");
    setSelectedGoal(goal);
    hook.setValue("goal", goal, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: false,
    });

    completeOnboarding.mutate({ goal });
  };

  if (isInitialLoading || isCompleted) {
    return (
      <main className="min-h-dvh bg-background text-foreground">
        <div className="mx-auto grid min-h-dvh w-full max-w-[430px] place-items-center px-5 py-8">
          <div className="grid w-full justify-items-center gap-5 rounded-[var(--lectum-auth-radius)] border border-border bg-surface p-8 text-center shadow-[var(--lectum-shadow-soft)]">
            <LoadingState
              label={isCompleted ? "Abrindo sua \u00e1rea privada" : "Carregando seu onboarding"}
            />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-background text-foreground sm:overflow-hidden">
      <section className="lectum-welcome-screen lectum-welcome-shell relative isolate mx-auto flex w-full overflow-hidden bg-surface text-foreground">
        {step === 0 ? (
          <div className="relative z-10 min-h-dvh w-full px-0 sm:h-full sm:min-h-0">
            <WelcomeBackground variant="intro" />

            <div className="lectum-welcome-fade-up absolute top-[14.8%] right-0 left-0 z-10 grid justify-items-center px-5 text-center">
              <Logo className="lectum-welcome-symbol w-[146px] sm:w-[192px]" priority />
              <h1 className="lectum-welcome-brand mt-[25px] max-w-[338px] text-[1.86rem] font-extrabold leading-[1.04] tracking-[-0.055em] sm:max-w-[760px] sm:text-[3.25rem]">
                Bem-vindo &agrave; Lectum
              </h1>
              <p className="lectum-welcome-copy mt-[23px] max-w-[292px] text-[1rem] font-bold leading-[1.62] tracking-[-0.018em] sm:max-w-[560px] sm:text-[1.18rem]">
                Um espa&ccedil;o seguro para voc&ecirc; compartilhar o que sente e receber apoio
                profissional com empatia, respeito e humanidade.
              </p>
            </div>

            <div className="absolute right-0 bottom-[31px] left-0 z-20 mx-auto grid w-full max-w-[314px] gap-4 sm:bottom-[7vh] sm:max-w-[440px]">
              {visibleError ? (
                <InlineAlert title="N\u00e3o foi poss\u00edvel continuar" variant="error">
                  {visibleError}
                </InlineAlert>
              ) : null}
              <button
                className="group flex h-[68px] w-full items-center justify-center gap-5 rounded-[16px] bg-primary px-6 !text-[1.15rem] !font-extrabold tracking-[-0.02em] text-surface shadow-[var(--lectum-shadow)] transition hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary sm:h-[76px] sm:rounded-[20px] dark:text-foreground"
                onClick={goNext}
                type="button"
              >
                Vamos come&ccedil;ar
                <ArrowRight
                  className="lectum-welcome-arrow h-7 w-7 transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </button>
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="relative z-10 min-h-dvh w-full px-0 sm:h-full sm:min-h-0">
            <WelcomeBackground variant="choice" />

            <div className="lectum-welcome-fade-up absolute top-[47.6%] right-0 left-0 z-10 px-5 text-center sm:top-[36%]">
              <h1 className="lectum-welcome-ink mx-auto max-w-[318px] text-[1.78rem] font-extrabold leading-[1.13] tracking-[-0.045em] sm:max-w-[760px] sm:text-[3rem]">
                Como voc&ecirc; gostaria de come&ccedil;ar?
              </h1>
            </div>

            <div className="absolute top-[58.8%] right-0 left-0 z-10 mx-auto grid w-full max-w-[324px] gap-4 px-0 sm:top-[51%] sm:max-w-[820px] sm:grid-cols-2 sm:gap-6">
              {goalOptions.map((option, index) => {
                const selected = selectedGoal === option.value;
                const isCommunityGoal = option.value === "conhecer_comunidade";

                return (
                  <button
                    aria-pressed={selected}
                    className={cn(
                      "lectum-welcome-choice-card relative flex min-h-[102px] w-full items-center rounded-[22px] border border-border bg-surface p-[18px] pr-[5.2rem] text-left shadow-[var(--lectum-shadow-soft)] transition hover:border-primary hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                      isCommunityGoal && "min-h-[142px]",
                      index === 1 && "[animation-delay:120ms]",
                      completeOnboarding.isPending && "cursor-not-allowed opacity-75",
                      selected && "border-primary bg-primary-soft",
                    )}
                    disabled={completeOnboarding.isPending}
                    key={option.value}
                    onClick={() => completeWithGoal(option.value)}
                    type="button"
                  >
                    <span className="min-w-0">
                      <span className="lectum-welcome-ink block text-[1.18rem] font-extrabold leading-tight tracking-[-0.035em]">
                        {option.title}
                      </span>
                      <span
                        className={cn(
                          "lectum-welcome-copy mt-3 block text-[0.85rem] font-bold leading-[1.5]",
                          isCommunityGoal ? "max-w-[242px]" : "max-w-[190px] sm:max-w-[240px]",
                        )}
                      >
                        {option.description}
                      </span>
                      {isCommunityGoal ? (
                        <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary-soft px-4 py-1.5 text-[0.82rem] font-extrabold text-primary">
                          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                          Espa&ccedil;o gratuito
                        </span>
                      ) : null}
                    </span>
                    <span className="-translate-y-1/2 absolute top-1/2 right-[22px] grid h-[58px] w-[58px] place-items-center rounded-full bg-primary-soft text-primary">
                      {selected && completeOnboarding.isPending ? (
                        <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
                      ) : (
                        <ArrowRight className="h-8 w-8" aria-hidden="true" />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            {goalError ? (
              <span
                className="mt-4 block min-h-4 text-sm font-medium leading-5 text-danger"
                role="alert"
              >
                {goalError}
              </span>
            ) : null}

            {visibleError ? (
              <InlineAlert
                className="mt-5"
                title="N\u00e3o foi poss\u00edvel continuar"
                variant="error"
              >
                {visibleError}
              </InlineAlert>
            ) : null}
          </div>
        ) : null}
      </section>
    </main>
  );
};
