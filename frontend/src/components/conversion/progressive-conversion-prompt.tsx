"use client";

import {
  ArrowRight,
  ArrowUp,
  Bookmark,
  Heart,
  LogIn,
  MessageCircle,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { Button } from "@/registry/new-york-v4/ui/button";
import {
  type ConversionPromptState,
  isActionPromptType,
  MODAL_DESCRIPTION_ID,
  MODAL_TITLE_ID,
} from "./progressive-conversion-state";

type Props = {
  prompt: ConversionPromptState | null;
  isAuthenticated: boolean;
  closePrompt: () => void;
  startSignup: () => void;
  startLogin: () => void;
};

export const ProgressiveConversionPrompt = ({
  prompt,
  isAuthenticated,
  closePrompt,
  startSignup,
  startLogin,
}: Props) => {
  if (isAuthenticated || !prompt) return null;
  const actionPromptType = prompt?.intent?.type;
  const isActionPrompt = isActionPromptType(actionPromptType);
  const isCommentPrompt =
    actionPromptType === "comment_post" || actionPromptType === "reply_comment";
  const isSavePrompt = actionPromptType === "save_post" || actionPromptType === "save_reply";
  const isVotePrompt = actionPromptType === "vote_post" || actionPromptType === "vote_reply";
  const PromptIcon =
    actionPromptType === "favorite_psychologist"
      ? Heart
      : isCommentPrompt
        ? MessageCircle
        : isSavePrompt
          ? Bookmark
          : isVotePrompt
            ? ArrowUp
            : UserPlus;
  const promptBadge =
    actionPromptType === "favorite_psychologist"
      ? "Favorito"
      : isSavePrompt
        ? "Salvar"
        : isCommentPrompt
          ? "Comunidade"
          : isVotePrompt
            ? "Voto"
            : "Gratuito";
  const promptTitle =
    actionPromptType === "favorite_psychologist"
      ? "Entre para favoritar este psicólogo"
      : actionPromptType === "follow_community"
        ? "Entre para seguir esta comunidade"
        : actionPromptType === "create_post"
          ? "Crie sua conta para publicar"
          : actionPromptType === "save_post"
            ? "Entre para salvar este post"
            : actionPromptType === "save_reply"
              ? "Entre para salvar esta resposta"
              : actionPromptType === "comment_post"
                ? "Entre para comentar"
                : actionPromptType === "reply_comment"
                  ? "Entre para responder"
                  : isVotePrompt
                    ? "Entre para votar"
                    : "Crie sua conta gratuita";
  const promptDescription =
    actionPromptType === "favorite_psychologist"
      ? "Para salvar este psicólogo nos seus favoritos, crie uma conta gratuita ou faça login. Assim você pode voltar ao perfil quando quiser."
      : actionPromptType === "follow_community"
        ? "Crie uma conta gratuita ou faça login para seguir esta comunidade, acompanhar novos posts e participar das conversas da Lectum."
        : actionPromptType === "create_post"
          ? "Para criar um post, crie uma conta gratuita ou faça login. Você pode participar da comunidade da Lectum gratuitamente e acompanhar as respostas."
          : actionPromptType === "save_post"
            ? "Crie uma conta gratuita ou faça login para guardar este post e voltar à conversa quando quiser."
            : actionPromptType === "save_reply"
              ? "Crie uma conta gratuita ou faça login para guardar esta resposta e consultar depois."
              : actionPromptType === "comment_post"
                ? "Crie uma conta gratuita ou faça login para participar da conversa e acompanhar as respostas."
                : actionPromptType === "reply_comment"
                  ? "Crie uma conta gratuita ou faça login para responder e continuar a conversa com a comunidade."
                  : isVotePrompt
                    ? "Crie uma conta gratuita ou faça login para marcar conteúdos como úteis ou dar downvote. Isso mantém a votação segura e evita duplicidade."
                    : "Publique gratuitamente nas comunidades da Lectum e receba respostas de psicólogos verificados.";

  return (
    <div
      aria-describedby={MODAL_DESCRIPTION_ID}
      aria-labelledby={MODAL_TITLE_ID}
      aria-modal="true"
      className="fixed inset-0 z-[9999] flex min-h-dvh items-center justify-center bg-media-background/35 px-4 py-6 text-foreground backdrop-blur-[6px] sm:px-6"
      role="dialog"
    >
      <div className="w-full max-w-[430px] rounded-[32px] border border-media-foreground/80 bg-surface/95 p-5 text-center shadow-lectum-soft ring-1 ring-foreground/[0.03] supports-[backdrop-filter]:bg-surface/90 dark:border-media-foreground/10 dark:bg-surface/95 dark:shadow-lectum-soft sm:p-6">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[22px] bg-primary-soft text-primary shadow-lectum-soft">
          <PromptIcon className="h-7 w-7" aria-hidden="true" />
        </div>

        <p className="mt-5 inline-flex items-center justify-center gap-1.5 rounded-full border border-primary/10 bg-primary-soft/70 px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.16em] text-primary">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          {promptBadge}
        </p>

        <h2
          className="mt-3 text-2xl font-black tracking-[-0.045em] text-foreground sm:text-[1.7rem]"
          id={MODAL_TITLE_ID}
        >
          {promptTitle}
        </h2>
        <p
          className="mx-auto mt-3 max-w-[340px] text-sm leading-6 text-muted sm:text-[0.96rem]"
          id={MODAL_DESCRIPTION_ID}
        >
          {promptDescription}
        </p>

        <div className="mt-6 grid gap-3">
          <Button
            className="h-12 rounded-2xl text-[0.95rem] font-black shadow-lectum-soft"
            onClick={startSignup}
            type="button"
          >
            Criar conta
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
          {isActionPrompt ? (
            <Button
              className="h-11 rounded-2xl border-primary/20 bg-surface/80 text-primary hover:bg-primary-soft/60 hover:text-primary-hover dark:bg-surface/70"
              onClick={startLogin}
              type="button"
              variant="outline"
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              Fazer login
            </Button>
          ) : null}
          <Button
            className="h-11 rounded-2xl border-border/80 bg-surface/80 text-muted hover:bg-primary-soft/60 hover:text-foreground dark:bg-surface/70"
            onClick={closePrompt}
            type="button"
            variant="outline"
          >
            Continuar explorando
          </Button>
        </div>
      </div>
    </div>
  );
};
