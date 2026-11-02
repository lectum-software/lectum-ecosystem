import type { Prisma } from "@/external/generated/prisma/client";
import { isCompleteLegalBundle, LegalError } from "./contracts";
import { currentDocuments } from "./repositories/LegalReadRepository";
import { acceptLegalInTransaction } from "./repositories/LegalWriteRepository";

export const acceptRegistrationLegal = async (
  tx: Prisma.TransactionClient,
  userId: string,
  input: {
    legal_document_ids?: string[];
    terms_accepted?: boolean;
    privacy_acknowledged?: boolean;
    adult_confirmed?: boolean;
  },
) => {
  if (input.legal_document_ids === undefined) return;
  await acceptLegalInTransaction(tx, userId, {
    document_ids: input.legal_document_ids,
    terms_accepted: input.terms_accepted === true,
    privacy_acknowledged: input.privacy_acknowledged === true,
    adult_confirmed: input.adult_confirmed === true,
  });
};

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
