"use client";

import { ArrowLeft, Loader2, Send, UsersRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useSuggestCommunity } from "@/api/callers/community";
import { components } from "@/components/controllers";
import { InlineAlert } from "@/components/ui/inline-alert";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { toSuggestCommunityPayload, useSuggestCommunityForm } from "./use-form";

type ApiErrorData = {
  error?: string;
  message?: string;
  status?: number;
};

type ApiError = Error & {
  data?: ApiErrorData;
};

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

const illustrationPeople = [
  "acolhimento",
  "escuta",
  "apoio",
  "troca",
  "grupo",
  "cuidado",
  "seguro",
  "presenca",
  "dialogo",
  "comunidade",
];

export const SuggestCommunityLogic = () => {
  const router = useRouter();
  const [apiError, setApiError] = useState<string | null>(null);
  const form = useSuggestCommunityForm();
  const { formProps, hook } = form;
  const mutation = useSuggestCommunity({
    onSuccess: () => {
      setApiError(null);
      router.push("/app/community/suggest/success");
    },
    onError: (error) => setApiError(resolveSuggestError(error)),
  });

  const visibleError = useMemo(() => {
    if (apiError) return apiError;
    if (!hook.formState.isSubmitted) return null;

    return Object.values(hook.formState.errors)[0]?.message?.toString() ?? null;
  }, [apiError, hook.formState.errors, hook.formState.isSubmitted]);

  const onSubmit = hook.handleSubmit((values) => {
    setApiError(null);
    mutation.mutate(toSuggestCommunityPayload(values));
  });

  return (
    <PrivateTemplate showMobileNavigation={false} desktopSidebarDefaultCollapsed>
      <section className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-[430px] gap-5 pb-8 sm:max-w-xl lg:max-w-2xl">
        <header className="sticky top-0 z-20 -mx-5 border-b border-border bg-background/95 px-5 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/85">
          <div className="flex h-12 items-center gap-3">
            <Link
              aria-label="Voltar para comunidades"
              className="grid h-10 w-10 place-items-center rounded-full text-muted transition hover:bg-primary-soft hover:text-primary"
              href="/app/community"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Link>
            <h1 className="text-xl font-black text-foreground">Solicitar Nova Comunidade</h1>
          </div>
        </header>

        <section className="grid gap-5 rounded-[var(--lectum-card-radius)] border border-border bg-surface p-5 shadow-[var(--lectum-shadow-soft)]">
          <div className="relative grid min-h-[194px] place-items-center overflow-hidden rounded-[var(--lectum-card-radius)] bg-primary-soft">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-soft via-surface-muted to-background" />
            <div className="relative flex flex-wrap justify-center gap-2 px-8">
              {illustrationPeople.map((person, index) => (
                <span
                  className={cn(
                    "grid h-12 w-12 place-items-center rounded-full border border-background/70 bg-surface text-primary shadow-[var(--lectum-shadow-soft)]",
                    index % 3 === 0 && "mt-8",
                    index % 4 === 0 && "-mt-4",
                  )}
                  key={person}
                >
                  <UsersRound className="h-5 w-5" aria-hidden="true" />
                </span>
              ))}
            </div>
          </div>

          <p className="px-2 text-center text-base leading-7 text-foreground">
            Sua voz é fundamental. Ajude-nos a criar espaços que acolham suas necessidades e de
            outras pessoas.
          </p>

          <form className="grid gap-4" id="suggest-community-form" noValidate onSubmit={onSubmit}>
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

            {visibleError ? (
              <InlineAlert title="Não foi possível enviar" variant="error">
                {visibleError}
              </InlineAlert>
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
