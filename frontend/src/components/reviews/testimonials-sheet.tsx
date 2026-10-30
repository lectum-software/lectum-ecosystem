"use client";

import { MessageCircle, X } from "lucide-react";
import Link from "next/link";
import { type ComponentProps, useEffect, useId, useRef, useState } from "react";
import { useInfiniteDirectoryPsychologistReviews } from "@/api/callers/directory";
import { useReviewEligibility } from "@/api/callers/reviews";
import { LoadingState } from "@/components/ui/loading-state";
import { Modal } from "@/components/ui/modal";
import { useAppSelector } from "@/hooks/redux";
import { useAuthTokenPresence } from "@/hooks/use-auth-token-presence";
import { Button } from "@/registry/new-york-v4/ui/button";
import { flattenListPages } from "@/utils/infinite-list";
import { TestimonialCard } from "./testimonial-card";
import { TestimonialForm } from "./testimonial-form";

const useSheetViewport = () => {
  const [viewport, setViewport] = useState<{ bottom: number; maxHeight: number }>();
  useEffect(() => {
    const update = () => {
      const visual = window.visualViewport;
      setViewport({
        bottom: visual ? Math.max(0, window.innerHeight - visual.height - visual.offsetTop) : 0,
        maxHeight: Math.max(0, (visual?.height ?? window.innerHeight) - 16),
      });
    };
    update();
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    return () => {
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
    };
  }, []);
  return viewport;
};

const OpenTestimonialComposer = ({
  psychologistId,
  onClose,
  initial,
}: {
  psychologistId: string;
  onClose: () => void;
  initial?: { id: string; rating: number; comment: string | null };
}) => {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [returnTarget] = useState(() =>
    typeof document === "undefined" ? null : (document.activeElement as HTMLElement),
  );
  const returnRef = useRef<HTMLElement | null>(returnTarget);
  const viewport = useSheetViewport();
  const eligibility = useReviewEligibility(psychologistId, true);
  const [formState, setFormState] = useState({ dirty: false, submitting: false });
  const requestClose = () => {
    if (
      formState.submitting ||
      (formState.dirty && !window.confirm("Descartar as alterações deste depoimento?"))
    )
      return;
    onClose();
  };
  return (
    <Modal
      open
      onClose={requestClose}
      dismissible={!formState.dirty && !formState.submitting}
      labelledBy={titleId}
      initialFocusRef={closeRef}
      returnFocusRef={returnRef}
      className="overflow-hidden p-0 backdrop:bg-media-background/35 backdrop:backdrop-blur-none"
    >
      <section
        data-psychologists-scroll-lock="true"
        style={viewport}
        className="lectum-testimonial-sheet-enter fixed inset-x-0 bottom-0 mx-auto flex max-h-[90dvh] w-full max-w-[430px] flex-col overflow-hidden rounded-t-[24px] bg-surface text-foreground shadow-lectum-soft"
      >
        <div className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-border-strong" />
        <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-2">
          <h2 id={titleId} className="text-sm font-bold">
            {initial ? "Editar depoimento" : "Deixar depoimento"}
          </h2>
          <button
            ref={closeRef}
            type="button"
            disabled={formState.submitting}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full p-0 hover:bg-surface-muted"
            aria-label="Fechar"
            onClick={requestClose}
          >
            <X className="size-5" />
          </button>
        </header>
        <div className="min-h-0 overflow-y-auto p-5 pb-[max(20px,env(safe-area-inset-bottom))]">
          {eligibility.data?.psychologist_name ? (
            <p className="mb-4 text-sm font-bold">{eligibility.data.psychologist_name}</p>
          ) : null}
          <TestimonialForm
            psychologistId={psychologistId}
            initial={initial}
            onSuccess={onClose}
            onStateChange={setFormState}
          />
        </div>
      </section>
    </Modal>
  );
};

export const TestimonialComposer = ({
  psychologistId,
  open,
  onClose,
  initial,
}: {
  psychologistId: string;
  open: boolean;
  onClose: () => void;
  initial?: { id: string; rating: number; comment: string | null };
}) =>
  open ? (
    <OpenTestimonialComposer psychologistId={psychologistId} onClose={onClose} initial={initial} />
  ) : null;

export const TestimonialInvitation = ({
  psychologistId,
  className,
  allowGuest = false,
  variant = "outline",
}: {
  psychologistId: string;
  className?: string;
  allowGuest?: boolean;
  variant?: ComponentProps<typeof Button>["variant"];
}) => {
  const user = useAppSelector((state) => state.user);
  const hasToken = useAuthTokenPresence();
  const [open, setOpen] = useState(false);
  const eligibility = useReviewEligibility(psychologistId, hasToken && user?.role === "paciente");
  if (!hasToken)
    return allowGuest ? (
      <Button asChild variant={variant} className={className}>
        <Link
          href={`/auth/login?redirect=${encodeURIComponent(`/app/avaliacoes/nova?psychologist_id=${psychologistId}`)}`}
        >
          Deixar depoimento
        </Link>
      </Button>
    ) : null;
  if (user?.role !== "paciente" || !eligibility.data?.eligible) return null;
  return (
    <>
      <Button
        className={className}
        variant={variant}
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
      >
        Deixar depoimento
      </Button>
      <TestimonialComposer
        psychologistId={psychologistId}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
};

const OpenTestimonials = ({
  psychologistId,
  name,
  onClose,
}: {
  psychologistId: string;
  name: string;
  onClose: () => void;
}) => {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [returnTarget] = useState(() =>
    typeof document === "undefined" ? null : (document.activeElement as HTMLElement),
  );
  const returnRef = useRef<HTMLElement | null>(returnTarget);
  const viewport = useSheetViewport();
  const query = useInfiniteDirectoryPsychologistReviews(psychologistId, { limit: 20 });
  const items = flattenListPages(query.data?.pages);
  return (
    <Modal
      open
      onClose={onClose}
      labelledBy={titleId}
      initialFocusRef={closeRef}
      returnFocusRef={returnRef}
      className="overflow-hidden p-0 backdrop:bg-media-background/35 backdrop:backdrop-blur-none"
    >
      <section
        data-psychologists-scroll-lock="true"
        style={viewport}
        className="lectum-testimonial-sheet-enter fixed inset-x-0 bottom-0 mx-auto flex h-[82dvh] max-h-[calc(100dvh-1rem)] w-full max-w-[430px] flex-col overflow-hidden rounded-t-[24px] bg-surface text-foreground shadow-lectum-soft"
      >
        <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-border-strong" />
        <header className="flex items-center justify-between gap-3 border-b border-border p-4">
          <div className="min-w-0">
            <h2 id={titleId} className="font-bold">
              {query.data?.pages[0]?.count ?? 0}{" "}
              {query.data?.pages[0]?.count === 1 ? "depoimento" : "depoimentos"}
            </h2>
            <p className="truncate text-xs text-muted">{name}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full p-0 hover:bg-surface-muted"
            aria-label="Fechar depoimentos"
            onClick={onClose}
          >
            <X className="size-5" />
          </button>
        </header>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-3">
          {query.isLoading ? <LoadingState label="Carregando depoimentos" /> : null}
          {query.isError ? (
            <div role="alert">
              <p>Não foi possível carregar os depoimentos.</p>
              <Button variant="ghost" onClick={() => query.refetch()}>
                Tentar novamente
              </Button>
            </div>
          ) : null}
          {!query.isLoading && !query.isError && !items.length ? (
            <p className="py-10 text-center text-sm text-muted">Ainda não há depoimentos.</p>
          ) : null}
          {items.map((review) => (
            <TestimonialCard key={review.id} review={review} responseName={name} />
          ))}
          {query.hasNextPage ? (
            <Button
              className="w-full"
              variant="ghost"
              disabled={query.isFetchingNextPage}
              onClick={() => query.fetchNextPage()}
            >
              Ver mais depoimentos
            </Button>
          ) : null}
        </div>
        <footer className="border-t border-border p-4 pb-[max(16px,env(safe-area-inset-bottom))]">
          <TestimonialInvitation
            psychologistId={psychologistId}
            className="w-full rounded-full"
            variant="default"
            allowGuest
          />
        </footer>
      </section>
    </Modal>
  );
};

export const TestimonialsButton = ({
  psychologistId,
  name,
  count,
  className,
  disabled,
  iconSize = 24,
  desktop = false,
  actionPadding,
}: {
  psychologistId: string;
  name: string;
  count: number;
  className?: string;
  disabled?: boolean;
  iconSize?: number;
  desktop?: boolean;
  actionPadding?: number;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        aria-label={`Abrir depoimentos de ${name}`}
        className={className || "grid min-h-11 min-w-11 justify-items-center gap-1"}
        disabled={disabled}
        style={actionPadding === undefined ? undefined : { paddingBlock: actionPadding }}
        type="button"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
      >
        <span
          className={
            desktop
              ? "grid h-10 w-10 place-items-center rounded-full border border-border bg-surface transition hover:scale-105 hover:bg-surface-muted active:scale-95"
              : "grid place-items-center"
          }
        >
          <MessageCircle aria-hidden style={{ width: iconSize, height: iconSize }} />
        </span>
        <span className={desktop ? "text-[10px] font-bold leading-4" : "text-xs leading-4"}>
          {count}
        </span>
      </button>
      {open ? (
        <OpenTestimonials
          psychologistId={psychologistId}
          name={name}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
};
