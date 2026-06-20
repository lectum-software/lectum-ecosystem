"use client";

import { AlertTriangle, Bell, BellOff, Loader2, MoreHorizontal, Trash2, X } from "lucide-react";
import { type MouseEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { useDeletePost, useMutePost } from "@/api/callers/posts";
import type { PostDetail } from "@/api/generator/types/posts";
import { InlineAlert } from "@/components/ui/inline-alert";
import { useAppSelector } from "@/hooks/redux";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";

type OwnerActionPost = Pick<
  PostDetail,
  | "author"
  | "community"
  | "has_psychologist_reply"
  | "id"
  | "muted_by_current_user"
  | "replies_count"
  | "title"
>;

type PostOwnerActionMenuProps = {
  className?: string;
  onDeleted?: () => void;
  post: OwnerActionPost;
};

const errorMessageFromUnknown = (error: unknown) => {
  if (error instanceof Error && error.message) return error.message;

  return "Não foi possível concluir a ação. Tente novamente.";
};

const errorStatusFromUnknown = (error: unknown) => {
  const candidate = error as { data?: { status?: number } } | null;

  return candidate?.data?.status;
};

const PostActionModal = ({
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

  if (!open) return null;

  return (
    <div
      aria-labelledby="post-owner-action-title"
      aria-modal="true"
      className="fixed inset-0 z-[130] grid place-items-center bg-foreground/55 px-4 py-6 text-foreground backdrop-blur-md dark:bg-background/75"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="dialog"
    >
      <section className="w-full max-w-[430px] rounded-[28px] border border-border bg-surface p-5 shadow-[var(--lectum-shadow)]">
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
                id="post-owner-action-title"
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
          <Button disabled={disabled} onClick={onClose} type="button" variant="outline">
            Cancelar
          </Button>
          <Button
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
};

export const PostOwnerActionMenu = ({ className, onDeleted, post }: PostOwnerActionMenuProps) => {
  const currentUserId = useAppSelector((state) => state.user?.id);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [blockedModalOpen, setBlockedModalOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const muteMutation = useMutePost();
  const deleteMutation = useDeletePost();
  const isOwnPost = Boolean(currentUserId && post.author.id === currentUserId);
  const deleteDescription =
    post.replies_count > 0
      ? "Este post já possui respostas de outros membros.\n\nAo excluir o post, todas as respostas associadas também serão removidas.\n\nEsta ação não poderá ser desfeita."
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

  if (!isOwnPost) return null;

  const handleMuteToggle = (event?: MouseEvent<HTMLButtonElement>) => {
    event?.stopPropagation();
    setActionError(null);
    setMenuOpen(false);
    muteMutation.mutate({ muted: post.muted_by_current_user, postId: post.id });
  };

  const handleDeleteRequest = () => {
    setActionError(null);
    setMenuOpen(false);

    if (post.has_psychologist_reply) {
      setBlockedModalOpen(true);
      return;
    }

    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    setActionError(null);
    deleteMutation.mutate(post.id, {
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
    });
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
        onSuccess: () => setBlockedModalOpen(false),
      },
    );
  };

  const busy = muteMutation.isPending || deleteMutation.isPending;

  return (
    <div className={cn("relative shrink-0", className)} ref={menuRef}>
      <button
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        aria-label="Mais ações do post"
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
          className="absolute top-9 right-0 z-40 w-56 overflow-hidden rounded-2xl border border-border bg-surface p-1.5 text-sm shadow-[var(--lectum-shadow)]"
          role="menu"
        >
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
            {post.muted_by_current_user ? "Reativar notificações" : "Silenciar post"}
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
            Excluir post
          </button>
        </div>
      ) : null}

      <PostActionModal
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
        title="Excluir post?"
        variant="destructive"
      >
        {actionError ? (
          <InlineAlert title="Não foi possível excluir" variant="error">
            {actionError}
          </InlineAlert>
        ) : null}
      </PostActionModal>

      <PostActionModal
        action={post.muted_by_current_user ? "Post silenciado" : "Silenciar post"}
        description={
          "Este post já recebeu contribuições de psicólogos da comunidade.\n\nPara preservar o conteúdo compartilhado pelos profissionais, posts que já receberam respostas de psicólogos não podem ser excluídos.\n\nVocê pode silenciar este post para parar de receber novas notificações."
        }
        disabled={muteMutation.isPending}
        icon={<AlertTriangle className="h-5 w-5" aria-hidden="true" />}
        onAction={handleBlockedMute}
        onClose={() => {
          setBlockedModalOpen(false);
          setActionError(null);
        }}
        open={blockedModalOpen}
        title="Não é possível excluir este post"
      >
        {actionError ? (
          <InlineAlert title="Não foi possível silenciar" variant="error">
            {actionError}
          </InlineAlert>
        ) : null}
      </PostActionModal>
    </div>
  );
};
