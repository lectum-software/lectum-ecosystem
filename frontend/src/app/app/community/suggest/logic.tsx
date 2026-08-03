"use client";

import { ArrowLeft, Loader2, Send } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSuggestCommunity } from "@/api/callers/community";
import { components } from "@/components/controllers";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { navigateBackWithFallback } from "@/utils/navigation-history";
import { toSuggestCommunityPayload, useSuggestCommunityForm } from "./use-form";

type ApiErrorData = {
  error?: string;
  message?: string;
  status?: number;
};

type ApiError = Error & {
  data?: ApiErrorData;
};

const COMMUNITY_REQUEST_ILLUSTRATION_SRC = "/images/community-request-illustration.svg";

const resolveSuggestError = (error: unknown) => {
  const apiError = error as ApiError;
  const rawMessage =
    apiError?.data?.error ||
    apiError?.data?.message ||
    (error instanceof Error ? error.message : "");
  const normalized = rawMessage.toLowerCase();

  if (normalized.includes("token") || normalized.includes("sess")) {
    return "Sua sessão precisa estar ativa para sugerir uma comunidade.";
  }

  if (normalized.includes("tema") || normalized.includes("estrutura")) {
    return "Descreva o tema da comunidade antes de enviar.";
  }

  if (normalized.includes("network") || normalized.includes("conex")) {
    return "Não foi possível conectar à API agora. Tente novamente em alguns instantes.";
  }

  return rawMessage || "Não foi possível enviar sua sugestão agora.";
};

export const SuggestCommunityLogic = () => {
  const router = useRouter();
  const [apiError, setApiError] = useState<string | null>(null);
  const form = useSuggestCommunityForm();
  const { formProps, hook } = form;
  const mutation = useSuggestCommunity({
    onSuccess: () => {
      setApiError(null);
      router.push("/app/comunidades/sugerir/sucesso");
    },
    onError: (error) => setApiError(resolveSuggestError(error)),
  });

  const onSubmit = hook.handleSubmit((values) => {
    setApiError(null);
    mutation.mutate(toSuggestCommunityPayload(values));
  });

  return (
    <PrivateTemplate
      contentClassName="py-0 sm:py-0"
      showMobileNavigation={false}
      desktopSidebarDefaultCollapsed
    >
      <section className="mx-auto grid min-h-screen w-full max-w-[430px] content-start gap-5 pb-8 sm:max-w-xl lg:max-w-2xl">
        <header className="sticky top-0 z-20 -mx-5 border-b border-border bg-background/95 px-5 backdrop-blur supports-[backdrop-filter]:bg-background/85">
          <div className="grid h-[58px] grid-cols-[44px_1fr_44px] items-center">
            <button
              aria-label="Voltar para comunidades"
              className="grid h-10 w-10 place-items-center rounded-full text-muted transition hover:bg-primary-soft hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
              onClick={() => navigateBackWithFallback(router)}
              type="button"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <h1 className="truncate text-center text-base font-black text-foreground sm:text-lg">
              Solicitar Nova Comunidade
            </h1>
            <span aria-hidden="true" />
          </div>
        </header>

        <section className="grid gap-5 rounded-[var(--lectum-card-radius)] border border-border bg-surface p-4 shadow-[var(--lectum-shadow-soft)] sm:p-6">
          <div className="overflow-hidden rounded-[24px] border border-border/70 bg-surface-muted/60">
            <Image
              alt="Grupo diverso sentado em círculo representando apoio e comunidade"
              className="h-auto w-full object-cover"
              height={192}
              priority
              src={COMMUNITY_REQUEST_ILLUSTRATION_SRC}
              width={358}
            />
          </div>

          <p className="mx-auto max-w-[32rem] text-center text-[0.95rem] leading-6 text-foreground/80 sm:text-base sm:leading-7">
            Sua voz é fundamental. Ajude-nos a criar espaços que acolham suas necessidades e de
            outras pessoas.
          </p>

          <form
            className="grid gap-4 pt-1"
            id="suggest-community-form"
            noValidate
            onSubmit={onSubmit}
          >
            <div className="grid gap-0.5">
              {formProps.fields.map((field) => {
                const Component = components[field.field];

                if (!Component) return null;

                return (
                  <Component
                    control={hook.control}
                    key={`suggest-community-${String(field.name)}`}
                    {...field}
                  />
                );
              })}
            </div>

            {apiError ? (
              <p className="px-1 text-danger text-sm font-medium leading-5" role="alert">
                {apiError}
              </p>
            ) : null}

            <Button
              className="h-14 w-full rounded-full"
              disabled={mutation.isPending}
              type="submit"
            >
              {mutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="h-4 w-4" aria-hidden="true" />
              )}
              Enviar Sugestão
            </Button>
          </form>
        </section>
      </section>
    </PrivateTemplate>
  );
};
