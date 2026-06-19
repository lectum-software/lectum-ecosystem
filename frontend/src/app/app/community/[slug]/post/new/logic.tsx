"use client";

import { FileVideo, Info, Lightbulb, Loader2, X } from "lucide-react";
import Image from "next/image";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Controller } from "react-hook-form";
import { toast } from "sonner";
import { useCommunities, useCreateCommunityPost } from "@/api/callers/community";
import { components } from "@/components/controllers";
import { InlineAlert } from "@/components/ui/inline-alert";
import { useAppSelector } from "@/hooks/redux";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { COMMUNITY_FEED_SLUG, DEFAULT_COMMUNITY_FEED_HREF } from "@/utils/community";
import { navigateBackWithFallback } from "@/utils/navigation-history";
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
    return "Escolha uma comunidade válida para postar.";
  }

  if (normalized.includes("título") || normalized.includes("titulo")) {
    return "Informe um título para continuar.";
  }

  if (normalized.includes("conteúdo") || normalized.includes("conteudo")) {
    return "Escreva o texto do post para continuar.";
  }

  if (normalized.includes("sess") || normalized.includes("token")) {
    return "Sua sessão precisa estar ativa para criar um post.";
  }

  if (normalized.includes("network") || normalized.includes("conex")) {
    return "Não foi possível conectar à API agora. Tente novamente em instantes.";
  }

  return rawMessage || "Não foi possível postar agora. Tente novamente em instantes.";
};

const guidanceText =
  "Lembre-se de ser respeitoso com os outros membros. Conteúdos ofensivos ou que violem as diretrizes serão removidos pela moderação.";
const anonymousTipText =
  "Publicar com seu nome ajuda a tornar as conversas mais pessoais e acolhedoras.\n\nPara preservar sua privacidade, você também pode utilizar no perfil apenas seu primeiro nome ou um apelido.";
const COMMUNITY_SELECTOR_ICON_SRC = "/svg/public_24dp_64748B_FILL0_wght400_GRAD0_opsz24.svg";
const communityNameCollator = new Intl.Collator("pt-BR", {
  sensitivity: "base",
});
const SHEET_CLOSE_DELAY_MS = 220;
const EDITOR_FIELD_IDS = new Set(["create-post-title", "create-post-content"]);

type CreateCommunityPostLogicProps = {
  asModalSlot?: boolean;
};

export const CreateCommunityPostLogic = ({
  asModalSlot = false,
}: CreateCommunityPostLogicProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams<{ slug?: string | string[] }>();
  const routeSlug = normalizeParam(params?.slug);
  const communitySlugFromQuery = searchParams.get("community")?.trim() || null;
  const storedUser = useAppSelector((state) => state.user);
  const isPsychologist = storedUser?.role === "psicologo";
  const [apiError, setApiError] = useState<string | null>(null);
  const [isGuidanceOpen, setIsGuidanceOpen] = useState(false);
  const [isAnonymousTipDismissed, setIsAnonymousTipDismissed] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const closeTimerRef = useRef<number | null>(null);
  const lastEditedValuesRef = useRef({ community: "", content: "", title: "" });
  const lastFocusedEditorIdRef = useRef("create-post-title");

  const communitiesQuery = useCommunities({ limit: 50 });
  const communityOptions = useMemo(
    () =>
      (communitiesQuery.data?.data ?? [])
        .map((community) => ({
          label: community.name,
          value: community.slug,
        }))
        .sort((a, b) => communityNameCollator.compare(a.label, b.label)),
    [communitiesQuery.data?.data],
  );
  const defaultCommunitySlug =
    routeSlug && routeSlug !== COMMUNITY_FEED_SLUG ? routeSlug : communitySlugFromQuery;

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
    } else if (selected === defaultCommunitySlug && !hasOption) {
      hook.setValue("community_slug", "", {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: true,
      });
    }
  }, [communityOptions, defaultCommunitySlug, hook]);

  const watchedCommunitySlug = hook.watch("community_slug");
  const watchedTitle = hook.watch("title");
  const watchedContent = hook.watch("content");
  const selectedCommunityIsValid = communityOptions.some(
    (option) => option.value === watchedCommunitySlug,
  );
  const titleMeetsMinimum = String(watchedTitle ?? "").trim().length >= 3;
  const contentMeetsMinimum = String(watchedContent ?? "").trim().length >= 10;
  const requiredFieldsReady = Boolean(
    selectedCommunityIsValid && titleMeetsMinimum && contentMeetsMinimum,
  );
  const activeFormErrorMessages = useMemo(
    () =>
      Object.values(hook.formState.errors)
        .map((error) => error?.message?.toString())
        .filter(Boolean),
    [hook.formState.errors],
  );
  const visibleError = useMemo(() => {
    if (apiError) return apiError;
    if (!hook.formState.isSubmitted) return null;

    return activeFormErrorMessages[0] ?? null;
  }, [activeFormErrorMessages, apiError, hook.formState.isSubmitted]);
  const hasNoCommunities = communitiesQuery.isSuccess && communityOptions.length === 0;
  const isSubmitDisabled = mutation.isPending || communitiesQuery.isLoading || hasNoCommunities;

  useEffect(() => {
    if (selectedCommunityIsValid && hook.formState.errors.community_slug) {
      hook.clearErrors("community_slug");
    }
  }, [hook, hook.formState.errors.community_slug, selectedCommunityIsValid]);

  useEffect(() => {
    if (titleMeetsMinimum && hook.formState.errors.title) {
      hook.clearErrors("title");
    }
  }, [hook, hook.formState.errors.title, titleMeetsMinimum]);

  useEffect(() => {
    if (contentMeetsMinimum && hook.formState.errors.content) {
      hook.clearErrors("content");
    }
  }, [contentMeetsMinimum, hook, hook.formState.errors.content]);

  useEffect(() => {
    const nextValues = {
      community: String(watchedCommunitySlug ?? ""),
      content: String(watchedContent ?? ""),
      title: String(watchedTitle ?? ""),
    };
    const hasEdited =
      nextValues.community !== lastEditedValuesRef.current.community ||
      nextValues.content !== lastEditedValuesRef.current.content ||
      nextValues.title !== lastEditedValuesRef.current.title;

    lastEditedValuesRef.current = nextValues;

    if (hasEdited && apiError) {
      setApiError(null);
    }
  }, [apiError, watchedCommunitySlug, watchedContent, watchedTitle]);

  const focusLastEditor = () => {
    window.setTimeout(() => {
      const target = document.getElementById(lastFocusedEditorIdRef.current) as
        | HTMLInputElement
        | HTMLTextAreaElement
        | null;
      target?.focus({ preventScroll: true });
    }, 0);
  };

  const preserveEditorFocusFromBlankTap = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) return;

    event.preventDefault();
    focusLastEditor();
  };

  const handleClose = useCallback(() => {
    setIsSheetOpen(false);
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);

    closeTimerRef.current = window.setTimeout(() => {
      const fallbackHref =
        routeSlug && routeSlug !== COMMUNITY_FEED_SLUG
          ? `/app/community/${routeSlug}`
          : DEFAULT_COMMUNITY_FEED_HREF;

      navigateBackWithFallback(router, fallbackHref);
    }, SHEET_CLOSE_DELAY_MS);
  }, [routeSlug, router]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setIsSheetOpen(true));
    const focusTimer = window.setTimeout(() => {
      document.getElementById("create-post-title")?.focus({ preventScroll: true });
    }, 280);
    const previousBodyOverflow = document.body.style.overflow;
    const previousDocumentOverflow = document.documentElement.style.overflow;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
      }
    };

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(focusTimer);
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousDocumentOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [handleClose]);

  const onSubmit = hook.handleSubmit((values) => {
    setApiError(null);
    mutation.mutate({
      slug: values.community_slug,
      body: toCreateCommunityPostPayload(values, isPsychologist),
    });
  });

  const clearCorrectedFormErrorsSoon = () => {
    window.setTimeout(() => {
      const values = hook.getValues();
      const hasValidCommunity = communityOptions.some(
        (option) => option.value === values.community_slug,
      );
      const hasValidTitle = String(values.title ?? "").trim().length >= 3;
      const hasValidContent = String(values.content ?? "").trim().length >= 10;

      if (hasValidCommunity) {
        hook.clearErrors("community_slug");
      }

      if (hasValidTitle) {
        hook.clearErrors("title");
      }

      if (hasValidContent) {
        hook.clearErrors("content");
      }

      if (hasValidCommunity && hasValidTitle && hasValidContent) {
        hook.clearErrors();
      }
    }, 0);
  };

  const renderFormField = (field: (typeof formProps.fields)[number]) => {
    const Component = components[field.field];

    if (!Component) return null;

    if (field.name === "community_slug") {
      return (
        <div
          className="relative inline-block w-fit max-w-full align-top"
          key="create-post-community"
        >
          <Image
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute top-5 left-4 z-10 h-4 w-4 -translate-y-1/2 text-muted"
            height={16}
            src={COMMUNITY_SELECTOR_ICON_SRC}
            width={16}
          />
          <Component
            control={hook.control}
            {...field}
            inputClassName={cn(
              field.inputClassName,
              "pl-11 pr-10 leading-[1.35] [&>span]:leading-[1.35]",
            )}
            onChangeCallback={(value) => {
              field.onChangeCallback?.(value);
              hook.clearErrors("community_slug");
              clearCorrectedFormErrorsSoon();
              setApiError(null);
            }}
          />
        </div>
      );
    }

    if (field.name === "title") {
      return (
        <Component
          control={hook.control}
          key={`create-post-${String(field.name)}`}
          {...field}
          onChangeCallback={(value) => {
            field.onChangeCallback?.(value);
            if (String(value ?? "").trim().length >= 3) {
              hook.clearErrors("title");
            }
            clearCorrectedFormErrorsSoon();
            setApiError(null);
          }}
        />
      );
    }

    if (field.name === "content") {
      return (
        <Component
          control={hook.control}
          key={`create-post-${String(field.name)}`}
          {...field}
          onChangeCallback={(value) => {
            field.onChangeCallback?.(value);
            if (String(value ?? "").trim().length >= 10) {
              hook.clearErrors("content");
            }
            clearCorrectedFormErrorsSoon();
            setApiError(null);
          }}
        />
      );
    }

    return (
      <Component control={hook.control} key={`create-post-${String(field.name)}`} {...field} />
    );
  };

  const renderAnonymousControls = () => (
    <Controller
      control={hook.control}
      name="anonymous"
      render={({ field }) => {
        const checked = Boolean(field.value);

        return (
          <div className="relative min-w-0 flex-1">
            {checked && !isAnonymousTipDismissed ? (
              <div className="absolute bottom-[calc(100%+0.75rem)] left-0 z-20 w-[min(21rem,calc(100vw-2rem))] rounded-2xl border border-primary/15 bg-surface px-4 py-3 pr-9 text-xs leading-5 text-muted shadow-[var(--lectum-shadow-soft)]">
                <button
                  aria-label="Fechar dica sobre anonimato"
                  className="absolute top-2.5 right-2.5 grid h-7 w-7 place-items-center rounded-full text-subtle transition hover:bg-surface-muted hover:text-foreground focus:outline-none focus:ring-4 focus:ring-primary/15"
                  onClick={() => {
                    setIsAnonymousTipDismissed(true);
                    focusLastEditor();
                  }}
                  onMouseDown={(event) => event.preventDefault()}
                  tabIndex={-1}
                  type="button"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
                    <Lightbulb className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    {anonymousTipText.split("\n\n").map((paragraph, index) => (
                      <p className={cn(index > 0 && "mt-2")} key={paragraph}>
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex min-w-0 items-center gap-2.5">
              <span className="min-w-0 text-[0.78rem] font-bold leading-4 text-muted sm:text-sm">
                Publicar anonimamente
              </span>
              <button
                aria-checked={checked}
                aria-label="Publicar anonimamente"
                className={cn(
                  "relative h-7 w-12 shrink-0 rounded-full bg-surface-muted ring-1 ring-border transition focus:outline-none focus:ring-4 focus:ring-primary/15",
                  checked && "bg-primary ring-primary/20",
                )}
                onBlur={field.onBlur}
                onClick={() => {
                  const nextChecked = !checked;

                  field.onChange(nextChecked);
                  if (!nextChecked) {
                    setIsAnonymousTipDismissed(false);
                  }
                  focusLastEditor();
                }}
                onMouseDown={(event) => event.preventDefault()}
                role="switch"
                tabIndex={-1}
                type="button"
              >
                <span
                  className={cn(
                    "absolute top-1 left-1 h-5 w-5 rounded-full bg-surface shadow-[var(--lectum-shadow-soft)] transition",
                    checked && "translate-x-5",
                  )}
                />
              </button>
            </div>
          </div>
        );
      }}
    />
  );

  const renderPsychologistMediaButton = () => (
    <button
      aria-label="Adicionar mídia ao post"
      className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-border bg-surface-muted px-3.5 text-sm font-bold text-muted transition hover:border-primary/30 hover:bg-primary-soft hover:text-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
      onClick={() => {
        toast.info("Upload de mídia para posts depende do storage R2 real configurado.");
        focusLastEditor();
      }}
      onMouseDown={(event) => event.preventDefault()}
      tabIndex={-1}
      type="button"
    >
      <FileVideo className="h-5 w-5" aria-hidden="true" />
      <span className="hidden sm:inline">Mídia</span>
    </button>
  );

  const sheet = (
    <div
      className={cn(
        "fixed inset-0 z-[70] flex items-end justify-center transition-opacity duration-200 ease-out",
        asModalSlot
          ? "bg-slate-950/5 backdrop-blur-[6px] supports-[backdrop-filter]:bg-white/10"
          : "bg-background",
        isSheetOpen ? "opacity-100" : "opacity-0",
      )}
    >
      <section
        aria-labelledby="create-post-title-heading"
        aria-modal="true"
        className={cn(
          "flex h-[calc(100dvh_-_env(safe-area-inset-top)_-_0.75rem)] w-full max-w-[min(100vw,44rem)] flex-col overflow-hidden rounded-t-[2rem] border border-border bg-surface text-foreground shadow-[var(--lectum-shadow)] transition-transform duration-300 ease-out sm:mb-6 sm:h-[min(86dvh,760px)] sm:rounded-[2rem]",
          isSheetOpen ? "translate-y-0" : "translate-y-full",
        )}
        role="dialog"
      >
        <header className="relative flex h-16 shrink-0 items-center justify-center border-border/70 border-b px-4">
          <button
            aria-label="Fechar criação de post e voltar"
            className="absolute left-3 grid h-10 w-10 place-items-center rounded-full text-foreground transition hover:bg-surface-muted focus:outline-none focus:ring-4 focus:ring-primary/15"
            onClick={handleClose}
            type="button"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
          <h1
            className="text-[1.2rem] font-black tracking-[-0.03em]"
            id="create-post-title-heading"
          >
            Criar Post
          </h1>
          <div className="absolute right-3">
            <button
              aria-expanded={isGuidanceOpen}
              aria-label="Ver diretrizes do post"
              className="grid h-10 w-10 place-items-center rounded-full text-muted transition hover:bg-surface-muted hover:text-foreground focus:outline-none focus:ring-4 focus:ring-primary/15"
              onClick={() => {
                setIsGuidanceOpen((current) => !current);
                focusLastEditor();
              }}
              onMouseDown={(event) => event.preventDefault()}
              tabIndex={-1}
              type="button"
            >
              <Info className="h-5 w-5" aria-hidden="true" />
            </button>
            {isGuidanceOpen ? (
              <div className="absolute top-12 right-0 z-30 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-border bg-surface px-4 py-3 text-xs leading-5 text-muted shadow-[var(--lectum-shadow-soft)]">
                {guidanceText}
              </div>
            ) : null}
          </div>
        </header>

        <form
          className="flex min-h-0 flex-1 flex-col"
          noValidate
          onFocusCapture={(event) => {
            const target = event.target as HTMLElement;
            if (EDITOR_FIELD_IDS.has(target.id)) {
              lastFocusedEditorIdRef.current = target.id;
            }
          }}
          onSubmit={onSubmit}
        >
          <div
            className="flex min-h-0 flex-1 flex-col overflow-hidden px-5 pt-4 pb-4"
            onPointerDown={preserveEditorFocusFromBlankTap}
          >
            <div className="flex min-h-0 flex-1 flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                {formProps.fields
                  .filter((field) => field.name === "community_slug")
                  .map(renderFormField)}
              </div>

              <div onPointerDown={preserveEditorFocusFromBlankTap}>
                {formProps.fields.filter((field) => field.name === "title").map(renderFormField)}
              </div>

              <div className="min-h-0 flex-1" onPointerDown={preserveEditorFocusFromBlankTap}>
                {formProps.fields.filter((field) => field.name === "content").map(renderFormField)}
              </div>

              <div className="grid gap-3 pb-2">
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
                  <InlineAlert title="Não foi possível postar" variant="error">
                    {visibleError}
                  </InlineAlert>
                ) : null}
              </div>
            </div>
          </div>

          <footer className="relative shrink-0 border-border/70 border-t bg-surface/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur supports-[backdrop-filter]:bg-surface/90">
            <div className="flex min-h-12 items-center justify-between gap-3">
              {isPsychologist ? renderPsychologistMediaButton() : renderAnonymousControls()}

              <Button
                className={cn(
                  "h-12 min-w-[6.5rem] shrink-0 rounded-full px-6 text-base font-black shadow-[var(--lectum-shadow-soft)] disabled:bg-surface-muted disabled:text-muted disabled:opacity-100 disabled:shadow-none",
                  !requiredFieldsReady &&
                    "bg-surface-muted text-muted shadow-none hover:bg-surface-muted",
                )}
                disabled={isSubmitDisabled}
                type="submit"
              >
                {mutation.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                ) : null}
                Postar
              </Button>
            </div>
          </footer>
        </form>
      </section>
    </div>
  );

  if (asModalSlot) {
    return sheet;
  }

  return (
    <PrivateTemplate
      contentClassName="max-w-none bg-background px-0 py-0"
      showMobileNavigation={false}
      showNavigation={false}
    >
      {sheet}
    </PrivateTemplate>
  );
};
