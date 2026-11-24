import { createHash } from "node:crypto";
import prisma from "@/infra/database/prisma";
import { isTransactionalEmailConfigured, send } from "@/modules/api/config/nodemailer/send";
import { isPrismaErrorCode } from "@/utils/prisma-error";
import { resolvePublicWebUrl } from "@/utils/public-origin";
import { toSafeErrorLog } from "@/utils/safe-error-log";
import { isChannelAllowed } from "./preferences";

export const isReplyEmailAllowed = (prefs: unknown) => {
  if (!isChannelAllowed(prefs, "nova_resposta", "email")) return false;
  if (!prefs || typeof prefs !== "object" || !("nova_resposta" in prefs)) return true;
  const entry = prefs.nova_resposta;
  return !(entry && typeof entry === "object" && "email" in entry && entry.email === false);
};

type ReplyEmail = {
  actorId: string;
  recipientId: string;
  replyId: string;
  postId: string;
  communitySlug: string;
  parentReplyId?: string | null;
};

type Dependencies = {
  db: Pick<typeof prisma, "user" | "notification_delivery">;
  send: typeof send;
  configured: typeof isTransactionalEmailConfigured;
};

export const replyEmailId = (recipientId: string, replyId: string) =>
  `reply_email_${createHash("sha256")
    .update(JSON.stringify([recipientId, replyId]))
    .digest("hex")}`;

export const replyEmailMessage = (params: ReplyEmail, email: string) => {
  const path = `/comunidades/${encodeURIComponent(params.communitySlug)}/publicacao/${encodeURIComponent(params.postId)}`;
  const url = resolvePublicWebUrl(
    `${path}?${new URLSearchParams({ focusReplyId: params.replyId })}`,
  );
  if (!url) return null;

  return {
    to: email,
    subject: "Você recebeu uma resposta na Lectum",
    template: "transactional",
    transportTimeoutMs: 10_000,
    messageProps: {
      email,
      template_name: "Nova resposta na Lectum",
      hello: "Você recebeu uma resposta",
      invited_description: params.parentReplyId
        ? "Seu comentário recebeu uma nova resposta. Acesse a Lectum para continuar a conversa."
        : "Sua publicação recebeu uma nova resposta. Acesse a Lectum para continuar a conversa.",
      btn_accept_invite: "Ver resposta",
      url,
      valid_link:
        "Você pode desativar os avisos de novas respostas nas configurações de notificações da Lectum.",
      send_for: "Enviado por",
    },
  };
};

export const sendReplyEmail = async (
  params: ReplyEmail,
  dependencies: Dependencies = { db: prisma, send, configured: isTransactionalEmailConfigured },
) => {
  if (params.actorId === params.recipientId) return;
  const { db } = dependencies;
  try {
    const user = await db.user.findFirst({
      where: {
        id: params.recipientId,
        deleted: false,
        active: true,
        account_status: "active",
        role: { in: ["paciente", "psicologo"] },
      },
      select: {
        email: true,
        confirmed: true,
        notification_preference: { select: { prefs: true } },
      },
    });
    if (!user) return;
    const email = user.email?.trim();
    const message = email ? replyEmailMessage(params, email) : null;
    const prefs = user.notification_preference?.prefs;
    const reason = !isReplyEmailAllowed(prefs)
      ? "preference_disabled"
      : !email
        ? "email_missing"
        : !user.confirmed
          ? "email_unconfirmed"
          : !message
            ? "public_url_missing"
            : !dependencies.configured()
              ? "email_provider_unavailable"
              : null;
    const id = replyEmailId(params.recipientId, params.replyId);

    // The primary key is the atomic claim, even across concurrent API processes.
    try {
      await db.notification_delivery.create({
        data: {
          id,
          user_id: params.recipientId,
          channel: "email",
          source: "automatic",
          trigger_key: "nova_resposta",
          status: reason ? "skipped" : "queued",
          failure_reason: reason,
          metadata: {
            source_id: params.replyId,
            post_id: params.postId,
            notification_title: "Nova resposta na Lectum",
          },
        },
      });
    } catch (error) {
      if (isPrismaErrorCode(error, "P2002")) return;
      throw error;
    }
    if (reason || !message) return;

    let sent = false;
    try {
      sent = await dependencies.send(message);
    } catch {
      // A provider failure must never turn a saved reply into a failed request.
    }
    await db.notification_delivery.update({
      where: { id },
      data: {
        status: sent ? "sent" : "failed",
        sent_at: sent ? new Date() : null,
        failure_reason: sent ? null : "email_send_failed",
      },
    });
  } catch (error) {
    console.error("[REPLY EMAIL]", toSafeErrorLog(error, "ReplyEmailError"));
  }
};
