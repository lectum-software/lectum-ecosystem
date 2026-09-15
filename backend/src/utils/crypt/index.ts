import * as argon from "./argon";
import * as bcrypt from "./bcrypt";

const isArgon = process.env.CRYPTO_ALGORITHM?.trim().toLowerCase() === "argon";
const BCRYPT_MAX_INPUT_BYTES = 72;
const DUMMY_PASSWORD_HASH = "$2b$10$3NsORax.HVOAN5tLfwMzqO1gaW5Bo7vcmAB6QDr3KmMXqzsuKQU4G";

// Bcrypt descarta silenciosamente o sufixo acima de 72 bytes, inclusive em UTF-8.
// O verificador já reconhece ambos os formatos; hashes existentes não são regravados.
export const encrypt = (value: string) =>
  isArgon || Buffer.byteLength(value, "utf8") > BCRYPT_MAX_INPUT_BYTES
    ? argon.encrypt(value)
    : bcrypt.encrypt(value);

export const compare = async (value: string, encrypted: string) => {
  if (argon.isValidHash(encrypted)) return argon.compare(value, encrypted);
  if (/^\$2[abxy]\$/.test(encrypted)) return bcrypt.compare(value, encrypted);

  return false;
};

export const comparePasswordOrDummy = async (value: string, encrypted?: string | null) => {
  if (encrypted) return compare(value, encrypted);

  await compare(value, DUMMY_PASSWORD_HASH);
  return false;
};
