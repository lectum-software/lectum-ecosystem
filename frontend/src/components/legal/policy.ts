import type { CurrentLegal, FullPublishedDoc, LegalKind, LegalStatus } from "@/api/req/legal/types";

export const LEGAL_TITLES = { terms: "Termos de Serviço", privacy: "Política de Privacidade" };
export const LEGAL_PATHS = { terms: "/termos-de-servico", privacy: "/politica-de-privacidade" };

export const legalDocumentHref = (document: Pick<FullPublishedDoc, "id" | "kind">) =>
  `${LEGAL_PATHS[document.kind]}?${new URLSearchParams({ version: document.id })}`;

export const hasCompleteLegalSet = (current?: CurrentLegal | null): current is CurrentLegal =>
  Boolean(
    current?.configured &&
      current.documents.length === 2 &&
      current.documents.some((document) => document.kind === "terms") &&
      current.documents.some((document) => document.kind === "privacy") &&
      new Set(current.documents.map((document) => document.id)).size === 2,
  );

export const legalSetKey = (documents: FullPublishedDoc[]) =>
  JSON.stringify(documents.map((document) => document.id).sort());

export const pendingLegalSet = (status?: LegalStatus | null) => {
  if (!hasCompleteLegalSet(status) || !status?.pending_document_ids.length) return null;
  const ids = new Set(status.documents.map((document) => document.id));
  if (!status.pending_document_ids.every((id) => ids.has(id))) return null;
  return { documents: status.documents, key: legalSetKey(status.documents) };
};

export const selectLegalDocument = (
  kind: LegalKind,
  current: CurrentLegal | null,
  version: string | undefined,
  exact: FullPublishedDoc | null,
) => {
  if (version !== undefined) return exact?.id === version && exact.kind === kind ? exact : null;
  return hasCompleteLegalSet(current)
    ? (current.documents.find((document) => document.kind === kind) ?? null)
    : null;
};

// Legal reading, recovery and account rights must remain reachable without a modal gate.
export const canPromptLegalOnPath = (pathname: string) =>
  ![
    "/auth",
    "/termos-de-servico",
    "/politica-de-privacidade",
    "/app/configuracoes",
    "/app/settings",
    "/app/account",
    "/app/conta",
  ].some((path) => pathname === path || pathname.startsWith(`${path}/`));
