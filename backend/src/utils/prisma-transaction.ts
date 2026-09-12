import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { isSerializableRetryableError } from "./prisma-error";

export { getPrismaErrorCode, isPrismaErrorCode } from "./prisma-error";

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
      const shouldRetry = attempt < attempts && isSerializableRetryableError(error);

      if (!shouldRetry) throw error;

      await new Promise((resolve) => setTimeout(resolve, attempt * 25));
    }
  }

  throw new Error("Serializable transaction exhausted without a result");
};
