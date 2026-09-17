import { readFileSync } from "node:fs";

import "@/config/dotenv";

import prisma from "@/infra/database/prisma";
import { encrypt } from "@/utils/crypt";
import { assertDisposableLocalDatabaseTarget } from "@/utils/local-database-safety";

import {
  assertInitialProductionBootstrapFlags,
  assertInitialProductionBootstrapTarget,
} from "./initial-production-bootstrap-policy";

const help = `Cria ou atualiza um administrador local, ou cria exclusivamente o primeiro administrador de produção.

Uso local:
  pnpm --dir backend admin:bootstrap -- --email admin@example.com --name "Admin Lectum" --password "senha-forte"

Uso de produção (somente primeiro administrador; senha via stdin):
  printf '%s' "$ADMIN_PASSWORD" | node --enable-source-maps dist/operations/admin/bootstrap-admin.js --email admin@example.com --name "Admin Lectum" --password-stdin --confirm=production

Segurança:
  - o modo padrão aceita apenas banco local descartável;
  - o modo publicado exige exatamente produção, a API canônica e zero administradores existentes;
  - a senha nunca é exibida no output. Não a envie como argumento de shell.
`;

type PasswordSource = "argument" | "environment" | "stdin";

type BootstrapArgs = {
  confirm?: string;
  email: string;
  name: string;
  password: string;
  passwordSource: PasswordSource;
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

const getRequiredString = (flags: Map<string, string | true>, key: string, message: string) => {
  const value = flags.get(key);
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(message);
  }

  return value.trim();
};

const normalizeEmail = (email: string) => {
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error("--email deve ser um e-mail válido.");
  }

  return normalized;
};

const readPasswordFromStdin = () => {
  const password = readFileSync(0, "utf8").replace(/\r?\n$/, "");
  if (!password) {
    throw new Error("A senha do admin deve ser informada por stdin.");
  }

  return password;
};

export const parseBootstrapArgs = (argv: string[]): BootstrapArgs | null => {
  const flags = readFlags(argv);

  if (flags.has("help")) {
    console.log(help);
    return null;
  }

  const allowedFlags = new Set([
    "confirm",
    "email",
    "help",
    "name",
    "password",
    "password-env",
    "password-stdin",
  ]);
  for (const key of flags.keys()) {
    if (!allowedFlags.has(key)) {
      throw new Error(`Flag desconhecida: --${key}`);
    }
  }

  const passwordFlag = flags.get("password");
  const passwordEnvFlag = flags.get("password-env");
  const passwordStdinFlag = flags.get("password-stdin");
  const sources = [
    typeof passwordFlag === "string" ? "argument" : null,
    typeof passwordEnvFlag === "string" ? "environment" : null,
    passwordStdinFlag === true ? "stdin" : null,
  ].filter((source): source is PasswordSource => source !== null);

  if (sources.length !== 1) {
    throw new Error("Informe exatamente uma origem de senha.");
  }

  const passwordSource = sources[0];
  const password =
    passwordSource === "argument"
      ? (passwordFlag as string)
      : passwordSource === "environment"
        ? process.env[passwordEnvFlag as string]
        : readPasswordFromStdin();

  if (!password || password.length < 8) {
    throw new Error("A senha do admin deve ter pelo menos 8 caracteres.");
  }

  const confirm = flags.get("confirm");
  if (confirm !== undefined && typeof confirm !== "string") {
    throw new Error("--confirm exige um valor.");
  }

  return {
    confirm,
    email: normalizeEmail(getRequiredString(flags, "email", "--email é obrigatório.")),
    name: getRequiredString(flags, "name", "--name é obrigatório."),
    password,
    passwordSource,
  };
};

const bootstrapAdmin = async (args: BootstrapArgs) => {
  const initialProductionBootstrap = args.confirm !== undefined;

  if (initialProductionBootstrap) {
    assertInitialProductionBootstrapFlags({
      confirm: args.confirm,
      passwordSource: args.passwordSource,
    });
    assertInitialProductionBootstrapTarget(process.env);
  } else {
    assertDisposableLocalDatabaseTarget(process.env, "Bootstrap administrativo");
  }

  const passwordHash = await encrypt(args.password);
  const now = new Date();

  if (initialProductionBootstrap) {
    return prisma.$transaction(
      async (tx) => {
        const administratorCount = await tx.admin.count();
        if (administratorCount !== 0) {
          throw new Error("Bootstrap inicial bloqueado: já existe administrador.");
        }

        const admin = await tx.admin.create({
          data: {
            active: true,
            confirmed: true,
            confirmed_date: now,
            email: args.email,
            name: args.name,
            need_reset: false,
            password: passwordHash,
          },
          select: {
            active: true,
            confirmed: true,
            id: true,
          },
        });

        return { action: "created" as const, admin };
      },
      { isolationLevel: "Serializable" },
    );
  }

  const existing = await prisma.admin.findUnique({
    where: {
      email: args.email,
    },
    select: {
      id: true,
    },
  });

  return prisma.$transaction(async (tx) => {
    if (existing) {
      const updated = await tx.admin.update({
        where: {
          id: existing.id,
        },
        data: {
          active: true,
          confirmed: true,
          confirmed_date: now,
          deleted: false,
          deletedAt: null,
          email: args.email,
          name: args.name,
          need_reset: false,
          password: passwordHash,
          password_confirm: null,
        },
        select: {
          active: true,
          confirmed: true,
          id: true,
        },
      });

      await tx.admin_token.deleteMany({
        where: {
          admin_id: updated.id,
        },
      });

      return { action: "updated" as const, admin: updated };
    }

    const created = await tx.admin.create({
      data: {
        active: true,
        confirmed: true,
        confirmed_date: now,
        email: args.email,
        name: args.name,
        need_reset: false,
        password: passwordHash,
      },
      select: {
        active: true,
        confirmed: true,
        id: true,
      },
    });

    return { action: "created" as const, admin: created };
  });
};

const main = async () => {
  const args = parseBootstrapArgs(process.argv.slice(2));
  if (!args) return;

  const result = await bootstrapAdmin(args);
  console.log(
    JSON.stringify(
      {
        action: result.action,
        success: true,
      },
      null,
      2,
    ),
  );
};

if (require.main === module) {
  main()
    .catch((_error: unknown) => {
      console.error("Não foi possível concluir a operação de administrador.");
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
