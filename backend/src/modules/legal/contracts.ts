import { createHash } from "node:crypto";
import type { legal_document_version } from "@/external/generated/prisma/client";

export const LEGAL_KINDS = ["terms", "privacy"] as const;
export type LegalKind = (typeof LEGAL_KINDS)[number];
export type LegalDraft = { kind: LegalKind; title: string; body: string; change_summary: string };
export type LegalEdit = Omit<LegalDraft, "kind"> & { revision: number };
export type LegalAccept = {
  document_ids: string[];
  terms_accepted: boolean;
  privacy_acknowledged: boolean;
  adult_confirmed: boolean;
};
export class LegalError extends Error {
  constructor(
    readonly code:
      | "legal_not_found"
      | "legal_conflict"
      | "legal_review_required"
      | "legal_incomplete"
      | "legal_documents_changed"
      | "legal_acceptance_required"
      | "adult_declaration_required",
    readonly status = 409,
  ) {
    super(code);
    this.name = "LegalError";
  }
}
export const normalizeDraft = (draft: Omit<LegalDraft, "kind">) => ({
  title: draft.title.trim(),
  body: draft.body.replace(/\r\n?/g, "\n").trim(),
  change_summary: draft.change_summary.trim(),
});
export const documentHash = (draft: Omit<LegalDraft, "kind">) =>
  createHash("sha256")
    .update(JSON.stringify(normalizeDraft(draft)))
    .digest("hex");
export const hasLegalPlaceholders = (text: string) =>
  /\[[A-ZÀ-Ý][A-ZÀ-Ý0-9_ /()-]{1,100}\]/u.test(text);
export const canPublishDocument = (draft: Omit<LegalDraft, "kind">) => {
  const value = normalizeDraft(draft);
  return (
    value.title.length >= 5 &&
    value.body.length >= 1000 &&
    value.change_summary.length >= 10 &&
    !hasLegalPlaceholders(`${value.title}\n${value.body}\n${value.change_summary}`) &&
    !/^\s*#{0,6}\s*(?:minuta|rascunho)\b/imu.test(value.body)
  );
};
export const isCompleteLegalBundle = (docs: Pick<legal_document_version, "kind">[]) =>
  LEGAL_KINDS.every((kind) => docs.some((doc) => doc.kind === kind));
export const isCurrentDocumentSet = (
  ids: string[],
  documents: Pick<legal_document_version, "id" | "kind">[],
) =>
  isCompleteLegalBundle(documents) &&
  ids.length === documents.length &&
  new Set(ids).size === ids.length &&
  documents.every((doc) => ids.includes(doc.id));
export const publicDocument = (doc: legal_document_version) => ({
  id: doc.id,
  kind: doc.kind as LegalKind,
  version: doc.version,
  title: doc.title,
  body: doc.body,
  change_summary: doc.change_summary,
  content_hash: doc.content_hash,
  published_at: doc.published_at?.toISOString() ?? null,
});
export const documentSummary = (doc: legal_document_version, count = 0) => ({
  ...publicDocument(doc),
  body: undefined,
  status: doc.status as "draft" | "published",
  revision: doc.revision,
  created_at: doc.createdAt.toISOString(),
  updated_at: doc.updatedAt.toISOString(),
  acceptance_count: count,
});
