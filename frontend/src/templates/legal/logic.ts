import type { Metadata } from "next";
import { readCurrentLegal, readPublishedLegalDocument } from "@/api/req/legal/server";
import type { LegalKind } from "@/api/req/legal/types";
import {
  hasCompleteLegalSet,
  LEGAL_PATHS,
  LEGAL_TITLES,
  legalDocumentHref,
  selectLegalDocument,
} from "@/components/legal/policy";

export type LegalPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export const getLegalPage = async (
  kind: LegalKind,
  searchParams: LegalPageProps["searchParams"],
) => {
  const { version } = await searchParams;
  const versionRequested = version !== undefined;
  // Repeated/empty/invalid IDs never silently fall back to the current version.
  const id = typeof version === "string" ? version : versionRequested ? "" : undefined;
  const [current, exact] = await Promise.all([
    readCurrentLegal(),
    id ? readPublishedLegalDocument(id) : Promise.resolve(null),
  ]);
  return {
    document: selectLegalDocument(kind, current, id, exact),
    configured: hasCompleteLegalSet(current),
    kind,
    versionRequested,
  };
};

export const getLegalMetadata = async (
  kind: LegalKind,
  searchParams: LegalPageProps["searchParams"],
): Promise<Metadata> => {
  const { configured, document, versionRequested } = await getLegalPage(kind, searchParams);
  const index = Boolean(configured && document && !versionRequested);
  const canonical = document && versionRequested ? legalDocumentHref(document) : LEGAL_PATHS[kind];
  return {
    title: document?.title ?? LEGAL_TITLES[kind],
    description: `Leitura de ${LEGAL_TITLES[kind]} da Lectum.`,
    alternates: { canonical, languages: { "pt-BR": canonical } },
    robots: { index, follow: true, googleBot: { index, follow: true } },
    openGraph: { title: document?.title ?? LEGAL_TITLES[kind], url: canonical },
  };
};
