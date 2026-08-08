//Libs
import * as argon2 from "argon2";

export interface Argon2Options {
  type?: 0 | 1 | 2; // 0=argon2d, 1=argon2i, 2=argon2id
  memoryCost?: number; // KiB
  timeCost?: number; // iterations
  parallelism?: number; // threads
  hashLength?: number; // bytes
  pepper?: string;
}

const DEFAULT_OPTIONS: Required<Omit<Argon2Options, "pepper">> = {
  type: 2, // argon2id - recomendado para senhas (híbrido)
  memoryCost: 65536, // 64 MiB - alto para resistir a ataques
  timeCost: 3, // 3 iterações - bom equilíbrio segurança/performance
  parallelism: 1, // 1 thread - pode ser aumentado em servidores
  hashLength: 32, // 32 bytes (256 bits) - tamanho padrão
};

// Configurações por ambiente
const ENVIRONMENT_OPTIONS = {
  development: {
    memoryCost: 16384, // 16 MiB - mais rápido para desenvolvimento
    timeCost: 2,
    parallelism: 1,
  },
  production: {
    memoryCost: 131072, // 128 MiB - máxima segurança
    timeCost: 4,
    parallelism: 2,
  },
  highSecurity: {
    memoryCost: 262144, // 256 MiB - segurança extrema
    timeCost: 6,
    parallelism: 4,
  },
};

const getEnvironmentOptions = (): Partial<Argon2Options> => {
  const env = process.env.NODE_ENV?.trim().toLowerCase() || "development";

  if (env === "production" || env === "prod") return ENVIRONMENT_OPTIONS.production;
  if (env === "high-security") return ENVIRONMENT_OPTIONS.highSecurity;

  return ENVIRONMENT_OPTIONS.development;
};

const validateInput = (value: string): string | null => {
  if (!value || typeof value !== "string") {
    return "String is required";
  }

  if (value.length < 1) {
    return "String cannot be empty";
  }

  return null;
};

const applyPepper = (value: string, pepper?: string): string => {
  if (!pepper) return value;
  return value + pepper;
};

const normalizeOptions = (options: Argon2Options = {}): argon2.Options & { pepper?: string } => {
  const envOptions = getEnvironmentOptions();

  return {
    type: options.type ?? DEFAULT_OPTIONS.type,
    memoryCost: options.memoryCost ?? envOptions.memoryCost ?? DEFAULT_OPTIONS.memoryCost,
    timeCost: options.timeCost ?? envOptions.timeCost ?? DEFAULT_OPTIONS.timeCost,
    parallelism: options.parallelism ?? envOptions.parallelism ?? DEFAULT_OPTIONS.parallelism,
    hashLength: options.hashLength ?? DEFAULT_OPTIONS.hashLength,
    pepper: options.pepper,
  };
};

/**
 * Encripta um valor usando Argon2 com configurações de segurança otimizadas
 * @param value - Valor a ser encriptado
 * @param options - Opções de configuração do Argon2
 * @returns Promise<CryptResult>
 */
export const encrypt = async (value: string, options: Argon2Options = {}): Promise<string> => {
  const validationError = validateInput(value);
  if (validationError) throw new Error(validationError);

  const normalizedOptions = normalizeOptions(options);
  const { pepper, ...argon2Options } = normalizedOptions;

  const valueWithPepper = applyPepper(value, pepper);

  const encrypted = await argon2.hash(valueWithPepper, argon2Options);

  return encrypted;
};

/**
 * Compara um valor com sua versão encriptada usando Argon2
 * @param value - Valor em texto plano
 * @param encrypted - Valor encriptado
 * @param pepper - Pepper usado na encriptação (se aplicável)
 * @returns Promise<CryptResult>
 */
export const compare = async (
  value: string,
  encrypted: string,
  pepper?: string,
): Promise<boolean> => {
  try {
    const valueError = validateInput(value);
    if (valueError) return false;

    if (!encrypted || typeof encrypted !== "string") return false;

    const valueWithPepper = applyPepper(value, pepper);
    const compared = await argon2.verify(encrypted, valueWithPepper);

    return compared;
  } catch (_error) {
    return false;
  }
};

/**
 * Verifica se um hash é válido (formato Argon2)
 * @param hash - Hash a ser verificado
 * @returns boolean
 */
export const isValidHash = (hash: string): boolean => {
  if (!hash || typeof hash !== "string") return false;

  // Argon2 hashes começam com $argon2id$, $argon2i$, ou $argon2d$
  return /^\$argon2(id|i|d)\$/.test(hash);
};

export const getRecommendedOptions = {
  development: (): Argon2Options => ({
    type: 2, // argon2id
    memoryCost: 16384, // 16 MiB
    timeCost: 2,
    parallelism: 1,
  }),

  production: (): Argon2Options => ({
    type: 2, // argon2id
    memoryCost: 131072, // 128 MiB
    timeCost: 4,
    parallelism: 2,
  }),

  highSecurity: (): Argon2Options => ({
    type: 2, // argon2id
    memoryCost: 262144, // 256 MiB
    timeCost: 6,
    parallelism: 4,
  }),

  custom: (memoryCost: number, timeCost: number, parallelism: number = 1): Argon2Options => ({
    type: 2, // argon2id
    memoryCost,
    timeCost,
    parallelism,
  }),
};
