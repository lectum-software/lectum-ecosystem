import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import {
  documentSummary,
  isCompleteLegalBundle,
  LEGAL_KINDS,
  LegalError,
  publicDocument,
} from "../contracts";

export const currentDocuments = async (db: Prisma.TransactionClient = prisma) => {
  const docs = await Promise.all(
    LEGAL_KINDS.map((kind) =>
      db.legal_document_version.findFirst({
        where: { kind, status: "published" },
        orderBy: [{ published_at: "desc" }, { version: "desc" }],
      }),
    ),
  );
  return docs.filter((doc) => doc !== null);
};
export class LegalReadRepository {
  async current() {
    const docs = await currentDocuments();
    return { configured: isCompleteLegalBundle(docs), documents: docs.map(publicDocument) };
  }
  async publicDetail(id: string) {
    const doc = await prisma.legal_document_version.findFirst({
      where: { id, status: "published" },
    });
    if (!doc) throw new LegalError("legal_not_found", 404);
    return publicDocument(doc);
  }
  async detail(id: string) {
    const doc = await prisma.legal_document_version.findUnique({
      where: { id },
      include: { _count: { select: { acceptances: true } } },
    });
    if (!doc) throw new LegalError("legal_not_found", 404);
    return { ...documentSummary(doc, doc._count.acceptances), body: doc.body };
  }
  async list(page: number) {
    const limit = 20;
    const [items, total, current] = await Promise.all([
      prisma.legal_document_version.findMany({
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
        include: { _count: { select: { acceptances: true } } },
      }),
      prisma.legal_document_version.count(),
      currentDocuments(),
    ]);
    return {
      items: items.map((doc) => documentSummary(doc, doc._count.acceptances)),
      total,
      page,
      limit,
      configured: isCompleteLegalBundle(current),
    };
  }
  async status(userId: string) {
    const docs = await currentDocuments();
    const acceptances = await prisma.legal_acceptance.findMany({
      where: { user_id: userId, document_id: { in: docs.map((doc) => doc.id) } },
      select: { document_id: true, accepted_at: true },
    });
    return {
      configured: isCompleteLegalBundle(docs),
      documents: docs.map(publicDocument),
      pending_document_ids: isCompleteLegalBundle(docs)
        ? docs
            .filter((doc) => !acceptances.some((a) => a.document_id === doc.id))
            .map((doc) => doc.id)
        : [],
      acceptances: acceptances.map((a) => ({ ...a, accepted_at: a.accepted_at.toISOString() })),
    };
  }
  async acceptances(documentId: string, page: number) {
    const doc = await prisma.legal_document_version.findUnique({
      where: { id: documentId },
      select: { id: true, version: true, kind: true },
    });
    if (!doc) throw new LegalError("legal_not_found", 404);
    const where = { document_id: documentId };
    const limit = 20;
    const [rows, total] = await Promise.all([
      prisma.legal_acceptance.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ accepted_at: "desc" }, { id: "desc" }],
        select: {
          user_id: true,
          document_id: true,
          accepted_at: true,
          user: { select: { name: true } },
        },
      }),
      prisma.legal_acceptance.count({ where }),
    ]);
    return {
      items: rows.map((row) => ({
        user_id: row.user_id,
        user_name: row.user.name,
        document_id: doc.id,
        version: doc.version,
        kind: doc.kind,
        accepted_at: row.accepted_at.toISOString(),
      })),
      total,
      page,
      limit,
    };
  }
}
