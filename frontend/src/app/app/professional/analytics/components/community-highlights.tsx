"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import type { PsychologistAnalyticsCommunityHighlight } from "@/api/generator/types/psychologist-analytics";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { CommunityHighlightMedia } from "./community-highlight-media";

export function CommunityHighlights({
  items,
  kind,
  locked,
}: {
  items?: PsychologistAnalyticsCommunityHighlight[];
  kind: "posts" | "replies";
  locked?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isReply = kind === "replies";
  const title = isReply ? "Respostas em destaque" : "Posts em destaque";
  const highlights = (items ?? [])
    .filter((item) => item.whatsapp_clicks > 0)
    .sort((a, b) => b.whatsapp_clicks - a.whatsapp_clicks || a.id.localeCompare(b.id))
    .slice(0, 5);
  const scroll = (direction: number) => {
    const carousel = ref.current;
    if (!carousel) return;
    const card = carousel.firstElementChild as HTMLElement | null;
    carousel.scrollBy({
      left: direction * ((card?.offsetWidth ?? 180) + 12),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  };
  return (
    <section className="min-w-0 border-t border-border pt-4">
      <Link
        href={`/app/publicacoes/minhas?type=${kind}`}
        className="flex items-center justify-between gap-3 rounded-lg py-2 text-foreground focus-visible:outline-2 focus-visible:outline-primary"
        aria-label={`${title}: ver ${isReply ? "respostas" : "posts"} em Minhas Publicações`}
      >
        <h3 className="text-sm font-extrabold">{title}</h3>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden />
      </Link>
      {locked ? (
        <p className="py-3 text-sm text-muted">Disponível no plano profissional.</p>
      ) : !items ? (
        <p className="py-3 text-sm text-muted">Destaques ainda não disponíveis.</p>
      ) : !highlights.length ? (
        <p className="py-3 text-sm text-muted">
          {isReply
            ? "Nenhuma resposta recebeu cliques neste período."
            : "Nenhum post recebeu cliques neste período."}
        </p>
      ) : (
        <>
          <div
            ref={ref}
            className="mt-2 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain touch-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {highlights.map((item) => {
              const postHref = `/comunidades/${encodeURIComponent(item.community_slug)}/publicacao/${encodeURIComponent(item.post_id)}`;
              const href = isReply
                ? `${postHref}?focusReplyId=${encodeURIComponent(item.id)}#reply-${encodeURIComponent(item.id)}`
                : postHref;
              return (
                <Link
                  key={item.id}
                  href={href}
                  className="relative aspect-[9/16] w-[44%] max-w-[160px] shrink-0 snap-start overflow-hidden rounded-2xl border border-border bg-surface focus-visible:outline-2 focus-visible:outline-primary"
                  aria-label={`Abrir ${isReply ? "resposta" : "post"}: ${item.title || item.excerpt || "Conteúdo"}. ${item.whatsapp_clicks} cliques no WhatsApp`}
                >
                  <CommunityHighlightMedia item={item} isReply={isReply} />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[var(--lectum-media-background)]/80 to-transparent" />
                  <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 text-sm font-extrabold text-[var(--lectum-media-foreground)]">
                    <WhatsAppIcon className="h-4 w-4" aria-hidden />
                    {item.whatsapp_clicks.toLocaleString("pt-BR")}
                  </span>
                </Link>
              );
            })}
          </div>
          {highlights.length > 1 ? (
            <div className="mt-1 hidden justify-end gap-1 md:flex">
              <button
                type="button"
                onClick={() => scroll(-1)}
                aria-label={`Anteriores: ${title}`}
                className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-surface-muted"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => scroll(1)}
                aria-label={`Próximos: ${title}`}
                className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-surface-muted"
              >
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
