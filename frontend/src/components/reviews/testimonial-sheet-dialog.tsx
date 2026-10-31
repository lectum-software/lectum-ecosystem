"use client";

import { ArrowLeft, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import {
  useDirectoryPsychologist,
  useInfiniteDirectoryPsychologistReviews,
} from "@/api/callers/directory";
import { useReviewEligibility } from "@/api/callers/reviews";
import { LoadingState } from "@/components/ui/loading-state";
import { Modal } from "@/components/ui/modal";
import { useAppSelector } from "@/hooks/redux";
import { useAuthTokenPresence } from "@/hooks/use-auth-token-presence";
import { useSheetDragDismiss } from "@/hooks/use-sheet-drag-dismiss";
import { Button } from "@/registry/new-york-v4/ui/button";
import { flattenListPages } from "@/utils/infinite-list";
import { TestimonialCard } from "./testimonial-card";
import { TestimonialForm } from "./testimonial-form";
import { TestimonialInvitationAction } from "./testimonial-invitation-action";
import { TestimonialProfessionalIdentity } from "./testimonial-professional";

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

export type TestimonialInitial = { id: string; rating: number; comment: string | null };

export const TestimonialSheetDialog = ({
  psychologistId,
  name,
  initialView,
  initial,
  onClose,
}: {
  psychologistId: string;
  name?: string;
  initialView: "list" | "compose";
  initial?: TestimonialInitial;
  onClose: () => void;
}) => {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const invitationRef = useRef<HTMLButtonElement | null>(null);
  const [returnTarget] = useState(() =>
    typeof document === "undefined" ? null : (document.activeElement as HTMLElement),
  );
  const returnRef = useRef<HTMLElement | null>(returnTarget);
  const [open, setOpen] = useState(true);
  const closeNotifiedRef = useRef(false);
  useEffect(() => {
    if (open || closeNotifiedRef.current) return;
    // Modal closes and restores focus in its layout effect before the parent unmounts us.
    closeNotifiedRef.current = true;
    onClose();
  }, [open, onClose]);
  const viewport = useSheetViewport();
  const [view, setView] = useState(initialView);
  const [formState, setFormState] = useState({ dirty: false, submitting: false });
  const user = useAppSelector((state) => state.user);
  const hasToken = useAuthTokenPresence();
  const professional = useDirectoryPsychologist(psychologistId);
  const query = useInfiniteDirectoryPsychologistReviews(
    psychologistId,
    { limit: 20 },
    initialView === "list",
  );
  const eligibility = useReviewEligibility(
    psychologistId,
    view === "compose" && hasToken && user?.role === "paciente",
  );
  const items = flattenListPages(query.data?.pages);
  const count = query.data?.pages[0]?.count;
  const canLeave = () =>
    !formState.submitting &&
    (!formState.dirty || window.confirm("Descartar as alterações deste depoimento?"));
  const requestClose = () => {
    if (!canLeave()) return false;
    setOpen(false);
    return true;
  };
  const drag = useSheetDragDismiss({
    open,
    disabled: formState.submitting,
    onClose: requestClose,
  });
  const returnToList = () => {
    if (!canLeave()) return;
    setFormState({ dirty: false, submitting: false });
    setView("list");
  };
  useEffect(() => {
    if (!open) return;
    if (view === "compose") backRef.current?.focus({ preventScroll: true });
    else
      (invitationRef.current?.isConnected ? invitationRef.current : closeRef.current)?.focus({
        preventScroll: true,
      });
  }, [open, view]);
  const complete = () => {
    setFormState({ dirty: false, submitting: false });
    if (initialView === "list") setView("list");
    else setOpen(false);
  };
  const canCompose =
    hasToken && user?.role === "paciente" && (Boolean(initial) || eligibility.data?.eligible);
  return (
    <Modal
      open={open}
      onClose={requestClose}
      dismissible={!formState.submitting}
      labelledBy={titleId}
      initialFocusRef={closeRef}
      returnFocusRef={returnRef}
      className="min-w-0 overflow-hidden whitespace-normal p-0 backdrop:bg-media-background/35 backdrop:backdrop-blur-none"
    >
      <section
        data-testimonials-sheet
        data-psychologists-scroll-lock="true"
        style={{ ...viewport, ...drag.sheetStyle }}
        className="lectum-testimonial-sheet-enter fixed inset-x-0 bottom-0 mx-auto flex h-[82dvh] max-h-[calc(100dvh-1rem)] w-full min-w-0 max-w-[430px] flex-col overflow-hidden rounded-t-[24px] bg-surface text-foreground shadow-lectum-soft"
      >
        <div {...drag.handleProps} className="shrink-0" data-testimonials-drag-handle>
          <div className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-border-strong" />
          <header className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
            {view === "compose" && initialView === "list" ? (
              <button
                ref={backRef}
                type="button"
                onClick={returnToList}
                disabled={formState.submitting}
                aria-label="Voltar aos depoimentos"
                className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-surface-muted"
              >
                <ArrowLeft aria-hidden className="size-5" />
              </button>
            ) : null}
            <h2 id={titleId} className="min-w-0 flex-1 pl-1 text-base font-semibold">
              {view === "compose"
                ? initial
                  ? "Editar depoimento"
                  : "Deixar depoimento"
                : "Depoimentos"}
              {view === "list" && count !== undefined ? (
                <span className="ml-2 text-sm font-medium tabular-nums text-muted">
                  {count.toLocaleString("pt-BR")}
                </span>
              ) : null}
            </h2>
            <button
              ref={closeRef}
              type="button"
              onClick={requestClose}
              disabled={formState.submitting}
              aria-label="Fechar depoimentos"
              className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-surface-muted"
            >
              <X aria-hidden className="size-5" />
            </button>
          </header>
        </div>
        {view === "compose" ? (
          <div className="shrink-0 px-4 py-4" data-testimonials-recipient>
            <TestimonialProfessionalIdentity professional={professional.data} fallbackName={name} />
          </div>
        ) : null}
        {/* Keep the list mounted so returning from the form retains its scroll and query pages. */}
        {initialView === "list" ? (
          <div
            hidden={view !== "list"}
            data-testimonials-list
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-surface px-4"
          >
            {query.isLoading ? <LoadingState label="Carregando depoimentos" /> : null}
            {query.isError ? (
              <div role="alert" className="py-5 text-sm">
                <p>Não foi possível carregar os depoimentos.</p>
                <Button variant="ghost" onClick={() => query.refetch()}>
                  Tentar novamente
                </Button>
              </div>
            ) : null}
            {!query.isLoading && !query.isError && !items.length ? (
              <p className="py-10 text-center text-sm text-muted">Ainda não há depoimentos.</p>
            ) : null}
            <div className="divide-y divide-border" data-testimonial-list>
              {items.map((review) => (
                <TestimonialCard
                  key={review.id}
                  review={review}
                  professional={professional.data}
                  responseName={name}
                />
              ))}
            </div>
            {query.hasNextPage ? (
              <Button
                className="my-2 w-full"
                variant="ghost"
                disabled={query.isFetchingNextPage || query.isFetching}
                onClick={() => query.fetchNextPage()}
              >
                Ver mais depoimentos
              </Button>
            ) : null}
          </div>
        ) : null}
        {view === "compose" ? (
          <div data-testimonials-compose className="flex min-h-0 flex-1 flex-col">
            {canCompose ? (
              <TestimonialForm
                psychologistId={psychologistId}
                initial={initial}
                onSuccess={complete}
                onStateChange={setFormState}
                sheetLayout
              />
            ) : eligibility.isLoading ? (
              <LoadingState label="Carregando depoimento" />
            ) : (
              <div role="status" className="overflow-y-auto px-4 pb-4 text-sm leading-6 text-muted">
                <p>
                  {eligibility.isError
                    ? "Não foi possível verificar a disponibilidade agora."
                    : "Este perfil não está disponível para receber um novo depoimento."}
                </p>
                {eligibility.isError ? (
                  <Button variant="ghost" onClick={() => eligibility.refetch()}>
                    Tentar novamente
                  </Button>
                ) : null}
              </div>
            )}
          </div>
        ) : null}
        {initialView === "list" ? (
          <footer
            hidden={view !== "list"}
            className="shrink-0 border-t border-border p-4 pb-[max(16px,env(safe-area-inset-bottom))]"
          >
            <TestimonialInvitationAction
              psychologistId={psychologistId}
              className="w-full"
              allowGuest
              onCompose={(trigger) => {
                invitationRef.current = trigger;
                setView("compose");
              }}
            />
          </footer>
        ) : null}
      </section>
    </Modal>
  );
};
