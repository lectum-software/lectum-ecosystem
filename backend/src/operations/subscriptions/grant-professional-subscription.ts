import "dotenv/config";

import prisma from "@/infra/database/prisma";
import {
  type GrantProfessionalSubscriptionArgs,
  grantProfessionalSubscription,
  parseGrantCrpRegistrationDate,
} from "./grant-professional-subscription-service";

const help = `Concede Plano Profissional por tempo determinado, sem criar cobranca.

Uso:
  pnpm --dir backend subscription:grant -- --psychologist-email psi@example.com --days 90 --reason "Parceria" --actor "Admin"

Alvos aceitos, escolha apenas um:
  --psychologist-email <email>
  --psychologist-user-id <user.id>
  --psychologist-profile-id <psychologist_profile.id>

Periodo, escolha apenas um:
  --days <numero de dias>
  --until <YYYY-MM-DD ou ISO datetime>

Auditoria:
  --reason <motivo obrigatorio>
  --actor <responsavel obrigatorio>
  --notes <observacoes opcionais>

Experiencia profissional:
  --crp-registration-date <YYYY-MM-DD ou DD/MM/YYYY>
  Data de inscricao no CRP. Campo interno usado para calcular tempo de experiencia
  quando a cortesia substitui a consulta CFP automatica.

Seguranca:
  se houver assinatura nao cancelada vinculada a gateway, o comando bloqueia a concessao.
`;

const parseDateOnlyInSaoPauloEndOfDay = (value: string) => {
  return new Date(`${value}T23:59:59.999-03:00`);
};

const parseUntil = (value: string) => {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? parseDateOnlyInSaoPauloEndOfDay(value)
    : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("--until deve ser uma data valida.");
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

const parseArgs = (argv: string[]): GrantProfessionalSubscriptionArgs | null => {
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
    throw new Error("Informe apenas um periodo: --days ou --until.");
  }

  if (!rawDays && !rawUntil) {
    throw new Error("Informe o periodo da concessao com --days ou --until.");
  }

  const days = rawDays ? Number(rawDays) : undefined;
  if (rawDays && (!Number.isInteger(days) || Number(days) <= 0)) {
    throw new Error("--days deve ser um numero inteiro positivo.");
  }

  return {
    actor: assertNonEmpty(flags.get("actor"), "--actor e obrigatorio para auditoria."),
    days,
    notes: getOptionalString(flags, "notes"),
    psychologistEmail: getOptionalString(flags, "psychologist-email"),
    psychologistProfileId: getOptionalString(flags, "psychologist-profile-id"),
    psychologistUserId: getOptionalString(flags, "psychologist-user-id"),
    reason: assertNonEmpty(flags.get("reason"), "--reason e obrigatorio para auditoria."),
    registrationDate: rawRegistrationDate
      ? parseGrantCrpRegistrationDate(rawRegistrationDate)
      : undefined,
    until: rawUntil ? parseUntil(rawUntil) : undefined,
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
