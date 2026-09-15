import type {
  R2MigrationPurpose,
  R2MigrationTargetEnvironment,
} from "@/modules/video-assets/r2-migration";

export type R2ToStreamCliOptions = {
  apply: boolean;
  confirmEnvironment: R2MigrationTargetEnvironment | null;
  limit: number;
  pollIntervalMs: number;
  purpose: R2MigrationPurpose | "all";
  waitTimeoutMs: number;
};

export class R2ToStreamArgumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "R2ToStreamArgumentError";
  }
}

const PURPOSES = new Set<R2MigrationPurpose | "all">([
  "all",
  "community_post",
  "community_reply",
  "profile_presentation",
]);

const readFlags = (argv: string[]) => {
  const flags = new Map<string, string | true>();

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--" && index === 0) continue;
    if (!token.startsWith("--")) {
      throw new R2ToStreamArgumentError(`Argumento inválido: ${token}`);
    }

    const [key, inlineValue] = token.slice(2).split("=", 2);
    if (!key || flags.has(key)) {
      throw new R2ToStreamArgumentError(`Flag inválida ou repetida: ${token}`);
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

const optionalString = (flags: Map<string, string | true>, key: string) => {
  const value = flags.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
};

const integerFlag = (
  flags: Map<string, string | true>,
  key: string,
  fallback: number,
  min: number,
  max: number,
) => {
  const raw = optionalString(flags, key);
  if (raw === null) {
    if (flags.has(key)) {
      throw new R2ToStreamArgumentError(`--${key} exige um valor.`);
    }
    return fallback;
  }

  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new R2ToStreamArgumentError(`--${key} deve ser um inteiro entre ${min} e ${max}.`);
  }
  return value;
};

export const parseR2ToStreamArguments = (argv: string[]): R2ToStreamCliOptions | null => {
  const flags = readFlags(argv);
  const allowed = new Set([
    "apply",
    "confirm",
    "dry-run",
    "help",
    "limit",
    "poll-seconds",
    "purpose",
    "wait-seconds",
  ]);
  for (const key of flags.keys()) {
    if (!allowed.has(key)) throw new R2ToStreamArgumentError(`Flag desconhecida: --${key}`);
  }

  if (flags.has("help")) return null;
  if (flags.has("apply") && flags.has("dry-run")) {
    throw new R2ToStreamArgumentError("Use apenas --dry-run ou --apply.");
  }
  if (typeof flags.get("apply") === "string" || typeof flags.get("dry-run") === "string") {
    throw new R2ToStreamArgumentError("--apply e --dry-run não recebem valor.");
  }

  const rawPurpose = optionalString(flags, "purpose");
  if (flags.has("purpose") && !rawPurpose) {
    throw new R2ToStreamArgumentError("--purpose exige um valor.");
  }
  const purpose = rawPurpose ?? "all";
  if (!PURPOSES.has(purpose as R2MigrationPurpose | "all")) {
    throw new R2ToStreamArgumentError(
      "--purpose deve ser all, profile_presentation, community_post ou community_reply.",
    );
  }

  const rawConfirmation = optionalString(flags, "confirm");
  if (flags.has("confirm") && !rawConfirmation) {
    throw new R2ToStreamArgumentError("--confirm exige um valor.");
  }
  if (rawConfirmation && rawConfirmation !== "homolog" && rawConfirmation !== "production") {
    throw new R2ToStreamArgumentError("--confirm deve ser homolog ou production.");
  }
  if (!flags.has("apply") && rawConfirmation) {
    throw new R2ToStreamArgumentError("--confirm só pode ser usado com --apply.");
  }

  return {
    apply: flags.has("apply"),
    confirmEnvironment: rawConfirmation as R2MigrationTargetEnvironment | null,
    limit: integerFlag(flags, "limit", 5, 1, 50),
    pollIntervalMs: integerFlag(flags, "poll-seconds", 10, 5, 60) * 1_000,
    purpose: purpose as R2MigrationPurpose | "all",
    waitTimeoutMs: integerFlag(flags, "wait-seconds", 1_800, 60, 3_600) * 1_000,
  };
};
