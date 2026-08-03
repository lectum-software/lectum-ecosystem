"use client";

import {
  AlertTriangle,
  Bell,
  BellOff,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { type MouseEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDeleteReply, useMutePost } from "@/api/callers/posts";
import type { PostListPost, UserPostReply } from "@/api/generator/types/posts";
import { ReplyEditModal } from "@/components/community/reply-edit-modal";
import { InlineAlert } from "@/components/ui/inline-alert";
import { useAppSelector } from "@/hooks/redux";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";

type OwnerActionReply = Pick<
  UserPostReply,
  | "author"
  | "content"
  | "has_verified_professional_reply"
  | "id"
  | "media_type"
  | "media_url"
  | "parent_content"
  | "parent_reply_id"
  | "replies_received_count"
  | "thumbnail_url"
>;

type OwnerActionPost = Pick<PostListPost, "id" | "muted_by_current_user" | "title">;

type ReplyOwnerActionMenuProps = {
  className?: string;
  onDeleted?: () => void;
  onUpdated?: () => void;
  post: OwnerActionPost;
  reply: OwnerActionReply;
};

type ApiErrorData = {
  error?: string;
  message?: string;
  status?: number;
};

type ApiError = Error & {
  data?: ApiErrorData;
};

const errorMessageFromUnknown = (error: unknown) => {
  const apiError = error as ApiError;
  const rawMessage =
    apiError?.data?.error ||
    apiError?.data?.message ||
    (error instanceof Error ? error.message : "");

  return rawMessage || "Não foi possível concluir a ação. Tente novamente.";
};

const errorStatusFromUnknown = (error: unknown) => {
  const apiError = error as ApiError;

  return apiError?.data?.status;
};

const ReplyActionModal = ({
  action,
  children,
  closeLabel,
  description,
  disabled,
  icon,
  onAction,
  onClose,
  open,
  title,
  variant = "default",
}: {
  action: string;
  children?: ReactNode;
  closeLabel?: string;
  description: string;
  disabled?: boolean;
  icon: ReactNode;
  onAction: () => void;
  onClose: () => void;
  open: boolean;
  title: string;
  variant?: "default" | "destructive";
}) => {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open || typeof document === "undefined") return null;

  const modal = (
    <div
      aria-labelledby="reply-owner-action-title"
      aria-modal="true"
      className="fixed inset-0 isolate z-[1000] grid place-items-center overflow-y-auto bg-foreground/55 px-4 py-6 text-foreground backdrop-blur-md dark:bg-background/75"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="dialog"
    >
      <section className="relative z-[1001] w-full max-w-[430px] rounded-[28px] border border-border bg-surface p-5 shadow-[var(--lectum-shadow)]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 gap-3">
            <span
              className={cn(
                "grid h-11 w-11 shrink-0 place-items-center rounded-full",
                variant === "destructive"
                  ? "bg-danger/10 text-danger"
                  : "bg-primary-soft text-primary",
              )}
            >
              {icon}
            </span>
            <div className="min-w-0">
              <h2
                className="text-xl font-black leading-7 tracking-[-0.03em] text-foreground"
                id="reply-owner-action-title"
              >
                {title}
              </h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted">{description}</p>
            </div>
          </div>
          <button
            aria-label={closeLabel ?? "Fechar"}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-muted text-muted transition hover:bg-primary-soft hover:text-foreground"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {children ? <div className="mt-4">{children}</div> : null}

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Button
            className="h-11 text-base font-extrabold tracking-[-0.02em]"
            disabled={disabled}
            onClick={onClose}
            type="button"
            variant="outline"
          >
            Cancelar
          </Button>
          <Button
            className="h-11 text-base font-extrabold tracking-[-0.02em]"
            disabled={disabled}
            onClick={onAction}
            type="button"
            variant={variant === "destructive" ? "destructive" : "default"}
          >
            {disabled ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            {action}
          </Button>
        </div>
      </section>
    </div>
  );

  return createPortal(modal, document.body);
};

export const ReplyOwnerActionMenu = ({
  className,
  onDeleted,
  onUpdated,
  post,
  reply,
}: ReplyOwnerActionMenuProps) => {
  const currentUser = useAppSelector((state) => state.user);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [blockedModalOpen, setBlockedModalOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const muteMutation = useMutePost();
  const deleteMutation = useDeleteReply();
  const isOwnReply = Boolean(currentUser?.id && reply.author.id === currentUser.id);
  const isPsychologistReply = reply.author.role === "psicologo";
  const replyKind = useMemo(
    () => (reply.parent_reply_id ? "resposta" : "comentário"),
    [reply.parent_reply_id],
  );
  const replyKindLabel = replyKind === "resposta" ? "Resposta" : "Comentário";
  const deleteTitle = `Excluir ${replyKind}?`;
  const deleteDescription = isPsychologistReply
    ? `Este ${replyKind} e as respostas encadeadas abaixo dele serão removidos.\n\nEsta ação não poderá ser desfeita.`
    : reply.replies_received_count > 0
      ? `Este ${replyKind} já possui respostas de outros membros.\n\nAo excluir, as respostas encadeadas abaixo dele também serão removidas.\n\nEsta ação não poderá ser desfeita.`
      : "Esta ação não poderá ser desfeita.";

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      setMenuOpen(false);
    };

    window.addEventListener("pointerdown", handlePointerDown);

    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [menuOpen]);

  if (!isOwnReply) return null;

  const handleMuteToggle = (event?: MouseEvent<HTMLButtonElement>) => {
    event?.stopPropagation();
    setActionError(null);
    setMenuOpen(false);
    muteMutation.mutate({ muted: post.muted_by_current_user, postId: post.id });
  };

  const handleDeleteRequest = () => {
    setActionError(null);
    setMenuOpen(false);

    if (!isPsychologistReply && reply.has_verified_professional_reply) {
      setBlockedModalOpen(true);
      return;
    }

    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    setActionError(null);
    deleteMutation.mutate(
      { postId: post.id, replyId: reply.id },
      {
        onError: (error) => {
          if (errorStatusFromUnknown(error) === 409) {
            setDeleteModalOpen(false);
            setBlockedModalOpen(true);
            return;
          }

          setActionError(errorMessageFromUnknown(error));
        },
        onSuccess: () => {
          setDeleteModalOpen(false);
          onDeleted?.();
        },
      },
    );
  };

  const handleBlockedMute = () => {
    if (post.muted_by_current_user) {
      setBlockedModalOpen(false);
      return;
    }

    setActionError(null);
    muteMutation.mutate(
      { muted: false, postId: post.id },
      {
        onError: (error) => setActionError(errorMessageFromUnknown(error)),
        onSuccess: () => {
          setBlockedModalOpen(false);
          onUpdated?.();
        },
      },
    );
  };

  const busy = muteMutation.isPending || deleteMutation.isPending;

  return (
    <div className={cn("relative shrink-0", className)} ref={menuRef}>
      <button
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        aria-label="Mais ações"
        className="grid h-8 w-8 place-items-center rounded-full text-muted transition hover:bg-surface-muted hover:text-foreground active:scale-[0.97]"
        onClick={(event) => {
          event.stopPropagation();
          setMenuOpen((current) => !current);
        }}
        type="button"
      >
        <MoreHorizontal className="h-[18px] w-[18px]" aria-hidden="true" />
      </button>

      {menuOpen ? (
        <div
          className="absolute top-9 right-0 z-[120] w-64 overflow-hidden rounded-2xl border border-border bg-surface p-1.5 text-sm shadow-[var(--lectum-shadow)]"
          role="menu"
        >
          <button
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left font-semibold text-muted transition hover:bg-surface-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
            disabled={busy}
            onClick={(event) => {
              event.stopPropagation();
              setMenuOpen(false);
              setActionError(null);
              setEditModalOpen(true);
            }}
            role="menuitem"
            type="button"
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Editar
          </button>
          <button
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left font-semibold text-muted transition hover:bg-surface-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
            disabled={busy}
            onClick={handleMuteToggle}
            role="menuitem"
            type="button"
          >
            {post.muted_by_current_user ? (
              <Bell className="h-4 w-4" aria-hidden="true" />
            ) : (
              <BellOff className="h-4 w-4" aria-hidden="true" />
            )}
            {post.muted_by_current_user ? "Reativar notificações" : "Silenciar"}
          </button>
          <button
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left font-semibold text-danger transition hover:bg-danger/10 hover:text-danger disabled:cursor-not-allowed disabled:opacity-60"
            disabled={busy}
            onClick={(event) => {
              event.stopPropagation();
              handleDeleteRequest();
            }}
            role="menuitem"
            type="button"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Excluir
          </button>
        </div>
      ) : null}

      {editModalOpen ? (
        <ReplyEditModal
          onClose={() => setEditModalOpen(false)}
          onUpdated={() => onUpdated?.()}
          open={editModalOpen}
          postId={post.id}
          reply={reply}
          sourceText={reply.parent_content ?? post.title}
        />
      ) : null}

      <ReplyActionModal
        action="Excluir"
        description={deleteDescription}
        disabled={deleteMutation.isPending}
        icon={<Trash2 className="h-5 w-5" aria-hidden="true" />}
        onAction={handleDeleteConfirm}
        onClose={() => {
          setDeleteModalOpen(false);
          setActionError(null);
        }}
        open={deleteModalOpen}
        title={deleteTitle}
        variant="destructive"
      >
        {actionError ? (
          <InlineAlert title="Não foi possível excluir" variant="error">
            {actionError}
          </InlineAlert>
        ) : null}
      </ReplyActionModal>

      <ReplyActionModal
        action={post.muted_by_current_user ? "Silenciada" : "Silenciar"}
        description={`Este ${replyKind} já recebeu contribuições de psicólogos da comunidade.\n\nPara preservar o conteúdo compartilhado pelos profissionais, comentários e respostas que já receberam respostas de psicólogos não podem ser excluídos por pacientes.\n\nVocê pode silenciar a conversa para parar de receber novas notificações desse post.`}
        disabled={muteMutation.isPending}
        icon={<AlertTriangle className="h-5 w-5" aria-hidden="true" />}
        onAction={handleBlockedMute}
        onClose={() => {
          setBlockedModalOpen(false);
          setActionError(null);
        }}
        open={blockedModalOpen}
        title={`Não é possível excluir este ${replyKind}`}
      >
        {actionError ? (
          <InlineAlert title="Não foi possível silenciar" variant="error">
            {actionError}
          </InlineAlert>
        ) : (
          <InlineAlert title={`${replyKindLabel} preservado`} variant="info">
            Psicólogos podem excluir seus próprios comentários e respostas a qualquer momento; esta
            restrição vale para pacientes quando já existe contribuição profissional abaixo.
          </InlineAlert>
        )}
      </ReplyActionModal>
    </div>
  );
};
