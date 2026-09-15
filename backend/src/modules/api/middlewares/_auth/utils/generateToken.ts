import { createId } from "@paralleldrive/cuid2";
import jwt, { type SignOptions } from "jsonwebtoken";
import { getUserJwtTtlSeconds } from "@/utils/runtime-config";
import { getJwtSecret, JWT_ALGORITHM } from "./jwt-secret";

export const generateToken = (
  data: { id: string; email: string },
  type: string,
  device_id: string,
  signOptions?: SignOptions,
) => {
  const randomId = createId();

  const options = {
    id: data.id,
    email: data.email,
    type,
    randomId,
    device_id,
  };

  return jwt.sign(options, getJwtSecret(), {
    expiresIn: getUserJwtTtlSeconds(),
    ...signOptions,
    algorithm: JWT_ALGORITHM,
  });
};
