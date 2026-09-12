export type AdminLegalKind = "terms" | "privacy";

export type AdminLegalDocumentSummary = {
  id: string;
  kind: AdminLegalKind;
  version: number;
  status: "draft" | "published";
  revision: number;
  title: string;
  change_summary: string;
  content_hash: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  acceptance_count: number;
};

export type AdminLegalDocument = AdminLegalDocumentSummary & { body: string };

export type AdminLegalPage<T> = {
  items: T[];
  total: number;
  page: number;
  limit: 20;
};

export type AdminLegalDocuments = AdminLegalPage<AdminLegalDocumentSummary> & {
  configured: boolean;
};

export type AdminLegalAcceptance = {
  user_id: string;
  user_name: string;
  document_id: string;
  version: number;
  kind: AdminLegalKind;
  accepted_at: string;
};

export type AdminLegalDraftInput = {
  kind: AdminLegalKind;
  title: string;
  body: string;
  change_summary: string;
};

export type AdminLegalUpdateInput = Omit<AdminLegalDraftInput, "kind"> & { revision: number };
export type AdminLegalPublishInput = { revision: number; review_confirmed: true };
