"use client";

import { BellOff, BellRing, Info, ShieldCheck, Smartphone, X } from "lucide-react";
import { Button } from "@/registry/new-york-v4/ui/button";
import { isDismissiblePushNotice, type PushNoticeState } from "./push-notice-state";

const content = {
  checking: {
    title: "Verificando notificações",
    text: "Estamos conferindo se este navegador pode receber notificações da Lectum.",
    icon: Info,
  },
  iphone: {
    title: "Ative notificações no iPhone",
    text: "Adicione a Lectum à Tela de Início pelo menu Compartilhar. Depois, abra pelo ícone e toque em Ativar notificações. Requer iOS 16.4 ou posterior.",
    icon: Smartphone,
  },
  unsupported: {
    title: "Notificações do navegador indisponíveis",
    text: "Você pode acompanhar suas notificações dentro da Lectum, mas não receber avisos por este navegador.",
    icon: BellOff,
  },
  unavailable: {
    title: "Notificações do navegador indisponíveis",
    text: "As notificações no navegador ainda não estão disponíveis. Enquanto isso, a central de notificações continua funcionando normalmente.",
    icon: Info,
  },
  denied: {
    title: "Notificações bloqueadas",
    text: "Para receber avisos da Lectum, permita as notificações nas configurações do navegador ou do aparelho.",
    icon: BellOff,
  },
  active: {
    title: "Notificações do navegador ativas",
    text: "Você pode receber notificações da Lectum neste navegador.",
    icon: ShieldCheck,
  },
  error: {
    title: "Não foi possível ativar agora",
    text: "Tente novamente em instantes. Você pode continuar acompanhando suas notificações aqui.",
    icon: Info,
  },
  invite: {
    title: "Ative notificações da Lectum",
    text: "Receba avisos importantes sobre respostas, interações e contatos.",
    icon: BellRing,
  },
  requesting: {
    title: "Ative notificações da Lectum",
    text: "Receba avisos importantes sobre respostas, interações e contatos.",
    icon: BellRing,
  },
};

export const PushNoticeView = ({
  state,
  settings = false,
  onDismiss,
  onRequest,
}: {
  state: PushNoticeState;
  settings?: boolean;
  onDismiss?: () => void;
  onRequest: () => void;
}) => {
  if (state === "hidden" || (state === "active" && !settings)) return null;
  const { title, text, icon: Icon } = content[state];
  const dismissible = !settings && isDismissiblePushNotice(state) && Boolean(onDismiss);
  const actionable = state === "invite" || state === "requesting" || state === "error";
  const tone =
    state === "denied"
      ? "bg-danger/10 text-danger"
      : state === "unsupported" || state === "unavailable"
        ? "bg-surface-muted text-muted"
        : "bg-primary-soft text-primary";
  return (
    <section
      aria-label={title}
      className="relative mb-6 rounded-[var(--lectum-card-radius)] border border-border bg-surface p-4 text-sm shadow-sm md:p-5"
      style={dismissible ? { paddingRight: 52 } : undefined}
    >
      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="flex gap-3">
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${tone}`}>
            <Icon className="h-5 w-5" aria-hidden={true} />
          </span>
          <div className="min-w-0">
            <h2 className="font-extrabold text-foreground">{title}</h2>
            <p className="mt-1 leading-5 text-muted">{text}</p>
          </div>
        </div>
        {actionable ? (
          <Button
            className="h-11 rounded-2xl text-sm font-extrabold"
            disabled={state === "requesting"}
            onClick={onRequest}
            type="button"
          >
            <BellRing className="h-4 w-4" aria-hidden={true} />
            <span>
              {state === "requesting"
                ? "Ativando..."
                : state === "error"
                  ? "Tentar novamente"
                  : "Ativar notificações"}
            </span>
          </Button>
        ) : null}
      </div>
      {dismissible ? (
        <button
          aria-label="Fechar aviso de notificações"
          title="Fechar aviso"
          className="absolute right-1 top-1 grid h-11 w-11 place-items-center rounded-full text-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
          type="button"
          onClick={onDismiss}
        >
          <X className="h-[18px] w-[18px]" aria-hidden={true} />
        </button>
      ) : null}
    </section>
  );
};
