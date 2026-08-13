"use client";

import { Camera, Info, Lightbulb, Loader2, X } from "lucide-react";
import Image from "next/image";
import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type TouchEvent as ReactTouchEvent,
  useEffect,
  useRef,
} from "react";
import { Controller } from "react-hook-form";
import { components } from "@/components/controllers";
import { InlineAlert } from "@/components/ui/inline-alert";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { useCreateCommunityPostController } from "../hooks/use-create-community-post-controller";
import {
  type CreatePostModalTouchScrollState,
  recordCreatePostModalTouchStart,
  shouldAllowCreatePostModalTouchMove,
} from "../modules/create-post-scroll-guard";
import {
  anonymousTipText,
  COMMUNITY_POST_MEDIA_ACCEPT,
  COMMUNITY_SELECTOR_ICON_SRC,
  type CreateCommunityPostLogicProps,
  EDITOR_FIELD_IDS,
  guidanceText,
} from "../modules/create-post-support";

export const CreateCommunityPostLogic = ({ onCloseComplete }: CreateCommunityPostLogicProps) => {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const touchScrollStateRef = useRef<CreatePostModalTouchScrollState>({
    startX: 0,
    startY: 0,
    target: null,
  });
  const controller = useCreateCommunityPostController({ onCloseComplete });
  const {
    clearCorrectedFormErrorsSoon,
    communitiesQuery,
    fileInputRef,
    focusEditorFromUserGesture,
    focusLastEditor,
    formProps,
    handleClose,
    handleMediaChange,
    hasNoCommunities,
    hook,
    isAnonymousTipDismissed,
    isGuidanceOpen,
    isPsychologist,
    isSheetOpen,
    isSubmitDisabled,
    isSubmitting,
    keyboardViewportOffset,
    mediaPermission,
    onSubmit,
    preserveEditorFocusFromBlankTap,
    registerEditorInteraction,
    removeSelectedMediaAt,
    requiredFieldsReady,
    selectedMediaItems,
    setIsAnonymousTipDismissed,
    setIsGuidanceOpen,
    updateSelectedMediaOrientation,
    uploadMutation,
  } = controller;
  const hasSelectedMedia = selectedMediaItems.length > 0;
  const preserveBlankTapFocus = hasSelectedMedia ? undefined : preserveEditorFocusFromBlankTap;
  const preserveTitleBlankTapFocus = preserveBlankTapFocus
    ? (event: ReactPointerEvent<HTMLElement>) => preserveBlankTapFocus(event, "create-post-title")
    : undefined;
  const preserveContentBlankTapFocus = preserveBlankTapFocus
    ? (event: ReactPointerEvent<HTMLElement>) => preserveBlankTapFocus(event, "create-post-content")
    : undefined;
  const registerTitleEditorGesture = () => registerEditorInteraction("create-post-title");
  const focusContentEditorFromGesture = (
    event: ReactPointerEvent<HTMLElement> | ReactTouchEvent<HTMLElement>,
  ) => {
    const target = event.target;

    if (
      target instanceof Element &&
      (target.closest("button,a,input,select,textarea,[role='button']") ||
        target.closest("[data-create-post-editor-ignore='true']"))
    ) {
      return;
    }

    focusEditorFromUserGesture("create-post-content");
  };

  useEffect(() => {
    const overlay = overlayRef.current;

    if (!overlay) return;

    const handleTouchStart = (event: TouchEvent) => {
      recordCreatePostModalTouchStart(touchScrollStateRef.current, event);
    };
    const handleTouchMove = (event: TouchEvent) => {
      if (!shouldAllowCreatePostModalTouchMove(touchScrollStateRef.current, event, overlay)) {
        event.preventDefault();
      }
    };

    overlay.addEventListener("touchstart", handleTouchStart, { passive: true });
    overlay.addEventListener("touchmove", handleTouchMove, { passive: false });

    return () => {
      overlay.removeEventListener("touchstart", handleTouchStart);
      overlay.removeEventListener("touchmove", handleTouchMove);
    };
  }, []);

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
    if (!mediaPermission.canAttach || selectedMediaItems.length === 0) return null;

    return (
      <ul
        aria-label="Mídias anexadas"
        data-create-post-editor-ignore="true"
        className="mt-2 flex max-h-28 shrink-0 gap-2 overflow-x-auto overflow-y-hidden pb-1"
      >
        {selectedMediaItems.map((mediaItem, index) => {
          const isLandscapePreview = mediaItem.orientation === "landscape";
          const frameClassName = isLandscapePreview
            ? "h-20 w-32 sm:h-[5.5rem] sm:w-[9.75rem]"
            : mediaItem.orientation === "portrait"
              ? "h-24 w-[4.4rem] sm:h-28 sm:w-20"
              : "h-20 w-20 sm:h-[5.5rem] sm:w-[5.5rem]";

          return (
            <li
              className={cn(
                "relative shrink-0 overflow-hidden rounded-[1.05rem] border border-border bg-surface-muted shadow-none",
                frameClassName,
              )}
              key={mediaItem.id}
            >
              {mediaItem.type === "image" ? (
                <Image
                  alt={`Miniatura da imagem anexada ${index + 1}`}
                  className="object-cover"
                  fill
                  onLoad={(event) => {
                    const { naturalHeight, naturalWidth } = event.currentTarget;
                    updateSelectedMediaOrientation(
                      mediaItem.id,
                      naturalWidth && naturalHeight && naturalWidth / naturalHeight >= 1.12
                        ? "landscape"
                        : "portrait",
                    );
                  }}
                  sizes="160px"
                  src={mediaItem.previewUrl}
                  unoptimized
                />
              ) : (
                <video
                  aria-label="Miniatura do vídeo selecionado"
                  className="h-full w-full object-cover"
                  muted
                  onLoadedMetadata={(event) => {
                    const { videoHeight, videoWidth } = event.currentTarget;
                    updateSelectedMediaOrientation(
                      mediaItem.id,
                      videoWidth && videoHeight && videoWidth / videoHeight >= 1.12
                        ? "landscape"
                        : "portrait",
                    );
                  }}
                  playsInline
                  preload="metadata"
                  src={mediaItem.previewUrl}
                />
              )}

              <button
                aria-label={`Remover mídia anexada ${index + 1}`}
                className="absolute top-1.5 right-1.5 grid h-7 w-7 place-items-center rounded-full bg-surface/92 text-muted shadow-none ring-1 ring-border/70 transition hover:bg-surface hover:text-foreground focus:outline-none focus:ring-4 focus:ring-primary/15"
                disabled={isSubmitting}
                onClick={() => {
                  removeSelectedMediaAt(index);
                  focusLastEditor();
                }}
                onMouseDown={(event) => event.preventDefault()}
                tabIndex={-1}
                type="button"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>
    );
  };

  const renderPsychologistMediaButton = () => (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
      <input
        accept={COMMUNITY_POST_MEDIA_ACCEPT}
        className="hidden"
        multiple
        onChange={handleMediaChange}
        ref={fileInputRef}
        type="file"
      />
      <button
        aria-label="Adicionar mídia ao post"
        className={cn(
          "grid h-11 w-11 shrink-0 place-items-center rounded-full border p-0 transition focus:outline-none focus:ring-4 focus:ring-primary/15 active:scale-[0.98] disabled:active:scale-100",
          mediaPermission.canAttach
            ? "border-primary bg-primary text-primary-foreground shadow-lectum-soft hover:border-primary-hover hover:bg-primary-hover"
            : "cursor-not-allowed border-border bg-surface-muted text-subtle opacity-75",
        )}
        data-reply-media-trigger="true"
        disabled={!mediaPermission.canAttach || isSubmitting}
        onClick={() => {
          fileInputRef.current?.click();
          focusLastEditor();
        }}
        onMouseDown={(event) => event.preventDefault()}
        tabIndex={-1}
        title={mediaPermission.canAttach ? "Adicionar mídia" : mediaPermission.reason}
        type="button"
      >
        {uploadMutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Camera className="h-4 w-4" aria-hidden="true" />
        )}
        <span className="sr-only">Adicionar mídia</span>
      </button>

      {!mediaPermission.canAttach && mediaPermission.reason ? (
        <span className="min-w-0 flex-1 basis-52 whitespace-normal text-xs font-semibold leading-4 text-muted">
          {mediaPermission.reason}
        </span>
      ) : null}
    </div>
  );

  const sheet = (
    <div
      className={cn(
        "fixed inset-0 z-[70] flex items-end justify-center overflow-hidden overscroll-none transition-opacity duration-200 ease-out",
        "bg-foreground/45 backdrop-blur-[8px] dark:bg-background/75",
        isSheetOpen ? "opacity-100" : "opacity-0",
      )}
      ref={overlayRef}
    >
      <section
        aria-labelledby="create-post-title-heading"
        aria-modal="true"
        className={cn(
          "mb-[var(--lectum-create-post-keyboard-offset)] flex h-[calc(100dvh_-_env(safe-area-inset-top)_-_0.75rem_-_var(--lectum-create-post-keyboard-offset))] w-full max-w-[min(100vw,44rem)] flex-col overflow-hidden overscroll-contain rounded-t-[2rem] border border-border bg-surface text-foreground shadow-[var(--lectum-shadow)] transition-[transform,height,margin-bottom] will-change-transform sm:mb-6 sm:h-[min(86dvh,760px)] sm:rounded-[2rem]",
          isSheetOpen
            ? "translate-y-0 duration-[340ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
            : "translate-y-[calc(100%+2rem)] duration-[300ms] ease-[cubic-bezier(0.4,0,1,1)]",
        )}
        data-create-post-sheet="true"
        data-create-post-sheet-state={isSheetOpen ? "open" : "closed"}
        role="dialog"
        style={
          {
            "--lectum-create-post-footer-bottom-padding":
              keyboardViewportOffset > 0 ? "0.35rem" : "max(0.75rem, env(safe-area-inset-bottom))",
            "--lectum-create-post-keyboard-offset": `${keyboardViewportOffset}px`,
          } as CSSProperties
        }
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
              registerEditorInteraction(target.id);
            }
          }}
          onSubmit={onSubmit}
        >
          <div
            className={cn(
              "flex min-h-0 flex-1 flex-col px-5 pt-4 pb-4",
              hasSelectedMedia
                ? "overflow-x-hidden overflow-y-auto overscroll-contain"
                : "overflow-hidden",
            )}
            data-create-post-editor-scroll={hasSelectedMedia ? "media" : "locked"}
            onPointerDown={preserveBlankTapFocus}
          >
            <div
              className={cn(
                "flex min-h-0 flex-col gap-3",
                hasSelectedMedia ? "min-h-full flex-none" : "flex-1",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                {formProps.fields
                  .filter((field) => field.name === "community_slug")
                  .map(renderFormField)}
              </div>

              <div className="flex min-h-0 flex-1 flex-col gap-0">
                <div
                  onPointerDown={preserveTitleBlankTapFocus}
                  onPointerDownCapture={registerTitleEditorGesture}
                  onTouchStartCapture={registerTitleEditorGesture}
                >
                  {formProps.fields.filter((field) => field.name === "title").map(renderFormField)}
                </div>

                <div
                  className="flex min-h-0 flex-1 flex-col"
                  onPointerDown={preserveContentBlankTapFocus}
                  onPointerDownCapture={focusContentEditorFromGesture}
                  onTouchStartCapture={focusContentEditorFromGesture}
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

          <footer className="relative shrink-0 border-border/70 border-t bg-surface/95 px-4 pt-2 pb-[var(--lectum-create-post-footer-bottom-padding)] backdrop-blur supports-[backdrop-filter]:bg-surface/90">
            <div className="flex min-h-11 items-center justify-between gap-3">
              {isPsychologist ? renderPsychologistMediaButton() : renderAnonymousControls()}

              <Button
                className={cn(
                  "h-11 min-w-[6.5rem] shrink-0 rounded-full px-6 font-sans text-base font-[800] leading-none tracking-[-0.02em] shadow-[var(--lectum-shadow-soft)] disabled:bg-surface-muted disabled:text-muted disabled:opacity-100 disabled:shadow-none",
                  !requiredFieldsReady &&
                    "bg-surface-muted text-muted shadow-none hover:bg-surface-muted",
                )}
                disabled={isSubmitDisabled}
                style={{ fontFamily: "var(--font-sans)", fontWeight: 800 }}
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

  return sheet;
};
