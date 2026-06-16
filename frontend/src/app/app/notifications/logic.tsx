"use client";

import {
  ArrowUp,
  Bell,
  Bookmark,
  CheckCheck,
  Eye,
  Heart,
  MessageSquare,
  MousePointerClick,
  Settings,
  Share2,
  Star,
} from "lucide-react";
import Link from "next/link";
import type { ComponentType } from "react";
import { useMemo, useState } from "react";
import { useNotification } from "@/api/callers/notification";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { SecondaryPageHeader } from "@/components/ui/secondary-page-header";
import { getToken } from "@/hooks/cookies/token";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";

type NotificationItem = {
  id?: string;
  read?: boolean;
  redirect?: string | null;
  message_key?: string | null;
  createdAt?: string;
};

type NotificationView = {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  tone: string;
};

const LABELS: Record<string, NotificationView> = {
  nova_avaliacao: {
    title: "Nova avaliação recebida",
    description: "Clique para ver a avaliação no seu perfil.",
    icon: Star,
    tone: "text-amber-500 bg-amber-50",
  },
  novo_favorito: {
    title: "Um novo usuário favoritou seu perfil.",
    description: "Seu perfil foi salvo por alguém que pode chamar no WhatsApp.",
    icon: Heart,
    tone: "text-rose-500 bg-rose-50",
  },
  visualizacao_perfil: {
    title: "Um novo usuário visualizou seu perfil.",
    description: "Acompanhe o interesse pelo seu perfil profissional.",
    icon: Eye,
    tone: "text-slate-600 bg-slate-100",
  },
  clique_whatsapp: {
    title: "Novo clique no seu botão de WhatsApp!",
    description: "Registramos um novo contato iniciado pela Lectum.",
    icon: MousePointerClick,
    tone: "text-emerald-600 bg-emerald-50",
  },
  novo_post: {
    title: "Novo post na comunidade.",
    description: "Responda agora e seja visto primeiro.",
    icon: MessageSquare,
    tone: "text-sky-600 bg-sky-50",
  },
  nova_resposta: {
    title: "Seu post recebeu uma nova resposta.",
    description: "Clique para acompanhar a conversa.",
    icon: MessageSquare,
    tone: "text-blue-600 bg-blue-50",
  },
  upvote: {
    title: "Seu conteúdo recebeu um novo upvote.",
    description: "Clique para ver o conteúdo em destaque.",
    icon: ArrowUp,
    tone: "text-sky-600 bg-sky-50",
  },
  downvote: {
    title: "Seu conteúdo recebeu uma nova interação.",
    description: "Acompanhe o desempenho da discussão.",
    icon: ArrowUp,
    tone: "text-slate-600 bg-slate-100",
  },
  compartilhamento: {
    title: "Seu conteúdo foi compartilhado.",
    description: "Clique para abrir a publicação relacionada.",
    icon: Share2,
    tone: "text-emerald-600 bg-emerald-50",
  },
  salvamento: {
    title: "Seu conteúdo foi salvo por um novo usuário.",
    description: "Clique para ver o conteúdo salvo.",
    icon: Bookmark,
    tone: "text-blue-600 bg-blue-50",
  },
};

const fallbackView: NotificationView = {
  title: "Nova notificação",
  description: "Abra para acompanhar a atualização na Lectum.",
  icon: Bell,
  tone: "text-primary bg-primary-soft",
};

const startOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

const getRelativeTime = (value?: string) => {
  if (!value) return "agora";

  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.max(1, Math.round(diffMs / 60_000));

  if (minutes < 60) return `${minutes} min`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h`;

  const days = Math.round(hours / 24);
  return `${days} d`;
};

const groupNotifications = (items: NotificationItem[]) => {
  const today = startOfToday();

  return items.reduce(
    (acc, item) => {
      const createdAt = item.createdAt ? new Date(item.createdAt) : new Date();
      const key = createdAt >= today ? "today" : "previous";
      acc[key].push(item);
      return acc;
    },
    { today: [] as NotificationItem[], previous: [] as NotificationItem[] },
  );
};

export const NotificationsLogic = () => {
  const [hasAuthToken] = useState(() => {
    if (typeof window === "undefined") return false;

    return Boolean(getToken());
  });
  const { index, update, clean } = useNotification({ enabledIndex: hasAuthToken });
  const items = useMemo(
    () => index.data?.pages.flatMap((page) => page.data) ?? [],
    [index.data?.pages],
  );
  const groups = useMemo(() => groupNotifications(items), [items]);

  const renderItem = (item: NotificationItem) => {
    const view = LABELS[item.message_key ?? ""] ?? fallbackView;
    const Icon = view.icon;
    const markAsRead = () => {
      if (!item.read && item.id) {
        update.mutate({ id: item.id, read: true });
      }
    };
    const content = (
      <>
        <span
          className={cn("mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-2xl", view.tone)}
        >
          <Icon className="h-5 w-5" aria-hidden={true} />
        </span>

        <span className="min-w-0 flex-1 border-b border-border/70 pb-4">
          <span className="flex items-start justify-between gap-3">
            <span className="min-w-0">
              <span className="block text-[15px] font-extrabold leading-5 text-foreground">
                {view.title}
              </span>
              <span className="mt-1 line-clamp-2 text-sm leading-5 text-muted">
                {view.description}
              </span>
            </span>

            {!item.read ? (
              <span className="mt-1 inline-flex shrink-0 items-center">
                <span className="h-2.5 w-2.5 rounded-full bg-primary" aria-hidden={true} />
                <span className="sr-only">Não lida</span>
              </span>
            ) : null}
          </span>

          <span className="mt-1 block text-xs font-medium text-subtle">
            {getRelativeTime(item.createdAt)}
          </span>
        </span>
      </>
    );
    const className = cn(
      "group flex w-full items-start gap-4 rounded-3xl border border-transparent px-3 py-3 text-left transition hover:bg-surface",
      !item.read && "bg-primary-soft/40",
    );

    return (
      <li key={item.id}>
        {item.redirect ? (
          <Link className={className} href={item.redirect} onClick={markAsRead}>
            {content}
          </Link>
        ) : (
          <button className={className} onClick={markAsRead} type="button">
            {content}
          </button>
        )}
      </li>
    );
  };

  return (
    <PrivateTemplate>
      <section className="mx-auto w-full max-w-2xl px-5 py-5 md:py-8">
        <SecondaryPageHeader
          action={
            <Button asChild className="h-11 w-11 rounded-full" type="button" variant="ghost">
              <Link aria-label="Configurações de notificações" href="/app/settings/notifications">
                <Settings className="h-5 w-5" aria-hidden={true} />
              </Link>
            </Button>
          }
          className="mb-4"
          title="Notificações"
        />

        {items.length > 0 ? (
          <div className="mb-4 flex justify-end">
            <Button
              disabled={clean.isPending}
              onClick={() => clean.mutate()}
              type="button"
              variant="outline"
            >
              <CheckCheck className="h-4 w-4" aria-hidden={true} />
              Marcar todas como lidas
            </Button>
          </div>
        ) : null}

        {index.isLoading ? (
          <LoadingState className="py-10" />
        ) : index.isError ? (
          <EmptyState
            description="Não foi possível carregar suas notificações agora. Tente novamente em instantes."
            icon={Bell}
            title="Erro ao carregar"
          />
        ) : items.length === 0 ? (
          <EmptyState
            description="Novas notificações aparecerão aqui."
            icon={Bell}
            title="Nenhuma notificação"
          />
        ) : (
          <div className="grid gap-8 rounded-[2rem] bg-background md:bg-surface md:p-3">
            {groups.today.length > 0 ? (
              <section aria-labelledby="notifications-today">
                <h2
                  className="mb-2 px-3 text-sm font-extrabold text-foreground"
                  id="notifications-today"
                >
                  Hoje
                </h2>
                <ul>{groups.today.map(renderItem)}</ul>
              </section>
            ) : null}

            {groups.previous.length > 0 ? (
              <section aria-labelledby="notifications-previous">
                <h2
                  className="mb-2 px-3 text-sm font-extrabold text-foreground"
                  id="notifications-previous"
                >
                  Anteriores
                </h2>
                <ul>{groups.previous.map(renderItem)}</ul>
              </section>
            ) : null}
          </div>
        )}

        {index.hasNextPage ? (
          <div className="mt-5 grid">
            <Button
              disabled={index.isFetchingNextPage}
              onClick={() => index.fetchNextPage()}
              type="button"
              variant="outline"
            >
              {index.isFetchingNextPage ? "Carregando..." : "Carregar mais"}
            </Button>
          </div>
        ) : null}
      </section>
    </PrivateTemplate>
  );
};
