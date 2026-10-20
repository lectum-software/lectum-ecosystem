"use client";

import { ChevronLeft, ChevronRight, FileText, MessageCircle, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import type { PsychologistAnalyticsCommunityHighlight } from "@/api/generator/types/psychologist-analytics";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { resolvePublicMediaUrl } from "@/utils/media";

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
  const Icon = isReply ? MessageCircle : FileText;
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
              const thumbnail = resolvePublicMediaUrl(item.thumbnail_url);
              const postHref = `/comunidades/${encodeURIComponent(item.community_slug)}/publicacao/${encodeURIComponent(item.post_id)}`;
              const href = isReply
                ? `${postHref}?focusReplyId=${encodeURIComponent(item.id)}#reply-${encodeURIComponent(item.id)}`
                : postHref;
              return (
                <Link
                  key={item.id}
                  href={href}
                  className="w-[72%] max-w-[220px] shrink-0 snap-start overflow-hidden rounded-2xl border border-border bg-surface focus-visible:outline-2 focus-visible:outline-primary"
                  aria-label={`Abrir ${isReply ? "resposta" : "post"}: ${item.title || item.excerpt || "Conteúdo"}. ${item.whatsapp_clicks} cliques no WhatsApp`}
                >
                  <div className="relative h-32 overflow-hidden bg-surface-muted p-3">
                    {thumbnail ? (
                      <Image src={thumbnail} alt="" fill sizes="220px" className="object-cover" />
                    ) : (
                      <div className="grid gap-2">
                        <Icon className="h-5 w-5 text-primary" aria-hidden />
                        {isReply && item.context ? (
                          <p className="line-clamp-1 text-xs font-semibold text-muted">
                            {item.context}
                          </p>
                        ) : null}
                        <p className="line-clamp-3 text-sm font-semibold leading-5 text-foreground">
                          {item.title || item.excerpt || "Ver conteúdo"}
                        </p>
                      </div>
                    )}
                    {item.media_type?.startsWith("video") ? (
                      <span className="absolute bottom-2 right-2 grid h-7 w-7 place-items-center rounded-full bg-surface text-primary">
                        <Play className="h-3.5 w-3.5" aria-hidden />
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                    <p className="min-w-0 truncate text-xs text-muted">
                      {isReply ? item.context || "Resposta" : item.title || "Post"}
                    </p>
                    <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-extrabold text-foreground">
                      <WhatsAppIcon className="h-4 w-4 text-primary" aria-hidden />
                      {item.whatsapp_clicks.toLocaleString("pt-BR")}
                    </span>
                  </div>
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
