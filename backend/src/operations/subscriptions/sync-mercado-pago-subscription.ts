import "dotenv/config";

import prisma from "@/infra/database/prisma";
import { getPaymentGateway } from "@/modules/billing/payment-gateway";

const GATEWAY = "mercadopago";

const help = `Sincroniza uma assinatura Mercado Pago real com o banco local.

Uso local apos checkout sandbox sem webhook/tunel:
  pnpm --dir backend billing:sync -- --psychologist-email psi@example.com

Alvos aceitos, escolha apenas um:
  --psychologist-email <email>
  --psychologist-user-id <user.id>
  --psychologist-profile-id <psychologist_profile.id>
  --subscription-id <professional_subscription.id>
  --gateway-subscription-id <Mercado Pago preapproval id>

Opcoes:
  --dry-run     consulta o Mercado Pago e mostra o resultado sem atualizar o banco

Seguranca:
  - bloqueado em NODE_ENV=production/prod;
  - bloqueado quando MERCADO_PAGO_ENV nao for sandbox.
`;

type SyncArgs = {
  dryRun: boolean;
  gatewaySubscriptionId?: string;
  psychologistEmail?: string;
  psychologistProfileId?: string;
  psychologistUserId?: string;
  subscriptionId?: string;
};

const readFlags = (argv: string[]) => {
  const flags = new Map<string, string | true>();

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--") {
      continue;
    }

    if (token === "--help" || token === "-h") {
      flags.set("help", true);
      continue;
    }

    if (!token.startsWith("--")) {
      throw new Error(`Argumento invalido: ${token}`);
    }

    const [key, inlineValue] = token.slice(2).split("=", 2);

    if (!key) {
      throw new Error(`Argumento invalido: ${token}`);
    }

    if (inlineValue !== undefined) {
      flags.set(key, inlineValue);
      continue;
    }

    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      flags.set(key, next);
      index += 1;
    } else {
      flags.set(key, true);
    }
  }

  return flags;
};

const getOptionalString = (flags: Map<string, string | true>, key: string) => {
  const value = flags.get(key);
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
};

const parseArgs = (argv: string[]): SyncArgs | null => {
  const flags = readFlags(argv);

  if (flags.has("help")) {
    console.log(help);
    return null;
  }

  const allowedFlags = new Set([
    "dry-run",
    "gateway-subscription-id",
    "psychologist-email",
    "psychologist-profile-id",
    "psychologist-user-id",
    "subscription-id",
  ]);

  for (const key of flags.keys()) {
    if (!allowedFlags.has(key)) {
      throw new Error(`Flag desconhecida: --${key}`);
    }
  }

  const args = {
    dryRun: flags.has("dry-run"),
    gatewaySubscriptionId: getOptionalString(flags, "gateway-subscription-id"),
    psychologistEmail: getOptionalString(flags, "psychologist-email"),
    psychologistProfileId: getOptionalString(flags, "psychologist-profile-id"),
    psychologistUserId: getOptionalString(flags, "psychologist-user-id"),
    subscriptionId: getOptionalString(flags, "subscription-id"),
  } satisfies SyncArgs;

  const targetFlags = [
    args.gatewaySubscriptionId,
    args.psychologistEmail,
    args.psychologistProfileId,
    args.psychologistUserId,
    args.subscriptionId,
  ].filter(Boolean);

  if (targetFlags.length !== 1) {
    throw new Error(
      "Informe exatamente um alvo: --psychologist-email, --psychologist-user-id, --psychologist-profile-id, --subscription-id ou --gateway-subscription-id.",
    );
  }

  return args;
};

const assertSafeEnvironment = () => {
  const nodeEnv = process.env.NODE_ENV?.trim().toLowerCase();
  const gatewayEnv = process.env.MERCADO_PAGO_ENV?.trim().toLowerCase();

  if (nodeEnv === "production" || nodeEnv === "prod") {
    throw new Error("Sincronizacao local bloqueada: NODE_ENV=production/prod.");
  }

  if (gatewayEnv !== "sandbox") {
    throw new Error("Sincronizacao local bloqueada: MERCADO_PAGO_ENV precisa ser sandbox.");
  }
};

const findLocalSubscription = async (args: SyncArgs) => {
  const include = {
    plan: {
      select: {
        id: true,
        name: true,
        slug: true,
      },
    },
    psychologist: {
      select: {
        id: true,
        user: {
          select: {
            email: true,
            id: true,
            name: true,
          },
        },
      },
    },
  };

  if (args.subscriptionId) {
    return prisma.professional_subscription.findFirst({
      where: {
        deleted: false,
        id: args.subscriptionId,
      },
      include,
    });
  }

  if (args.gatewaySubscriptionId) {
    return prisma.professional_subscription.findFirst({
      where: {
        deleted: false,
        gateway_subscription_id: args.gatewaySubscriptionId,
      },
      include,
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  return prisma.professional_subscription.findFirst({
    where: {
      deleted: false,
      gateway_subscription_id: {
        not: null,
      },
      gateway: GATEWAY,
      psychologist: {
        deleted: false,
        ...(args.psychologistProfileId ? { id: args.psychologistProfileId } : {}),
        user: {
          active: true,
          deleted: false,
          role: "psicologo",
          ...(args.psychologistEmail ? { email: args.psychologistEmail } : {}),
          ...(args.psychologistUserId ? { id: args.psychologistUserId } : {}),
        },
      },
    },
    include,
    orderBy: {
      createdAt: "desc",
    },
  });
};

const parseGatewayDate = (value?: string | null) => {
  if (!value) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

const formatSyncError = (error: unknown) => {
  if (!(error instanceof Error)) {
    return "Erro desconhecido.";
  }

  const details = (error as Error & { details?: unknown }).details;

  if (!details || typeof details !== "object") {
    return error.message;
  }

  return [error.message, JSON.stringify(details, null, 2)].join("\n");
};

const formatSubscription = (
  subscription: NonNullable<Awaited<ReturnType<typeof findLocalSubscription>>>,
) => ({
  id: subscription.id,
  gateway: subscription.gateway,
  gateway_subscription_id: subscription.gateway_subscription_id,
  plan: subscription.plan,
  professional: {
    email: subscription.psychologist.user.email,
    name: subscription.psychologist.user.name,
    profile_id: subscription.psychologist.id,
    user_id: subscription.psychologist.user.id,
  },
  status: subscription.status,
  current_period_end: subscription.current_period_end,
});

const syncSubscription = async (args: SyncArgs) => {
  assertSafeEnvironment();

  const localSubscription = await findLocalSubscription(args);

  if (!localSubscription) {
    throw new Error("Assinatura local com gateway Mercado Pago nao encontrada.");
  }

  if (!localSubscription.gateway_subscription_id) {
    throw new Error(
      "Assinatura local nao possui gateway_subscription_id para consultar o Mercado Pago.",
    );
  }

  const gateway = getPaymentGateway();
  const gatewaySubscription = await gateway.getSubscription(
    localSubscription.gateway_subscription_id,
  );

  if (
    gatewaySubscription.external_reference &&
    gatewaySubscription.external_reference !== localSubscription.id
  ) {
    throw new Error(
      `Referencia externa divergente: Mercado Pago aponta para ${gatewaySubscription.external_reference}, mas a assinatura local e ${localSubscription.id}.`,
    );
  }

  const nextPaymentDate = parseGatewayDate(gatewaySubscription.next_payment_date);
  const updateData = {
    gateway: GATEWAY,
    gateway_subscription_id: gatewaySubscription.gateway_subscription_id,
    status: gatewaySubscription.status,
    ...(nextPaymentDate ? { current_period_end: nextPaymentDate } : {}),
  };

  const updatedSubscription = args.dryRun
    ? localSubscription
    : await prisma.professional_subscription.update({
        where: {
          id: localSubscription.id,
        },
        data: updateData,
        include: {
          plan: true,
          psychologist: {
            include: {
              user: true,
            },
          },
        },
      });

  return {
    dry_run: args.dryRun,
    gateway: {
      external_reference: gatewaySubscription.external_reference,
      gateway_status: gatewaySubscription.gateway_status,
      gateway_subscription_id: gatewaySubscription.gateway_subscription_id,
      init_point: gatewaySubscription.init_point,
      next_payment_date: gatewaySubscription.next_payment_date,
      normalized_status: gatewaySubscription.status,
    },
    local_before: formatSubscription(localSubscription),
    local_after: formatSubscription(updatedSubscription),
    synced: !args.dryRun,
  };
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  if (!args) return;

  const result = await syncSubscription(args);
  console.log(JSON.stringify(result, null, 2));
};

main()
  .catch((error: unknown) => {
    console.error(formatSyncError(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
