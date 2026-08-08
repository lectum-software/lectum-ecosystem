import "dotenv/config";

import prisma from "@/infra/database/prisma";
import { encrypt } from "@/utils/crypt";

const help = `Cria ou atualiza o primeiro administrador da Lectum.

Uso:
  pnpm --dir backend admin:bootstrap -- --email admin@example.com --name "Admin Lectum" --password "senha-forte"

Alternativa recomendada para evitar senha no hist\u00f3rico do shell:
  $env:LECTUM_ADMIN_BOOTSTRAP_PASSWORD="senha-forte"; pnpm --dir backend admin:bootstrap -- --email admin@example.com --name "Admin Lectum" --password-env LECTUM_ADMIN_BOOTSTRAP_PASSWORD

Flags obrigat\u00f3rias:
  --email <email>
  --name <nome>
  --password <senha> ou --password-env <NOME_DA_ENV>

Seguran\u00e7a:
  A senha nunca \u00e9 exibida no output. Ao atualizar um admin existente, sess\u00f5es anteriores s\u00e3o revogadas.
`;

type BootstrapArgs = {
  email: string;
  name: string;
  password: string;
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
      throw new Error(`Argumento inv\u00e1lido: ${token}`);
    }

    const [key, inlineValue] = token.slice(2).split("=", 2);
    if (!key) {
      throw new Error(`Argumento inv\u00e1lido: ${token}`);
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
    throw new Error("--email deve ser um e-mail v\u00e1lido.");
  }

  return normalized;
};

const parseArgs = (argv: string[]): BootstrapArgs | null => {
  const flags = readFlags(argv);

  if (flags.has("help")) {
    console.log(help);
    return null;
  }

  const allowedFlags = new Set(["email", "help", "name", "password", "password-env"]);
  for (const key of flags.keys()) {
    if (!allowedFlags.has(key)) {
      throw new Error(`Flag desconhecida: --${key}`);
    }
  }

  const passwordFlag = flags.get("password");
  const passwordEnvFlag = flags.get("password-env");

  if (passwordFlag && passwordEnvFlag) {
    throw new Error("Informe apenas uma origem de senha: --password ou --password-env.");
  }

  let password: string | undefined;
  if (typeof passwordFlag === "string") {
    password = passwordFlag;
  }

  if (typeof passwordEnvFlag === "string") {
    password = process.env[passwordEnvFlag];
    if (!password) {
      throw new Error(`A env ${passwordEnvFlag} n\u00e3o possui senha configurada.`);
    }
  }

  if (!password || password.length < 8) {
    throw new Error("A senha do admin deve ter pelo menos 8 caracteres.");
  }

  return {
    email: normalizeEmail(getRequiredString(flags, "email", "--email \u00e9 obrigat\u00f3rio.")),
    name: getRequiredString(flags, "name", "--name \u00e9 obrigat\u00f3rio."),
    password,
  };
};

const bootstrapAdmin = async (args: BootstrapArgs) => {
  const passwordHash = await encrypt(args.password);
  const existing = await prisma.admin.findUnique({
    where: {
      email: args.email,
    },
    select: {
      id: true,
    },
  });

  const now = new Date();
  const admin = await prisma.$transaction(async (tx) => {
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
          email: true,
          id: true,
          name: true,
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
        email: true,
        id: true,
        name: true,
      },
    });

    return { action: "created" as const, admin: created };
  });

  return admin;
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  if (!args) return;

  const result = await bootstrapAdmin(args);
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
