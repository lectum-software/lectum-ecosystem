import type { Prisma } from "@/external/generated/prisma/client";
import { resolve as translate } from "@/helpers/translate/resolve";
import type { professional_subscription } from "@/interfaces/objects";
import { isChannelAllowed } from "@/main/notification/preferences";
import { toSafeErrorLog } from "@/utils/safe-error-log";

export const BILLING_DUNNING_MESSAGE_KEY = "billing_subscription_status";
export const BILLING_DUNNING_GRACE_DAYS = 7;
export const BILLING_DUNNING_REGULARIZE_PATH = "/app/profissional/assinatura/cartao";
export const BILLING_DUNNING_SUBSCRIPTION_PATH = "/app/profissional/assinatura";

const DAY_MS = 24 * 60 * 60 * 1000;
const D3_NOTICE_DAYS = 3;
const D6_NOTICE_DAYS = 6;

export type BillingDunningNoticeStage =
  | "payment_failed"
  | "reminder_d3"
  | "final_d6"
  | "downgraded"
  | "regularized";

export type BillingDunningUpdate = {
  billing_issue_started_at?: Date | null;
  billing_grace_ends_at?: Date | null;
  billing_downgraded_at?: Date | null;
  billing_last_notice_key?: string | null;
};

type BillingDunningSubscription = Pick<
  professional_subscription,
  | "billing_downgraded_at"
  | "billing_grace_ends_at"
  | "billing_issue_started_at"
  | "billing_last_notice_key"
  | "current_period_end"
  | "id"
  | "source"
  | "status"
>;

const STAGE_ORDER: Record<Exclude<BillingDunningNoticeStage, "regularized">, number> = {
  payment_failed: 1,
  reminder_d3: 2,
  final_d6: 3,
  downgraded: 4,
};

const addDays = (date: Date, days: number) => new Date(date.getTime() + days * DAY_MS);

const toIso = (date?: Date | null) => (date ? date.toISOString() : null);

const firstName = (name?: string | null) =>
  name?.trim().split(/\s+/).filter(Boolean)[0] || "profissional";

const isExistingPaidRecurringSubscription = (subscription?: BillingDunningSubscription | null) =>
  subscription?.source === "mercadopago" && subscription.status === "ativa";

const shouldStartBillingDunning = ({
  previous,
  status,
}: {
  previous?: BillingDunningSubscription | null;
  status: string;
}) =>
  status === "inadimplente" &&
  !previous?.billing_issue_started_at &&
  isExistingPaidRecurringSubscription(previous);

export const shouldKeepProfessionalBenefitsDuringDunning = (
  subscription?: Pick<
    professional_subscription,
    "billing_downgraded_at" | "billing_grace_ends_at" | "status"
  > | null,
  now = new Date(),
) =>
  subscription?.status === "inadimplente" &&
  Boolean(subscription.billing_grace_ends_at) &&
  !subscription.billing_downgraded_at &&
  new Date(subscription.billing_grace_ends_at!).getTime() > now.getTime();

export const buildBillingDunningUpdate = ({
  now = new Date(),
  previous,
  status,
}: {
  now?: Date;
  previous?: BillingDunningSubscription | null;
  status: string;
}): BillingDunningUpdate => {
  if (shouldStartBillingDunning({ previous, status })) {
    return {
      billing_downgraded_at: null,
      billing_grace_ends_at: addDays(now, BILLING_DUNNING_GRACE_DAYS),
      billing_issue_started_at: now,
      billing_last_notice_key: "payment_failed",
    };
  }

  if (status === "inadimplente") {
    return {};
  }

  if (status === "ativa" || status === "cancelada" || status === "inativa") {
    if (
      !previous?.billing_issue_started_at &&
      !previous?.billing_grace_ends_at &&
      !previous?.billing_downgraded_at &&
      !previous?.billing_last_notice_key
    ) {
      return {};
    }

    return {
      billing_downgraded_at: null,
      billing_grace_ends_at: null,
      billing_issue_started_at: null,
      billing_last_notice_key: null,
    };
  }

  return {};
};

export const resolveBillingDunningTransitionNotice = ({
  previous,
  status,
}: {
  previous?: BillingDunningSubscription | null;
  status: string;
}): BillingDunningNoticeStage | null => {
  if (shouldStartBillingDunning({ previous, status })) {
    return "payment_failed";
  }

  if (status === "ativa" && previous?.billing_issue_started_at) {
    return "regularized";
  }

  return null;
};

const formatGraceDate = (date?: Date | null) =>
  date
    ? new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(date)
    : null;

const emailHtmlByStage = (
  stage: BillingDunningNoticeStage,
  subscription: {
    billing_grace_ends_at?: Date | null;
  },
) => {
  const graceDate = formatGraceDate(subscription.billing_grace_ends_at);

  switch (stage) {
    case "payment_failed":
      return `Não conseguimos confirmar a cobrança do Plano Profissional. Atualize o cartão para manter seus benefícios. Prazo de regularização: ${
        graceDate ?? "7 dias"
      }.`;
    case "reminder_d3":
      return `Sua assinatura profissional ainda tem uma pendência de pagamento. Atualize o cartão para evitar a perda dos benefícios. Prazo de regularização: ${
        graceDate ?? "em breve"
      }.`;
    case "final_d6":
      return "Este é o aviso final: se o pagamento não for regularizado até o fim do prazo, seu plano será rebaixado para o Gratuito.";
    case "downgraded":
      return "Como a pendência de pagamento não foi regularizada no prazo, os benefícios do Plano Profissional foram removidos. Você pode atualizar o cartão para voltar ao plano pago após confirmação do gateway.";
    case "regularized":
      return "Pagamento regularizado. Seu Plano Profissional permanece ativo na Lectum.";
  }
};

const emailSubjectByStage = (stage: BillingDunningNoticeStage) => {
  switch (stage) {
    case "payment_failed":
      return "Regularize sua assinatura Lectum";
    case "reminder_d3":
      return "Lembrete: pagamento da assinatura pendente";
    case "final_d6":
      return "Aviso final antes do downgrade da assinatura";
    case "downgraded":
      return "Seu plano foi rebaixado para o Gratuito";
    case "regularized":
      return "Pagamento regularizado na Lectum";
  }
};

const sendBillingDunningEmail = async ({
  stage,
  subscription,
}: {
  stage: BillingDunningNoticeStage;
  subscription: Prisma.professional_subscriptionGetPayload<{
    include: {
      psychologist: {
        include: {
          user: {
            include: {
              notification_preference: true;
            };
          };
        };
      };
    };
  }>;
}) => {
  const [{ createNotificationDelivery }, { send: sendEmail }, { resolvePublicWebUrl }] =
    await Promise.all([
      import("@/main/notification/deliveries"),
      import("@/modules/api/config/nodemailer/send"),
      import("@/utils/public-origin"),
    ]);
  const user = subscription.psychologist.user;
  const email = user.email?.trim();

  if (
    !isChannelAllowed(user.notification_preference?.prefs, BILLING_DUNNING_MESSAGE_KEY, "email")
  ) {
    await createNotificationDelivery({
      channel: "email",
      failureReason: "preference_disabled",
      metadata: { message_key: BILLING_DUNNING_MESSAGE_KEY, stage },
      source: "automatic",
      status: "skipped",
      triggerKey: BILLING_DUNNING_MESSAGE_KEY,
      userId: user.id,
    });
    return;
  }

  if (!email) {
    await createNotificationDelivery({
      channel: "email",
      failureReason: "email_missing",
      metadata: { message_key: BILLING_DUNNING_MESSAGE_KEY, stage },
      source: "automatic",
      status: "skipped",
      triggerKey: BILLING_DUNNING_MESSAGE_KEY,
      userId: user.id,
    });
    return;
  }

  const now = new Date();
  const isRegularized = stage === "regularized";
  const emailUrl = resolvePublicWebUrl(
    isRegularized ? BILLING_DUNNING_SUBSCRIPTION_PATH : BILLING_DUNNING_REGULARIZE_PATH,
  );
  const delivered = await sendEmail({
    messageProps: {
      btn_accept_invite: isRegularized
        ? translate("email.btn_open_notification")
        : translate("email.btn_regularize_card"),
      email,
      hello: translate("email.hello", { name: firstName(user.name) }),
      html: emailHtmlByStage(stage, subscription),
      name: firstName(user.name),
      send_for: translate("email.send_for"),
      url: emailUrl ?? undefined,
    },
    subject: emailSubjectByStage(stage),
    template: "transactional",
    to: email,
    type: "transactional",
  });

  await createNotificationDelivery({
    channel: "email",
    failureReason: delivered ? null : "email_send_failed",
    metadata: { message_key: BILLING_DUNNING_MESSAGE_KEY, stage },
    sentAt: delivered ? now : null,
    source: "automatic",
    status: delivered ? "sent" : "failed",
    triggerKey: BILLING_DUNNING_MESSAGE_KEY,
    userId: user.id,
  });
};

export const sendBillingDunningNotice = async ({
  stage,
  subscriptionId,
}: {
  stage: BillingDunningNoticeStage;
  subscriptionId: string;
}) => {
  const [{ default: prisma }, { notify }] = await Promise.all([
    import("@/infra/database/prisma"),
    import("@/main/notification/index"),
  ]);
  const subscription = await prisma.professional_subscription.findFirst({
    where: {
      deleted: false,
      id: subscriptionId,
    },
    include: {
      psychologist: {
        include: {
          user: {
            include: {
              notification_preference: true,
            },
          },
        },
      },
    },
  });

  if (!subscription?.psychologist?.user_id) return;

  const redirect =
    stage === "regularized" ? BILLING_DUNNING_SUBSCRIPTION_PATH : BILLING_DUNNING_REGULARIZE_PATH;

  await notify([subscription.psychologist.user_id], {
    message_key: BILLING_DUNNING_MESSAGE_KEY,
    message_props: {
      billing_grace_ends_at: toIso(subscription.billing_grace_ends_at),
      billing_issue_started_at: toIso(subscription.billing_issue_started_at),
      billing_notice_stage: stage,
      source_id: subscription.id,
      source_type: "professional_subscription",
    },
    redirect,
  });

  try {
    await sendBillingDunningEmail({ stage, subscription });
  } catch (error) {
    console.error(
      "[BILLING] Falha no e-mail da régua de cobrança.",
      toSafeErrorLog(error, "BillingDunningEmailError"),
    );
  }
};

export const resolveBillingDunningDueStage = (
  subscription: BillingDunningSubscription,
  now: Date,
): Exclude<BillingDunningNoticeStage, "payment_failed" | "regularized"> | null => {
  const issueStartedAt = subscription.billing_issue_started_at;
  const graceEndsAt = subscription.billing_grace_ends_at;

  if (!issueStartedAt || !graceEndsAt || subscription.billing_downgraded_at) return null;

  const lastOrder =
    STAGE_ORDER[subscription.billing_last_notice_key as keyof typeof STAGE_ORDER] ?? 0;
  const elapsedMs = now.getTime() - issueStartedAt.getTime();

  if (now.getTime() >= graceEndsAt.getTime() && lastOrder < STAGE_ORDER.downgraded) {
    return "downgraded";
  }

  if (elapsedMs >= D6_NOTICE_DAYS * DAY_MS && lastOrder < STAGE_ORDER.final_d6) {
    return "final_d6";
  }

  if (elapsedMs >= D3_NOTICE_DAYS * DAY_MS && lastOrder < STAGE_ORDER.reminder_d3) {
    return "reminder_d3";
  }

  return null;
};

const previousNoticeKeysForStage = (
  stage: Exclude<BillingDunningNoticeStage, "payment_failed" | "regularized">,
) => {
  const order = STAGE_ORDER[stage];
  return Object.entries(STAGE_ORDER)
    .filter(([, value]) => value < order)
    .map(([key]) => key);
};

export const processBillingDunningQueue = async (now = new Date(), batchSize = 50) => {
  const { default: prisma } = await import("@/infra/database/prisma");
  const subscriptions = await prisma.professional_subscription.findMany({
    where: {
      OR: [
        {
          billing_issue_started_at: {
            lte: addDays(now, -D3_NOTICE_DAYS),
          },
        },
        {
          billing_grace_ends_at: {
            lte: now,
          },
        },
      ],
      billing_downgraded_at: null,
      billing_grace_ends_at: {
        not: null,
      },
      billing_issue_started_at: {
        not: null,
      },
      deleted: false,
      gateway: "mercadopago",
      gateway_subscription_id: {
        not: null,
      },
      source: "mercadopago",
      status: "inadimplente",
    },
    orderBy: {
      billing_issue_started_at: "asc",
    },
    take: batchSize,
  });

  let processed = 0;

  for (const subscription of subscriptions) {
    const stage = resolveBillingDunningDueStage(subscription, now);
    if (!stage) continue;

    const previousKeys = previousNoticeKeysForStage(stage);
    const claimed = await prisma.professional_subscription.updateMany({
      data: {
        ...(stage === "downgraded" ? { billing_downgraded_at: now } : {}),
        billing_last_notice_key: stage,
      },
      where: {
        billing_downgraded_at: null,
        billing_issue_started_at: {
          not: null,
        },
        deleted: false,
        id: subscription.id,
        OR: [
          {
            billing_last_notice_key: null,
          },
          {
            billing_last_notice_key: {
              in: previousKeys,
            },
          },
        ],
        status: "inadimplente",
      },
    });

    if (claimed.count === 0) continue;

    processed++;
    await sendBillingDunningNotice({ stage, subscriptionId: subscription.id });
  }

  return { processed };
};
