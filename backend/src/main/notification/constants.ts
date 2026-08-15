import { resolve } from "@/helpers/translate/resolve";

const DEFAULT_NOTIFICATION_ACTOR_NAME = "Um usuário";

const normalizeNotificationName = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim().replace(/\s+/g, " ")
    : DEFAULT_NOTIFICATION_ACTOR_NAME;

const withNotificationName = (data: Record<string, unknown>) => ({
  ...data,
  name: normalizeNotificationName(data.name),
});

const resolveBillingNoticeStage = (data: Record<string, unknown>) => {
  const stage = typeof data.billing_notice_stage === "string" ? data.billing_notice_stage : "";

  if (
    stage === "payment_failed" ||
    stage === "reminder_d3" ||
    stage === "final_d6" ||
    stage === "downgraded" ||
    stage === "regularized"
  ) {
    return stage;
  }

  return "payment_failed";
};

export const messages = {
  nova_avaliacao: (data: Record<string, unknown>) => {
    const props = withNotificationName(data);

    return {
      title: resolve("notification.nova_avaliacao.title", props),
      body: resolve("notification.nova_avaliacao.body", props),
    };
  },
  novo_favorito: (data: Record<string, unknown>) => {
    return {
      title: resolve("notification.novo_favorito.title", data),
      body: resolve("notification.novo_favorito.body", data),
    };
  },
  visualizacao_perfil: (data: Record<string, unknown>) => {
    return {
      title: resolve("notification.visualizacao_perfil.title", data),
      body: resolve("notification.visualizacao_perfil.body", data),
    };
  },
  clique_whatsapp: (data: Record<string, unknown>) => {
    return {
      title: resolve("notification.clique_whatsapp.title", data),
      body: resolve("notification.clique_whatsapp.body", data),
    };
  },
  novo_post: (data: Record<string, unknown>) => {
    return {
      title: resolve("notification.novo_post.title", data),
      body: resolve("notification.novo_post.body", data),
    };
  },
  nova_resposta: (data: Record<string, unknown>) => {
    return {
      title: resolve("notification.nova_resposta.title", data),
      body: resolve("notification.nova_resposta.body", data),
    };
  },
  upvote: (data: Record<string, unknown>) => {
    return {
      title: resolve("notification.upvote.title", data),
      body: resolve("notification.upvote.body", data),
    };
  },
  downvote: (data: Record<string, unknown>) => {
    return {
      title: resolve("notification.downvote.title", data),
      body: resolve("notification.downvote.body", data),
    };
  },
  compartilhamento: (data: Record<string, unknown>) => {
    return {
      title: resolve("notification.compartilhamento.title", data),
      body: resolve("notification.compartilhamento.body", data),
    };
  },
  salvamento: (data: Record<string, unknown>) => {
    return {
      title: resolve("notification.salvamento.title", data),
      body: resolve("notification.salvamento.body", data),
    };
  },
  billing_subscription_status: (data: Record<string, unknown>) => {
    const stage = resolveBillingNoticeStage(data);

    return {
      title: resolve(`notification.billing_subscription_status.${stage}.title`, data),
      body: resolve(`notification.billing_subscription_status.${stage}.body`, data),
    };
  },
  admin_campaign: (data: Record<string, unknown>) => {
    return {
      title: String(data.title || "Lectum"),
      body: String(data.body || "Voce tem uma nova notificacao"),
    };
  },
};
