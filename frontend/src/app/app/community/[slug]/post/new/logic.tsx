"use client";

import { Info, Lightbulb, Loader2, Video, X } from "lucide-react";
import Image from "next/image";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Controller } from "react-hook-form";
import { toast } from "sonner";
import {
  useCommunities,
  useCreateCommunityPost,
  useUploadCommunityPostMedia,
} from "@/api/callers/community";
import { components } from "@/components/controllers";
import { InlineAlert } from "@/components/ui/inline-alert";
import { useAppSelector } from "@/hooks/redux";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { COMMUNITY_FEED_SLUG, DEFAULT_COMMUNITY_FEED_HREF } from "@/utils/community";
import { getCommunityMediaPermission } from "@/utils/community-media-permission";
import { navigateBackWithFallback } from "@/utils/navigation-history";
import {
  type CreateCommunityPostForm,
  toCreateCommunityPostPayload,
  useCreateCommunityPostForm,
} from "./use-form";

type ApiErrorData = {
  error?: string;
  message?: string;
  status?: number;
};

type ApiError = Error & {
  data?: ApiErrorData;
};

type CreatePostErrorResolution = {
  field?: keyof CreateCommunityPostForm;
  message: string;
};

const normalizeParam = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) return value[0];

  return value;
};

const resolveCreatePostError = (error: unknown): CreatePostErrorResolution => {
  const apiError = error as ApiError;
  const rawMessage =
    apiError?.data?.error ||
    apiError?.data?.message ||
    (error instanceof Error ? error.message : "");
  const normalized = rawMessage.toLowerCase();

  if (normalized.includes("comunidade") || normalized.includes("community")) {
    return {
      field: "community_slug",
      message: "Escolha uma comunidade para postar",
    };
  }

  if (normalized.includes("título") || normalized.includes("titulo")) {
    return {
      field: "title",
      message: "Escreva um título com pelo menos 3 caracteres",
    };
  }

  if (
    normalized.includes("conteúdo") ||
    normalized.includes("conteudo") ||
    normalized.includes("descri")
  ) {
    return {
      field: "content",
      message: "Escreva uma descrição com pelo menos 10 caracteres",
    };
  }

  if (normalized.includes("sess") || normalized.includes("token")) {
    return { message: "Sua sessão precisa estar ativa para criar um post." };
  }

  if (normalized.includes("network") || normalized.includes("conex")) {
    return { message: "Não foi possível conectar à API agora. Tente novamente em instantes." };
  }

  return {
    message: rawMessage || "Não foi possível publicar agora. Tente novamente em instantes.",
  };
};

const resolveMediaUploadError = (error: unknown) => {
  const apiError = error as ApiError;
  const rawMessage =
    apiError?.data?.error ||
    apiError?.data?.message ||
    (error instanceof Error ? error.message : "");
  const normalized = rawMessage.toLowerCase();

  if (
    normalized.includes("tamanho") ||
    normalized.includes("limite") ||
    normalized.includes("50")
  ) {
    return "A m\u00eddia precisa ter at\u00e9 50MB.";
  }

  if (normalized.includes("tipo") || normalized.includes("permit")) {
    return "Envie uma imagem ou v\u00eddeo em formato permitido.";
  }

  if (normalized.includes("plano") || normalized.includes("verific")) {
    return "M\u00eddia dispon\u00edvel apenas para psic\u00f3logos verificados.";
  }

  return rawMessage || "N\u00e3o foi poss\u00edvel anexar a m\u00eddia agora. Tente novamente.";
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
const LAST_CREATED_POST_HREF_KEY = "lectum:last-created-post-href";
const COMMUNITY_POST_MEDIA_ACCEPT =
  "image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime";

type SelectedPostMedia = {
  file: File;
  previewUrl: string;
  type: "image" | "video";
};

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
  const mediaPermission = getCommunityMediaPermission(storedUser);
  const [isGuidanceOpen, setIsGuidanceOpen] = useState(false);
  const [isAnonymousTipDismissed, setIsAnonymousTipDismissed] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<SelectedPostMedia | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastFocusedEditorIdRef = useRef("create-post-title");
  const selectedMediaPreviewUrlRef = useRef<string | null>(null);

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
      const publicationHref = `/app/community/${post.community.slug}/post/${post.id}`;

      window.sessionStorage.setItem(LAST_CREATED_POST_HREF_KEY, publicationHref);
      setIsSheetOpen(false);
      toast.success("Post publicado!");
      router.replace(publicationHref);
    },
    onError: (error) => {
      const resolvedError = resolveCreatePostError(error);

      if (resolvedError.field) {
        hook.setError(
          resolvedError.field,
          {
            message: resolvedError.message,
            type: "server",
          },
          { shouldFocus: true },
        );
        return;
      }

      toast.error(resolvedError.message);
    },
  });
  const uploadMutation = useUploadCommunityPostMedia({
    onError: (error) => {
      toast.error(resolveMediaUploadError(error));
    },
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
  const hasNoCommunities = communitiesQuery.isSuccess && communityOptions.length === 0;
  const isSubmitting = mutation.isPending || uploadMutation.isPending;
  const isSubmitDisabled = isSubmitting || communitiesQuery.isLoading || hasNoCommunities;

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

  const revokeSelectedMediaPreview = useCallback(() => {
    if (!selectedMediaPreviewUrlRef.current) return;

    URL.revokeObjectURL(selectedMediaPreviewUrlRef.current);
    selectedMediaPreviewUrlRef.current = null;
  }, []);

  const clearSelectedMedia = useCallback(() => {
    revokeSelectedMediaPreview();
    setSelectedMedia(null);
  }, [revokeSelectedMediaPreview]);

  const handleClose = useCallback(() => {
    setIsSheetOpen(false);
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);

    closeTimerRef.current = window.setTimeout(() => {
      const fallbackHref =
        routeSlug && routeSlug !== COMMUNITY_FEED_SLUG
          ? `/app/community/${routeSlug}`
          : communitySlugFromQuery
            ? `${DEFAULT_COMMUNITY_FEED_HREF}?community=${encodeURIComponent(communitySlugFromQuery)}`
            : DEFAULT_COMMUNITY_FEED_HREF;

      navigateBackWithFallback(router, fallbackHref);
    }, SHEET_CLOSE_DELAY_MS);
  }, [communitySlugFromQuery, routeSlug, router]);

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

  useEffect(() => {
    return () => revokeSelectedMediaPreview();
  }, [revokeSelectedMediaPreview]);

  const handleMediaChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.currentTarget.value = "";

    if (!file) return;

    if (!mediaPermission.canAttach) {
      toast.error(
        mediaPermission.reason ||
          "M\u00eddia dispon\u00edvel apenas para psic\u00f3logos verificados.",
      );
      focusLastEditor();
      return;
    }

    revokeSelectedMediaPreview();
    const previewUrl = URL.createObjectURL(file);
    selectedMediaPreviewUrlRef.current = previewUrl;
    setSelectedMedia({
      file,
      previewUrl,
      type: file.type.startsWith("image/") ? "image" : "video",
    });
    focusLastEditor();
  };

  const onSubmit = hook.handleSubmit(async (values) => {
    try {
      const mediaFile = mediaPermission.canAttach ? selectedMedia?.file : null;
      const media = mediaFile
        ? await uploadMutation.mutateAsync({
            file: mediaFile,
            slug: values.community_slug,
          })
        : null;

      await mutation.mutateAsync({
        slug: values.community_slug,
        body: {
          ...toCreateCommunityPostPayload(values, isPsychologist),
          ...(media
            ? {
                mediaType: media.media_type,
                mediaUrl: media.media_url,
              }
            : {}),
        },
      });
    } catch {
      // O feedback fica centralizado nas mutations para preservar o rascunho do post.
    }
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

  const renderSelectedMediaPreview = () => {
    if (!mediaPermission.canAttach || !selectedMedia) return null;

    return (
      <div className="mt-3 flex shrink-0 justify-start">
        <figure className="relative w-[min(9.5rem,48vw)] overflow-hidden rounded-[1.4rem] border border-border bg-surface-muted shadow-[var(--lectum-shadow-soft)] sm:w-28">
          <div className="relative aspect-[9/14] w-full overflow-hidden bg-surface-muted">
            {selectedMedia.type === "image" ? (
              <Image
                alt="Miniatura da mídia selecionada"
                className="object-cover"
                fill
                sizes="(min-width: 640px) 112px, 152px"
                src={selectedMedia.previewUrl}
                unoptimized
              />
            ) : (
              <video
                aria-label="Miniatura do vídeo selecionado"
                className="h-full w-full object-cover"
                muted
                playsInline
                preload="metadata"
                src={selectedMedia.previewUrl}
              />
            )}

            <button
              aria-label="Remover mídia anexada"
              className="absolute top-2 right-2 grid h-8 w-8 place-items-center rounded-full bg-surface/90 text-muted shadow-[var(--lectum-shadow-soft)] transition hover:bg-surface hover:text-foreground focus:outline-none focus:ring-4 focus:ring-primary/15"
              disabled={isSubmitting}
              onClick={() => {
                clearSelectedMedia();
                focusLastEditor();
              }}
              onMouseDown={(event) => event.preventDefault()}
              tabIndex={-1}
              type="button"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </figure>
      </div>
    );
  };

  const renderPsychologistMediaButton = () => (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
      <input
        accept={COMMUNITY_POST_MEDIA_ACCEPT}
        className="hidden"
        onChange={handleMediaChange}
        ref={fileInputRef}
        type="file"
      />
      <button
        aria-label="Adicionar midia ao post"
        className={cn(
          "inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-bold transition focus:outline-none focus:ring-4 focus:ring-primary/15",
          mediaPermission.canAttach
            ? "border-border bg-surface-muted text-muted hover:border-primary/30 hover:bg-primary-soft hover:text-primary"
            : "cursor-not-allowed border-[#E5EAF0] bg-[#F8FAFC] text-[#94A3B8] hover:border-[#E5EAF0] hover:bg-[#F8FAFC] hover:text-[#94A3B8]",
        )}
        disabled={!mediaPermission.canAttach || isSubmitting}
        onClick={() => {
          fileInputRef.current?.click();
          focusLastEditor();
        }}
        onMouseDown={(event) => event.preventDefault()}
        tabIndex={-1}
        title={mediaPermission.canAttach ? "Adicionar midia" : mediaPermission.reason}
        type="button"
      >
        {uploadMutation.isPending ? (
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        ) : (
          <Video className="h-5 w-5" aria-hidden="true" />
        )}
        <span className="hidden sm:inline">{"M\u00eddia"}</span>
      </button>

      {!mediaPermission.canAttach && mediaPermission.reason ? (
        <span className="min-w-0 flex-1 basis-52 whitespace-normal text-xs font-semibold leading-4 text-[#64748B]">
          {mediaPermission.reason}
        </span>
      ) : null}
    </div>
  );

  const sheet = (
    <div
      className={cn(
        "fixed inset-0 z-[70] flex items-end justify-center transition-opacity duration-200 ease-out",
        asModalSlot
          ? "bg-slate-950/35 backdrop-blur-[8px] supports-[backdrop-filter]:bg-slate-950/35"
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

              <div className="flex min-h-0 flex-1 flex-col gap-0">
                <div onPointerDown={preserveEditorFocusFromBlankTap}>
                  {formProps.fields.filter((field) => field.name === "title").map(renderFormField)}
                </div>

                <div
                  className="flex min-h-0 flex-1 flex-col"
                  onPointerDown={preserveEditorFocusFromBlankTap}
                >
                  {formProps.fields
                    .filter((field) => field.name === "content")
                    .map(renderFormField)}
                  {renderSelectedMediaPreview()}
                </div>
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
                {isSubmitting ? (
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
