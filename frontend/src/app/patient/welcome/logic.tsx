"use client";

import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { usePatient } from "@/api/callers/patient";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LectumSymbolIcon } from "@/components/ui/lectum-symbol-icon";
import { LoadingState } from "@/components/ui/loading-state";
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

const WelcomeLandscape = ({
  className,
  variant,
}: {
  className?: string;
  variant: "intro" | "choice";
}) => (
  <div
    aria-hidden="true"
    className={cn(
      "pointer-events-none absolute inset-0 z-0 overflow-hidden text-primary dark:opacity-60",
      variant === "intro" ? "opacity-70" : "opacity-55",
      className,
    )}
  >
    <svg
      className={cn(
        "h-full w-full",
        variant === "intro" ? "lectum-welcome-landscape" : "lectum-welcome-landscape-subtle",
      )}
      preserveAspectRatio="none"
      viewBox="0 0 390 844"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>Ilustracao decorativa de caminho azul</title>
      <defs>
        <linearGradient
          id="lectumWelcomeHillNear"
          x1="43"
          x2="345"
          y1="390"
          y2="835"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="currentColor" stopOpacity="0.2" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.34" />
        </linearGradient>
        <linearGradient
          id="lectumWelcomeHillMid"
          x1="32"
          x2="358"
          y1="306"
          y2="648"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="currentColor" stopOpacity="0.13" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.24" />
        </linearGradient>
        <linearGradient
          id="lectumWelcomeHillFar"
          x1="4"
          x2="386"
          y1="262"
          y2="514"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="currentColor" stopOpacity="0.07" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.18" />
        </linearGradient>
        <linearGradient
          id="lectumWelcomeRoad"
          x1="154"
          x2="247"
          y1="330"
          y2="844"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="var(--lectum-surface)" stopOpacity="0.98" />
          <stop offset="1" stopColor="var(--lectum-surface)" stopOpacity="0.88" />
        </linearGradient>
        <radialGradient
          id="lectumWelcomeSun"
          cx="0"
          cy="0"
          r="1"
          gradientTransform={
            variant === "intro"
              ? "translate(195 498) rotate(90) scale(168 168)"
              : "translate(195 300) rotate(90) scale(210 210)"
          }
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="currentColor" stopOpacity="0.08" />
          <stop offset="0.72" stopColor="currentColor" stopOpacity="0.025" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>

      {variant === "intro" ? (
        <>
          <rect fill="url(#lectumWelcomeSun)" height="844" width="390" />
          <circle cx="195" cy="472" r="146" fill="currentColor" opacity="0.026" />
          <circle cx="195" cy="472" r="95" fill="currentColor" opacity="0.026" />
          <circle cx="195" cy="472" r="50" fill="currentColor" opacity="0.022" />
          <path
            d="M-36 370C44 378 82 421 139 448C174 465 207 458 236 432C277 395 318 365 426 368V844H-36V370Z"
            fill="url(#lectumWelcomeHillFar)"
          />
          <path
            d="M-38 438C48 431 105 462 170 501C220 531 272 521 333 469C366 440 397 432 428 441V844H-38V438Z"
            fill="url(#lectumWelcomeHillMid)"
          />
          <path
            d="M-28 552C63 510 141 509 218 538C274 560 329 558 424 516V844H-28V552Z"
            fill="url(#lectumWelcomeHillNear)"
          />
          <path
            d="M229 487C210 496 199 504 206 517C218 537 263 548 257 576C250 609 188 634 170 670C146 718 190 758 224 790C245 810 261 827 271 844H158C150 823 134 804 119 785C94 753 92 718 114 681C142 633 204 604 211 573C217 547 177 532 188 510C195 497 210 491 229 487Z"
            fill="url(#lectumWelcomeRoad)"
          />
          <path
            d="M185 507C202 504 216 497 229 488"
            fill="none"
            opacity="0.16"
            stroke="var(--lectum-surface)"
            strokeLinecap="round"
            strokeWidth="5"
          />
        </>
      ) : (
        <>
          <rect fill="url(#lectumWelcomeSun)" height="844" width="390" />
          <circle cx="195" cy="276" r="184" fill="currentColor" opacity="0.05" />
          <circle cx="195" cy="276" r="126" fill="currentColor" opacity="0.05" />
          <circle cx="195" cy="276" r="67" fill="currentColor" opacity="0.035" />
          <path
            d="M-30 256C58 276 108 312 158 330C184 340 207 338 237 320C283 293 332 270 420 258V508H-30V256Z"
            fill="url(#lectumWelcomeHillFar)"
          />
          <path
            d="M-32 333C49 311 112 323 168 352C216 377 264 372 323 338C366 313 394 312 422 323V536H-32V333Z"
            fill="url(#lectumWelcomeHillMid)"
          />
          <path
            d="M166 314C181 326 221 320 229 337C238 356 202 363 199 382C197 398 226 405 224 422C222 439 198 454 191 476C184 499 198 517 212 533H168C153 509 149 487 157 461C165 433 191 421 190 399C189 380 166 374 169 352C171 336 180 326 166 314Z"
            fill="url(#lectumWelcomeRoad)"
            opacity="0.96"
          />
          <path
            d="M-24 396C45 370 108 358 169 374C218 387 251 423 305 401C346 386 378 389 414 407V844H-24V396Z"
            fill="var(--lectum-surface)"
          />
        </>
      )}
    </svg>
  </div>
);

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
    <main className="min-h-dvh bg-background text-foreground">
      <section className="lectum-welcome-screen relative isolate mx-auto flex min-h-dvh w-full max-w-[430px] overflow-hidden bg-surface text-foreground sm:my-6 sm:min-h-[calc(100dvh-3rem)] sm:rounded-[32px] sm:border sm:border-border sm:shadow-[var(--lectum-shadow)]">
        {step === 0 ? (
          <div className="relative z-10 min-h-dvh w-full px-0 sm:min-h-[calc(100dvh-3rem)]">
            <WelcomeLandscape variant="intro" />

            <div className="lectum-welcome-fade-up absolute top-[15vh] right-0 left-0 z-10 grid justify-items-center px-5 text-center">
              <LectumSymbolIcon
                className="lectum-welcome-symbol lectum-welcome-brand h-9 w-9"
                title="Simbolo Lectum"
              />
              <h1 className="lectum-welcome-brand mt-5 max-w-[330px] text-[1.78rem] font-extrabold leading-[1.08] tracking-[-0.045em] sm:text-[2rem]">
                Bem-vindo &agrave; Lectum
              </h1>
              <p className="lectum-welcome-copy mt-4 max-w-[260px] text-[1rem] font-bold leading-[1.55] tracking-[-0.015em]">
                Um espa&ccedil;o seguro para voc&ecirc; compartilhar o que sente e receber apoio
                profissional com empatia, respeito e humanidade.
              </p>
            </div>

            <div className="absolute right-0 bottom-[32px] left-0 z-20 mx-auto grid w-full max-w-[314px] gap-4">
              {visibleError ? (
                <InlineAlert title="N\u00e3o foi poss\u00edvel continuar" variant="error">
                  {visibleError}
                </InlineAlert>
              ) : null}
              <button
                className="group flex h-[68px] w-full items-center justify-center gap-7 rounded-[16px] bg-primary px-6 text-[1.58rem] font-extrabold tracking-[-0.02em] text-surface shadow-[var(--lectum-shadow)] transition hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary dark:text-foreground"
                onClick={goNext}
                type="button"
              >
                Vamos come&ccedil;ar
                <ArrowRight
                  className="lectum-welcome-arrow h-8 w-8 transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </button>
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="relative z-10 min-h-dvh w-full px-0 sm:min-h-[calc(100dvh-3rem)]">
            <WelcomeLandscape variant="choice" />

            <div className="lectum-welcome-fade-up absolute top-[48.8vh] right-0 left-0 z-10 px-5 text-center">
              <h1 className="lectum-welcome-ink mx-auto max-w-[318px] text-[1.7rem] font-extrabold leading-[1.13] tracking-[-0.04em] sm:text-[1.9rem]">
                Como voc&ecirc; gostaria de come&ccedil;ar?
              </h1>
              <p className="lectum-welcome-copy mx-auto mt-3 max-w-[315px] text-[1rem] font-bold leading-[1.4]">
                Voc&ecirc; poder&aacute; acessar tudo depois.
                <br />
                Escolha apenas por onde deseja iniciar.
              </p>
            </div>

            <div className="absolute top-[62.3vh] right-0 left-0 z-10 mx-auto grid w-full max-w-[324px] gap-4 px-0">
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
                          isCommunityGoal ? "max-w-[242px]" : "max-w-[190px]",
                        )}
                      >
                        {option.description}
                      </span>
                      {isCommunityGoal ? (
                        <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary-soft px-4 py-1.5 text-[0.82rem] font-extrabold text-primary">
                          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                          Acolhimento gratuito
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
