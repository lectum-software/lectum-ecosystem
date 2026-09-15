import Link from "next/link";
import type { FullPublishedDoc } from "@/api/req/legal/types";
import { cn } from "@/lib/utils";
import { LEGAL_PATHS, LEGAL_TITLES, legalDocumentHref } from "./policy";

export const LegalLinks = ({
  className,
  documents = [],
  newTab = false,
}: {
  className?: string;
  documents?: FullPublishedDoc[];
  newTab?: boolean;
}) => (
  <nav
    aria-label="Termos e privacidade"
    className={cn("flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs", className)}
  >
    {(["terms", "privacy"] as const).map((kind) => {
      const document = documents.find((entry) => entry.kind === kind);
      return (
        <Link
          className="rounded text-primary underline underline-offset-4 hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          href={document ? legalDocumentHref(document) : LEGAL_PATHS[kind]}
          key={kind}
          prefetch={false}
          rel={newTab ? "noopener noreferrer" : undefined}
          target={newTab ? "_blank" : undefined}
        >
          {LEGAL_TITLES[kind]}
          {document ? ` — versão ${document.version}` : ""}
          {newTab ? <span className="sr-only"> (abre em nova aba)</span> : null}
        </Link>
      );
    })}
  </nav>
);
