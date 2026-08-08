import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { isPrismaErrorCode } from "./prisma-error";

export { getPrismaErrorCode, isPrismaErrorCode } from "./prisma-error";

const SERIALIZABLE_RETRY_CODES = new Set(["P2002", "P2034"]);
const DEFAULT_MAX_ATTEMPTS = 3;

export const withSerializableTransaction = async <T>(
  callback: (transaction: Prisma.TransactionClient) => Promise<T>,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
): Promise<T> => {
  const attempts = Math.max(1, Math.min(5, Math.trunc(maxAttempts)));

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await prisma.$transaction(callback, {
        isolationLevel: "Serializable",
      });
    } catch (error) {
      const shouldRetry =
        attempt < attempts && isPrismaErrorCode(error, [...SERIALIZABLE_RETRY_CODES]);

      if (!shouldRetry) throw error;

      await new Promise((resolve) => setTimeout(resolve, attempt * 25));
    }
  }

  throw new Error("Serializable transaction exhausted without a result");
};
