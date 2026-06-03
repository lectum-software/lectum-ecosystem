import * as argon from "./argon";
import * as bcrypt from "./bcrypt";

const isArgon = process.env.CRYPTO_ALGORITHM === "argon";

export const encrypt = isArgon ? argon.encrypt : bcrypt.encrypt;
export const compare = isArgon ? argon.compare : bcrypt.compare;
