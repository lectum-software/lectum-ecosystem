"use client";

import { Camera, Info, Loader2, UserRoundX, UsersRound, Video, X } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Controller } from "react-hook-form";
import { useCommunities, useCreateCommunityPost } from "@/api/callers/community";
import { components } from "@/components/controllers";
import { InlineAlert } from "@/components/ui/inline-alert";
import { useAppSelector } from "@/hooks/redux";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { COMMUNITY_FEED_SLUG, DEFAULT_COMMUNITY_FEED_HREF } from "@/utils/community";
import { toCreateCommunityPostPayload, useCreateCommunityPostForm } from "./use-form";

type ApiErrorData = {
  error?: string;
  message?: string;
  status?: number;
};

type ApiError = Error & {
  data?: ApiErrorData;
};

const normalizeParam = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) return value[0];

  return value;
};

const resolveCreatePostError = (error: unknown) => {
  const apiError = error as ApiError;
  const rawMessage =
    apiError?.data?.error ||
    apiError?.data?.message ||
    (error instanceof Error ? error.message : "");
  const normalized = rawMessage.toLowerCase();

  if (normalized.includes("comunidade") || normalized.includes("community")) {
    return "Escolha uma comunidade válida para publicar.";
  }

  if (normalized.includes("título") || normalized.includes("titulo")) {
    return "Informe um título para continuar.";
  }

  if (normalized.includes("conteúdo") || normalized.includes("conteudo")) {
    return "Escreva o texto da publicação para continuar.";
  }

  if (normalized.includes("sess") || normalized.includes("token")) {
    return "Sua sessão precisa estar ativa para criar uma publicação.";
  }

  if (normalized.includes("network") || normalized.includes("conex")) {
    return "Não foi possível conectar à API agora. Tente novamente em instantes.";
  }

  return rawMessage || "Não foi possível publicar agora. Tente novamente em instantes.";
};

const guidanceText =
  "Lembre-se de ser respeitoso com os outros membros. Conteúdos ofensivos ou que violem as diretrizes serão removidos pela moderação.";
const communityNameCollator = new Intl.Collator("pt-BR", {
  sensitivity: "base",
});

export const CreateCommunityPostLogic = () => {
  const router = useRouter();
  const params = useParams<{ slug?: string | string[] }>();
  const routeSlug = normalizeParam(params?.slug);
  const storedUser = useAppSelector((state) => state.user);
  const isPsychologist = storedUser?.role === "psicologo";
  const [apiError, setApiError] = useState<string | null>(null);

  const communitiesQuery = useCommunities({ limit: 50 });
  const communityOptions = useMemo(
    () =>
      (communitiesQuery.data?.data ?? [])
        .map((community) => ({
          label: community.name,
          value: community.slug,
          group: community.category ?? undefined,
        }))
        .sort((a, b) => communityNameCollator.compare(a.label, b.label)),
    [communitiesQuery.data?.data],
  );
  const defaultCommunitySlug = routeSlug && routeSlug !== COMMUNITY_FEED_SLUG ? routeSlug : null;

  const form = useCreateCommunityPostForm({
    communityOptions,
    defaultCommunitySlug,
    isPsychologist,
    loadingCommunities: communitiesQuery.isLoading,
  });
  const { formProps, hook } = form;

  const mutation = useCreateCommunityPost({
    onSuccess: (post) => {
      setApiError(null);
      router.push(`/app/community/${post.community.slug}/post/success?postId=${post.id}`);
    },
    onError: (error) => setApiError(resolveCreatePostError(error)),
  });

  useEffect(() => {
    if (!defaultCommunitySlug || communityOptions.length === 0) return;

    const selected = hook.getValues("community_slug");
    const hasOption = communityOptions.some((option) => option.value === defaultCommunitySlug);

    if (!selected && hasOption) {
      hook.setValue("community_slug", defaultCommunitySlug, {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: true,
      });
    }
  }, [communityOptions, defaultCommunitySlug, hook]);

  const visibleError = useMemo(() => {
    if (apiError) return apiError;
    if (!hook.formState.isSubmitted) return null;

    return Object.values(hook.formState.errors)[0]?.message?.toString() ?? null;
  }, [apiError, hook.formState.errors, hook.formState.isSubmitted]);

  const hasNoCommunities = communitiesQuery.isSuccess && communityOptions.length === 0;
  const isSubmitDisabled = mutation.isPending || communitiesQuery.isLoading || hasNoCommunities;

  const onSubmit = hook.handleSubmit((values) => {
    setApiError(null);
    mutation.mutate({
      slug: values.community_slug,
      body: toCreateCommunityPostPayload(values, isPsychologist),
    });
  });

  return (
    <PrivateTemplate
      contentClassName="max-w-none bg-white px-0 py-0 dark:bg-background"
      showMobileNavigation={false}
      showNavigation={false}
    >
      <section className="mx-auto min-h-screen w-full max-w-[430px] bg-white text-[#111827] dark:bg-background dark:text-foreground">
        <header className="relative flex h-[58px] items-center justify-center border-[#EEF0F3] border-b px-4">
          <Link
            aria-label="Fechar criação de post"
            className="absolute left-2 grid h-10 w-10 place-items-center rounded-full text-[#111827] transition hover:bg-[#F5F7FA] dark:text-foreground dark:hover:bg-surface-muted"
            href={DEFAULT_COMMUNITY_FEED_HREF}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </Link>
          <h1 className="text-[20px] font-extrabold tracking-[-0.02em]">Criar Post</h1>
        </header>

        <form className="grid gap-5 px-[18px] pt-5 pb-8" noValidate onSubmit={onSubmit}>
          <div className="grid gap-4">
            {formProps.fields
              .filter((field) => field.name !== "anonymous")
              .map((field) => {
                const Component = components[field.field];

                if (!Component) return null;

                if (field.name === "community_slug") {
                  return (
                    <div className="relative w-fit" key="create-post-community">
                      <UsersRound
                        aria-hidden="true"
                        className="pointer-events-none absolute top-5 left-3 z-10 h-4 w-4 -translate-y-1/2 text-[#111827] dark:text-foreground"
                      />
                      <Component
                        control={hook.control}
                        {...field}
                        inputClassName={cn("pl-9", field.inputClassName)}
                      />
                    </div>
                  );
                }

                return (
                  <Component
                    control={hook.control}
                    key={`create-post-${String(field.name)}`}
                    {...field}
                  />
                );
              })}
          </div>

          {!isPsychologist ? (
            <Controller
              control={hook.control}
              name="anonymous"
              render={({ field }) => {
                const checked = Boolean(field.value);

                return (
                  <div className="-mx-[18px] border-[#EEF0F3] border-y px-[18px] py-4">
                    <div className="flex min-h-8 items-center justify-between gap-4">
                      <span className="inline-flex items-center gap-2 text-sm font-medium text-[#6B7280]">
                        <UserRoundX className="h-5 w-5" aria-hidden="true" />
                        Postar como anônimo
                      </span>
                      <button
                        aria-checked={checked}
                        aria-label="Postar como anônimo"
                        className={cn(
                          "relative h-7 w-12 rounded-full bg-[#EDF1F7] transition focus:outline-none focus:ring-4 focus:ring-[#308CE8]/15",
                          checked && "bg-[#308CE8]",
                        )}
                        onBlur={field.onBlur}
                        onClick={() => field.onChange(!checked)}
                        role="switch"
                        type="button"
                      >
                        <span
                          className={cn(
                            "absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow-sm transition",
                            checked && "translate-x-5",
                          )}
                        />
                      </button>
                    </div>
                  </div>
                );
              }}
            />
          ) : (
            <section className="grid gap-3">
              <p className="text-xs font-extrabold tracking-[0.08em] text-[#64748B] uppercase">
                Adicionar mídia
              </p>
              <div className="grid min-h-[128px] place-items-center rounded-2xl border border-[#DDE3EA] border-dashed px-5 py-5 text-center text-[#64748B]">
                <div className="grid gap-2">
                  <div className="flex items-center justify-center gap-4 text-[#64748B]">
                    <Camera className="h-7 w-7" aria-hidden="true" />
                    <Video className="h-7 w-7" aria-hidden="true" />
                  </div>
                  <p className="text-sm font-semibold text-[#111827] dark:text-foreground">
                    Toque para carregar fotos ou vídeos
                  </p>
                  <p className="text-xs">PNG, JPG ou MP4 (Máx. 50MB)</p>
                  <p className="text-[11px] leading-4 text-[#8A94A6]">
                    Upload será ativado quando o storage R2 estiver configurado.
                  </p>
                </div>
              </div>
            </section>
          )}

          <div className="flex gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-4 text-sm leading-6 text-[#64748B] dark:border-border dark:bg-surface dark:text-muted">
            <Info className="mt-1 h-5 w-5 shrink-0" aria-hidden="true" />
            <p>{guidanceText}</p>
          </div>

          {communitiesQuery.isError ? (
            <InlineAlert title="Não foi possível carregar comunidades" variant="error">
              Verifique sua conexão e tente novamente.
            </InlineAlert>
          ) : null}

          {hasNoCommunities ? (
            <InlineAlert title="Nenhuma comunidade disponível" variant="info">
              Ainda não há comunidades publicadas para receber posts.
            </InlineAlert>
          ) : null}

          {visibleError ? (
            <InlineAlert title="Não foi possível publicar" variant="error">
              {visibleError}
            </InlineAlert>
          ) : null}

          <Button
            className="mt-2 h-[56px] w-full rounded-xl bg-[#11162A] text-base font-semibold shadow-[0_10px_22px_rgba(17,22,42,0.16)] hover:bg-[#0B1022]"
            disabled={isSubmitDisabled}
            type="submit"
          >
            {mutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            ) : null}
            Postar
          </Button>
        </form>
      </section>
    </PrivateTemplate>
  );
};
