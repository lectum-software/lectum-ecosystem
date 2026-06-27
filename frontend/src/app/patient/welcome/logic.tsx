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
    return "Este onboarding é exclusivo para pacientes.";
  }

  if (normalized.includes("token") || normalized.includes("sess")) {
    return "Sua sessão precisa estar ativa para continuar.";
  }

  return rawMessage || "Não foi possível carregar seu onboarding agora.";
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
      "pointer-events-none absolute inset-x-0 overflow-hidden text-primary opacity-95 dark:opacity-60",
      variant === "intro" ? "bottom-24 h-[45vh] min-h-[340px]" : "top-0 h-[53vh] min-h-[360px]",
      className,
    )}
  >
    <svg
      className="lectum-welcome-landscape h-full w-full"
      preserveAspectRatio="none"
      viewBox="0 0 390 560"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>Ilustração decorativa de caminho azul</title>
      <defs>
        <linearGradient
          id="lectumWelcomeHillNear"
          x1="49"
          x2="326"
          y1="129"
          y2="547"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="currentColor" stopOpacity="0.18" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.34" />
        </linearGradient>
        <linearGradient
          id="lectumWelcomeHillMid"
          x1="50"
          x2="342"
          y1="104"
          y2="399"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="currentColor" stopOpacity="0.1" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.22" />
        </linearGradient>
        <linearGradient
          id="lectumWelcomeHillFar"
          x1="10"
          x2="385"
          y1="56"
          y2="260"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="currentColor" stopOpacity="0.05" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.14" />
        </linearGradient>
        <linearGradient
          id="lectumWelcomeRoad"
          x1="171"
          x2="230"
          y1="190"
          y2="560"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="var(--lectum-surface)" stopOpacity="0.98" />
          <stop offset="1" stopColor="var(--lectum-surface)" stopOpacity="0.88" />
        </linearGradient>
      </defs>

      <circle cx="195" cy="78" r="198" fill="currentColor" opacity="0.035" />
      <circle cx="195" cy="78" r="139" fill="currentColor" opacity="0.035" />
      <circle cx="195" cy="78" r="83" fill="currentColor" opacity="0.035" />

      <path
        d="M-20 178C47 134 98 153 150 190C193 220 229 222 269 184C313 142 352 142 410 166V560H-20V178Z"
        fill="url(#lectumWelcomeHillFar)"
      />
      <path
        d="M-28 253C57 210 124 223 184 266C233 302 280 305 339 267C376 243 399 242 418 251V560H-28V253Z"
        fill="url(#lectumWelcomeHillMid)"
      />
      <path
        d="M-18 344C64 289 143 301 211 343C264 376 317 374 412 317V560H-18V344Z"
        fill="url(#lectumWelcomeHillNear)"
      />
      <path
        d="M184 211C175 232 215 240 209 264C205 281 174 291 166 313C154 348 214 371 214 409C215 452 158 495 132 560H225C250 516 238 483 209 449C187 424 181 401 194 377C208 351 252 337 258 302C265 262 221 247 219 221C218 209 219 200 225 191C211 199 197 205 184 211Z"
        fill="url(#lectumWelcomeRoad)"
      />
      <path
        d="M171 230C190 230 205 227 223 217"
        fill="none"
        opacity="0.16"
        stroke="var(--lectum-surface)"
        strokeLinecap="round"
        strokeWidth="8"
      />
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
          toast.success("Boas-vindas concluídas");
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
              label={isCompleted ? "Abrindo sua área privada" : "Carregando seu onboarding"}
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
          <div className="relative z-10 flex min-h-dvh w-full flex-col px-6 pb-8 pt-[14vh] sm:min-h-[calc(100dvh-3rem)]">
            <WelcomeLandscape variant="intro" />

            <div className="lectum-welcome-fade-up grid justify-items-center text-center">
              <LectumSymbolIcon
                className="lectum-welcome-symbol h-14 w-14 text-primary"
                title="Símbolo Lectum"
              />
              <h1 className="mt-7 max-w-[360px] text-[2.45rem] font-extrabold leading-[1.08] tracking-[-0.04em] text-primary sm:text-[2.75rem]">
                Bem-vindo à Lectum
              </h1>
              <p className="mt-6 max-w-[330px] text-[1.2rem] font-bold leading-[1.65] tracking-[-0.015em] text-muted">
                Um espaço seguro para você compartilhar o que sente e receber apoio profissional com
                empatia, respeito e humanidade.
              </p>
            </div>

            <div className="relative z-20 mt-auto grid gap-4">
              {visibleError ? (
                <InlineAlert title="Não foi possível continuar" variant="error">
                  {visibleError}
                </InlineAlert>
              ) : null}
              <button
                className="group flex h-20 w-full items-center justify-center gap-5 rounded-[22px] bg-primary px-6 text-[1.55rem] font-extrabold tracking-[-0.02em] text-surface shadow-[var(--lectum-shadow)] transition hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary dark:text-foreground"
                onClick={goNext}
                type="button"
              >
                Vamos começar
                <ArrowRight
                  className="lectum-welcome-arrow h-9 w-9 transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </button>
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="relative z-10 flex min-h-dvh w-full flex-col px-5 pb-10 pt-[35vh] sm:min-h-[calc(100dvh-3rem)]">
            <WelcomeLandscape variant="choice" />

            <div className="lectum-welcome-fade-up text-center">
              <h1 className="mx-auto max-w-[340px] text-[2.15rem] font-extrabold leading-[1.16] tracking-[-0.04em] text-foreground sm:text-[2.35rem]">
                Como você gostaria de começar?
              </h1>
              <p className="mx-auto mt-5 max-w-[330px] text-[1.1rem] font-bold leading-8 text-muted">
                Você poderá acessar tudo depois. Escolha apenas por onde deseja iniciar.
              </p>
            </div>

            <div className="mt-8 grid gap-4">
              {goalOptions.map((option, index) => {
                const selected = selectedGoal === option.value;
                const isCommunityGoal = option.value === "conhecer_comunidade";

                return (
                  <button
                    aria-pressed={selected}
                    className={cn(
                      "lectum-welcome-choice-card relative flex min-h-[132px] w-full items-center rounded-[26px] border border-border bg-surface p-5 pr-[5.25rem] text-left shadow-[var(--lectum-shadow-soft)] transition hover:border-primary hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
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
                      <span className="block text-[1.25rem] font-extrabold leading-tight tracking-[-0.035em] text-foreground">
                        {option.title}
                      </span>
                      <span className="mt-3 block max-w-[270px] text-[0.95rem] font-bold leading-6 text-muted">
                        {option.description}
                      </span>
                      {isCommunityGoal ? (
                        <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary-soft px-3.5 py-1.5 text-[0.82rem] font-extrabold text-primary">
                          <Sparkles className="h-4 w-4" aria-hidden="true" />
                          Acolhimento gratuito
                        </span>
                      ) : null}
                    </span>
                    <span className="-translate-y-1/2 absolute top-1/2 right-5 grid h-14 w-14 place-items-center rounded-full bg-primary-soft text-primary">
                      {selected && completeOnboarding.isPending ? (
                        <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
                      ) : (
                        <ArrowRight className="h-7 w-7" aria-hidden="true" />
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
              <InlineAlert className="mt-5" title="Não foi possível continuar" variant="error">
                {visibleError}
              </InlineAlert>
            ) : null}
          </div>
        ) : null}
      </section>
    </main>
  );
};
