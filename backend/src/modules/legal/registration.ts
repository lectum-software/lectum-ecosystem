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
    promotional_authorized?: boolean;
    adult_confirmed?: boolean;
  },
) => {
  if (input.legal_document_ids === undefined) {
    // Cached clients cannot attest a version; leave acceptance pending for the legal modal.
    return;
  }
  const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { role: true } });
  if (user.role === "psicologo" && input.promotional_authorized === false) {
    throw new LegalError("legal_acceptance_required", 422);
  }
  await acceptLegalInTransaction(tx, userId, {
    promotional_authorized: input.promotional_authorized === true,
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
