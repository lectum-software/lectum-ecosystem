import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import {
  canPublishDocument,
  documentHash,
  isCurrentDocumentSet,
  type LegalAccept,
  type LegalDraft,
  type LegalEdit,
  LegalError,
  type LegalKind,
  normalizeDraft,
} from "../contracts";
import { currentDocuments, LegalReadRepository } from "./LegalReadRepository";

// Shared lock ordering prevents publication racing an acceptance of stale documents.
const lockKind = async (tx: Prisma.TransactionClient, kind: LegalKind) => {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(178369, ${kind === "terms" ? 1 : 2}::int)`;
};
const audit = async (
  tx: Prisma.TransactionClient,
  adminId: string,
  id: string,
  action: string,
  version: number,
  hash: string,
) => {
  await tx.admin_activity_log.create({
    data: {
      admin_id: adminId,
      target_type: "legal_document",
      target_id: id,
      domain: "legal",
      action,
      area: "settings",
      metadata: { version, content_hash: hash },
    },
  });
};
const createDraft = async (tx: Prisma.TransactionClient, adminId: string, draft: LegalDraft) => {
  await lockKind(tx, draft.kind);
  const last = await tx.legal_document_version.aggregate({
    where: { kind: draft.kind },
    _max: { version: true },
  });
  const value = normalizeDraft(draft);
  const doc = await tx.legal_document_version.create({
    data: {
      ...value,
      kind: draft.kind,
      version: (last._max.version ?? 0) + 1,
      content_hash: documentHash(value),
      created_by_admin_id: adminId,
      updated_by_admin_id: adminId,
    },
  });
  await audit(tx, adminId, doc.id, "draft_created", doc.version, doc.content_hash);
  return doc.id;
};
export class LegalWriteRepository {
  async create(adminId: string, draft: LegalDraft) {
    const id = await prisma.$transaction((tx) => createDraft(tx, adminId, draft));
    return new LegalReadRepository().detail(id);
  }
  async duplicate(adminId: string, id: string) {
    const source = await prisma.legal_document_version.findUnique({ where: { id } });
    if (!source) throw new LegalError("legal_not_found", 404);
    return this.create(adminId, { ...source, kind: source.kind as LegalKind });
  }
  async edit(adminId: string, id: string, input: LegalEdit) {
    await prisma.$transaction(async (tx) => {
      const value = normalizeDraft(input);
      const hash = documentHash(value);
      const result = await tx.legal_document_version.updateMany({
        where: { id, status: "draft", revision: input.revision },
        data: {
          ...value,
          content_hash: hash,
          revision: { increment: 1 },
          updated_by_admin_id: adminId,
        },
      });
      if (result.count !== 1) throw new LegalError("legal_conflict");
      const doc = await tx.legal_document_version.findUniqueOrThrow({ where: { id } });
      await audit(tx, adminId, id, "draft_updated", doc.version, hash);
    });
    return new LegalReadRepository().detail(id);
  }
  async publish(adminId: string, id: string, revision: number, reviewed: boolean) {
    if (reviewed !== true) throw new LegalError("legal_review_required", 422);
    await prisma.$transaction(async (tx) => {
      const initial = await tx.legal_document_version.findUnique({ where: { id } });
      if (!initial) throw new LegalError("legal_not_found", 404);
      await lockKind(tx, initial.kind as LegalKind);
      // Read again under lock; CAS also protects concurrent draft edits.
      const doc = await tx.legal_document_version.findUniqueOrThrow({ where: { id } });
      if (doc.status !== "draft" || doc.revision !== revision)
        throw new LegalError("legal_conflict");
      const latest = await tx.legal_document_version.findFirst({
        where: { kind: doc.kind, status: "published" },
        orderBy: { version: "desc" },
        select: { version: true },
      });
      if (latest && latest.version >= doc.version) throw new LegalError("legal_conflict");
      if (!canPublishDocument(doc)) throw new LegalError("legal_incomplete", 422);
      const result = await tx.legal_document_version.updateMany({
        where: { id, status: "draft", revision },
        data: {
          status: "published",
          published_at: new Date(),
          published_by_admin_id: adminId,
          updated_by_admin_id: adminId,
          revision: { increment: 1 },
        },
      });
      if (result.count !== 1) throw new LegalError("legal_conflict");
      await audit(tx, adminId, id, "document_published", doc.version, doc.content_hash);
    });
    return new LegalReadRepository().detail(id);
  }
  async accept(userId: string, input: LegalAccept) {
    if (input.adult_confirmed !== true) throw new LegalError("adult_declaration_required", 422);
    if (input.terms_accepted !== true || input.privacy_acknowledged !== true)
      throw new LegalError("legal_acceptance_required", 422);
    await prisma.$transaction(async (tx) => {
      await lockKind(tx, "terms");
      await lockKind(tx, "privacy");
      const documents = await currentDocuments(tx);
      if (!isCurrentDocumentSet(input.document_ids, documents))
        throw new LegalError("legal_documents_changed");
      await tx.legal_acceptance.createMany({
        data: documents.map((doc) => ({
          user_id: userId,
          document_id: doc.id,
          document_hash: doc.content_hash,
          action: doc.kind === "terms" ? "terms_accept" : "privacy_acknowledge",
          adult_confirmed: true,
        })),
        skipDuplicates: true,
      });
    });
    return new LegalReadRepository().status(userId);
  }
}
