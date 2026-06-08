import "dotenv/config";

import prisma from "@/infra/database/prisma";
import { parseCrpRegistrationDate } from "@/utils/professional-experience";

const SOURCE_ADMIN_GRANT = "admin_grant";

type GrantArgs = {
  actor: string;
  days?: number;
  notes?: string;
  psychologistEmail?: string;
  psychologistProfileId?: string;
  psychologistUserId?: string;
  reason: string;
  registrationDate?: Date;
  until?: Date;
};

type GrantTarget = {
  email: string;
  name: string;
  profileId: string;
  userId: string;
};

const help = `Concede Plano Profissional por tempo determinado, sem criar cobrança.

Uso:
  pnpm --dir backend subscription:grant -- --psychologist-email psi@example.com --days 90 --reason "Parceria" --actor "Admin"

Alvos aceitos, escolha apenas um:
  --psychologist-email <email>
  --psychologist-user-id <user.id>
  --psychologist-profile-id <psychologist_profile.id>

Período, escolha apenas um:
  --days <número de dias>
  --until <YYYY-MM-DD ou ISO datetime>

Auditoria:
  --reason <motivo obrigatório>
  --actor <responsável obrigatório>
  --notes <observações opcionais>

Experiência profissional:
  --crp-registration-date <YYYY-MM-DD ou DD/MM/YYYY>
  Data de inscrição no CRP. Campo interno usado para calcular tempo de experiência
  quando a cortesia substitui a consulta CFP automática.

Segurança:
  se houver assinatura não cancelada vinculada a gateway, o comando bloqueia a concessão.
`;

const parseDateOnlyInSaoPauloEndOfDay = (value: string) => {
  return new Date(`${value}T23:59:59.999-03:00`);
};

const parseUntil = (value: string) => {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? parseDateOnlyInSaoPauloEndOfDay(value)
    : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("--until deve ser uma data válida.");
  }

  return date;
};

const parseRegistrationDate = (value: string) => {
  const date = parseCrpRegistrationDate(value, {
    allowFuture: true,
  });

  if (!date) {
    throw new Error("--crp-registration-date deve ser uma data válida.");
  }

  if (date > new Date()) {
    throw new Error("--crp-registration-date não pode estar no futuro.");
  }

  return date;
};

const assertNonEmpty = (value: unknown, message: string) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(message);
  }

  return value.trim();
};

const readFlags = (argv: string[]) => {
  const flags = new Map<string, string | true>();

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--help" || token === "-h") {
      flags.set("help", true);
      continue;
    }

    if (!token.startsWith("--")) {
      throw new Error(`Argumento inválido: ${token}`);
    }

    const [key, inlineValue] = token.slice(2).split("=", 2);

    if (!key) {
      throw new Error(`Argumento inválido: ${token}`);
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

const parseArgs = (argv: string[]): GrantArgs | null => {
  const flags = readFlags(argv);

  if (flags.has("help")) {
    console.log(help);
    return null;
  }

  const allowedFlags = new Set([
    "actor",
    "crp-registration-date",
    "days",
    "notes",
    "psychologist-email",
    "psychologist-profile-id",
    "psychologist-user-id",
    "reason",
    "until",
  ]);

  for (const key of flags.keys()) {
    if (!allowedFlags.has(key)) {
      throw new Error(`Flag desconhecida: --${key}`);
    }
  }

  const targetFlags = [
    getOptionalString(flags, "psychologist-email"),
    getOptionalString(flags, "psychologist-user-id"),
    getOptionalString(flags, "psychologist-profile-id"),
  ].filter(Boolean);

  if (targetFlags.length !== 1) {
    throw new Error(
      "Informe exatamente um alvo: --psychologist-email, --psychologist-user-id ou --psychologist-profile-id.",
    );
  }

  const rawDays = getOptionalString(flags, "days");
  const rawUntil = getOptionalString(flags, "until");
  const rawRegistrationDate = getOptionalString(flags, "crp-registration-date");

  if (rawDays && rawUntil) {
    throw new Error("Informe apenas um período: --days ou --until.");
  }

  if (!rawDays && !rawUntil) {
    throw new Error("Informe o período da concessão com --days ou --until.");
  }

  const days = rawDays ? Number(rawDays) : undefined;
  if (rawDays && (!Number.isInteger(days) || Number(days) <= 0)) {
    throw new Error("--days deve ser um número inteiro positivo.");
  }

  return {
    actor: assertNonEmpty(flags.get("actor"), "--actor é obrigatório para auditoria."),
    days,
    notes: getOptionalString(flags, "notes"),
    psychologistEmail: getOptionalString(flags, "psychologist-email"),
    psychologistProfileId: getOptionalString(flags, "psychologist-profile-id"),
    psychologistUserId: getOptionalString(flags, "psychologist-user-id"),
    reason: assertNonEmpty(flags.get("reason"), "--reason é obrigatório para auditoria."),
    registrationDate: rawRegistrationDate ? parseRegistrationDate(rawRegistrationDate) : undefined,
    until: rawUntil ? parseUntil(rawUntil) : undefined,
  };
};

const resolvePeriodEnd = (args: GrantArgs) => {
  const now = new Date();
  const periodEnd = args.until ?? new Date(now.getTime() + Number(args.days) * 24 * 60 * 60 * 1000);

  if (periodEnd <= now) {
    throw new Error("O fim da concessão deve estar no futuro.");
  }

  return periodEnd;
};

const findTarget = async (args: GrantArgs): Promise<GrantTarget> => {
  if (args.psychologistProfileId) {
    const profile = await prisma.psychologist_profile.findFirst({
      where: {
        id: args.psychologistProfileId,
        deleted: false,
        user: {
          active: true,
          deleted: false,
          role: "psicologo",
        },
      },
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
    });

    if (!profile) {
      throw new Error("Perfil de psicólogo não encontrado ou não autorizado para concessão.");
    }

    return {
      email: profile.user.email,
      name: profile.user.name,
      profileId: profile.id,
      userId: profile.user.id,
    };
  }

  const user = await prisma.user.findFirst({
    where: {
      ...(args.psychologistEmail ? { email: args.psychologistEmail } : {}),
      ...(args.psychologistUserId ? { id: args.psychologistUserId } : {}),
      active: true,
      deleted: false,
      role: "psicologo",
    },
    select: {
      email: true,
      id: true,
      name: true,
      psychologist_profile: {
        select: {
          deleted: true,
          id: true,
        },
      },
    },
  });

  if (!user?.psychologist_profile || user.psychologist_profile.deleted) {
    throw new Error("Usuário psicólogo não encontrado ou sem perfil profissional ativo.");
  }

  return {
    email: user.email,
    name: user.name,
    profileId: user.psychologist_profile.id,
    userId: user.id,
  };
};

const grantProfessionalSubscription = async (args: GrantArgs) => {
  const target = await findTarget(args);
  const periodEnd = resolvePeriodEnd(args);
  const professionalPlan = await prisma.subscription_plan.findFirst({
    where: {
      active: true,
      deleted: false,
      slug: "profissional",
    },
  });

  if (!professionalPlan) {
    throw new Error("Plano profissional ativo não encontrado.");
  }

  const now = new Date();
  const subscription = await prisma.$transaction(async (tx) => {
    const externalBillingSubscription = await tx.professional_subscription.findFirst({
      where: {
        deleted: false,
        psychologist_id: target.profileId,
        status: {
          not: "cancelada",
        },
        OR: [
          {
            source: "mercadopago",
          },
          {
            gateway: {
              not: null,
            },
          },
          {
            gateway_subscription_id: {
              not: null,
            },
          },
        ],
      },
      select: {
        gateway: true,
        gateway_subscription_id: true,
        id: true,
        source: true,
        status: true,
      },
    });

    if (externalBillingSubscription) {
      throw new Error(
        `Existe assinatura vinculada a gateway (${externalBillingSubscription.id}). Cancele/reconcilie a cobrança no gateway antes de conceder benefício gratuito.`,
      );
    }

    await tx.professional_subscription.updateMany({
      where: {
        deleted: false,
        psychologist_id: target.profileId,
        status: {
          not: "cancelada",
        },
      },
      data: {
        status: "cancelada",
      },
    });

    if (args.registrationDate) {
      await tx.psychologist_profile.update({
        where: {
          id: target.profileId,
        },
        data: {
          crp_registration_date: args.registrationDate,
        },
      });
    }

    return tx.professional_subscription.create({
      data: {
        current_period_end: periodEnd,
        gateway: null,
        gateway_subscription_id: null,
        grant_notes: args.notes ?? null,
        grant_reason: args.reason,
        grant_started_at: now,
        granted_by: args.actor,
        plan_id: professionalPlan.id,
        psychologist_id: target.profileId,
        source: SOURCE_ADMIN_GRANT,
        status: "ativa",
      },
      include: {
        plan: true,
      },
    });
  });

  return {
    crp_registration_date: args.registrationDate ?? null,
    granted_to: target,
    subscription: {
      id: subscription.id,
      current_period_end: subscription.current_period_end,
      plan: {
        id: subscription.plan.id,
        name: subscription.plan.name,
        slug: subscription.plan.slug,
      },
      source: subscription.source,
      status: subscription.status,
    },
  };
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  if (!args) return;

  const result = await grantProfessionalSubscription(args);
  console.log(JSON.stringify(result, null, 2));
};

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Erro desconhecido.";
    console.error(message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
