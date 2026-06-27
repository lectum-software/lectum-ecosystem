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
  Newspaper,
  Settings,
  Share2,
  Star,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { useMemo, useState } from "react";
import { useNotification } from "@/api/callers/notification";
import type { notification as ApiNotification } from "@/api/generator/types";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { SecondaryPageHeader } from "@/components/ui/secondary-page-header";
import { VerifiedBadgeIcon } from "@/components/ui/verified-badge";
import { getToken } from "@/hooks/cookies/token";
import { useAppSelector } from "@/hooks/redux";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";

type NotificationItem = ApiNotification;
type NotificationActor = NonNullable<NotificationItem["actor"]>;

type NotificationView = {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  tone: string;
};

type UserRole = "paciente" | "psicologo" | string | null | undefined;

const PATIENT_NEW_POST_DESCRIPTION =
  "Participe da conversa e acompanhe contribuições de psicólogos e da comunidade.";

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
    icon: Newspaper,
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

const getNotificationView = (messageKey: string | null | undefined, role: UserRole) => {
  const view = LABELS[messageKey ?? ""] ?? fallbackView;

  if (messageKey === "novo_post" && role === "paciente") {
    return {
      ...view,
      description: PATIENT_NEW_POST_DESCRIPTION,
    };
  }

  return view;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const getStringProp = (value: unknown, key: string) => {
  if (!isRecord(value)) return undefined;

  const prop = value[key];
  return typeof prop === "string" ? prop : undefined;
};

const getInitials = (name?: string | null) => {
  const parts = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return "L";
  if (parts.length === 1) return parts[0]?.slice(0, 2).toUpperCase() ?? "L";

  return `${parts[0]?.[0] ?? ""}${parts[parts.length - 1]?.[0] ?? ""}`.toUpperCase();
};

const ActorName = ({ actor }: { actor: NotificationActor }) => (
  <strong className="font-extrabold">
    {actor.name}
    {actor.verified ? (
      <VerifiedBadgeIcon
        aria-label="Perfil verificado"
        className="ml-1 inline h-4 w-4 align-[-2px]"
      />
    ) : null}
  </strong>
);

const getActorTitle = (item: NotificationItem, view: NotificationView): ReactNode => {
  const actor = item.actor;
  if (!actor || (item.message_key !== "novo_post" && item.message_key !== "nova_resposta")) {
    return view.title;
  }

  if (item.message_key === "novo_post") {
    return (
      <>
        <ActorName actor={actor} /> publicou na comunidade.
      </>
    );
  }

  const replyTarget = getStringProp(item.message_props, "parent_reply_id") ? "comentário" : "post";

  return (
    <>
      <ActorName actor={actor} /> respondeu ao seu {replyTarget}.
    </>
  );
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

type NotificationVisualProps = {
  actor?: NotificationActor | null;
  view: NotificationView;
};

const NotificationVisual = ({ actor, view }: NotificationVisualProps) => {
  const Icon = view.icon;

  if (!actor) {
    return (
      <span
        className={cn("mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-2xl", view.tone)}
      >
        <Icon className="h-5 w-5" aria-hidden={true} />
      </span>
    );
  }

  return (
    <span className="relative mt-0.5 shrink-0">
      <span className="relative grid h-10 w-10 overflow-hidden rounded-full bg-primary-soft text-sm font-extrabold text-primary ring-1 ring-border/80">
        {actor.avatar ? (
          <Image
            alt=""
            className="rounded-full object-cover object-center"
            fill={true}
            sizes="40px"
            src={actor.avatar}
          />
        ) : (
          <span className="grid h-full w-full place-items-center">{getInitials(actor.name)}</span>
        )}
      </span>

      <span
        className={cn(
          "-bottom-0.5 -right-0.5 absolute grid h-4 w-4 place-items-center rounded-full border-2 border-surface",
          view.tone,
        )}
      >
        <Icon className="h-2.5 w-2.5" aria-hidden={true} />
      </span>
    </span>
  );
};

type NotificationsHeaderActionsProps = {
  hasNotifications: boolean;
  isMarkingAllRead: boolean;
  onMarkAllRead: () => void;
};

const NotificationsHeaderActions = ({
  hasNotifications,
  isMarkingAllRead,
  onMarkAllRead,
}: NotificationsHeaderActionsProps) => {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const handleConfirm = () => {
    setIsConfirmOpen(false);
    onMarkAllRead();
  };

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      {hasNotifications ? (
        <>
          <Button
            className="hidden h-10 rounded-full px-4 text-sm font-semibold shadow-none md:inline-flex"
            disabled={isMarkingAllRead}
            onClick={onMarkAllRead}
            type="button"
            variant="outline"
          >
            <CheckCheck className="h-4 w-4" aria-hidden={true} />
            Marcar todas como lidas
          </Button>

          <div className="relative md:hidden">
            <Button
              aria-expanded={isConfirmOpen}
              aria-haspopup="menu"
              aria-label="Opções para marcar notificações como lidas"
              className="h-11 w-11 rounded-full p-0"
              disabled={isMarkingAllRead}
              onClick={() => setIsConfirmOpen((current) => !current)}
              type="button"
              variant="ghost"
            >
              <CheckCheck className="h-5 w-5" aria-hidden={true} />
            </Button>

            {isConfirmOpen ? (
              <div
                className="absolute right-0 top-[calc(100%+8px)] z-30 w-56 rounded-2xl border border-border bg-white p-1.5 shadow-[0_18px_45px_rgba(15,23,42,0.14)]"
                role="menu"
              >
                <button
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-foreground transition hover:bg-primary-soft hover:text-primary"
                  onClick={handleConfirm}
                  role="menuitem"
                  type="button"
                >
                  <CheckCheck className="h-4 w-4" aria-hidden={true} />
                  Marcar todas como lidas
                </button>
              </div>
            ) : null}
          </div>
        </>
      ) : null}

      <Button asChild className="h-11 w-11 rounded-full p-0" type="button" variant="ghost">
        <Link aria-label="Configurações de notificações" href="/app/settings/notifications">
          <Settings className="h-6 w-6" aria-hidden={true} />
        </Link>
      </Button>
    </div>
  );
};

export const NotificationsLogic = () => {
  const sessionRole = useAppSelector((state) => state.user?.role);
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
    const view = getNotificationView(item.message_key, sessionRole);
    const title = getActorTitle(item, view);
    const markAsRead = () => {
      if (!item.read && item.id) {
        update.mutate({ id: item.id, read: true });
      }
    };
    const content = (
      <>
        <NotificationVisual actor={item.actor} view={view} />

        <span className="min-w-0 flex-1 border-b border-border/70 pb-4">
          <span className="flex items-start justify-between gap-3">
            <span className="min-w-0">
              <span className="block text-[15px] font-normal leading-5 text-foreground">
                {title}
              </span>
            </span>

            {!item.read ? (
              <span className="mt-1 inline-flex shrink-0 items-center">
                <span className="h-2.5 w-2.5 rounded-full bg-primary" aria-hidden={true} />
                <span className="sr-only">Não lida</span>
              </span>
            ) : null}
          </span>

          <span className="mt-1.5 block text-xs font-medium text-subtle">
            {getRelativeTime(item.createdAt)}
          </span>
        </span>
      </>
    );
    const className = cn(
      "group flex w-full items-start gap-4 rounded-3xl border border-transparent px-3 py-3 text-left transition hover:bg-surface-muted/70",
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
            <NotificationsHeaderActions
              hasNotifications={items.length > 0}
              isMarkingAllRead={clean.isPending}
              onMarkAllRead={() => clean.mutate()}
            />
          }
          className="mb-4"
          title="Notificações"
        />

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
          <div className="grid gap-8 rounded-[2rem] border border-border bg-surface p-3 shadow-sm">
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
