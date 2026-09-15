import type { Prisma } from "@/external/generated/prisma/client";
import { isCompleteLegalBundle, LegalError } from "./contracts";
import { currentDocuments } from "./repositories/LegalReadRepository";

// Old clients remain compatible before activation; no legacy declaration is invented.
export const assertAdultRegistration = async (
  adult: boolean | undefined,
  tx?: Prisma.TransactionClient,
) => {
  if (adult === true) return;
  if (adult === false || isCompleteLegalBundle(await currentDocuments(tx))) {
    throw new LegalError("adult_declaration_required", 422);
  }
};
