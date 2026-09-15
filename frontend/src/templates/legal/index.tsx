import Link from "next/link";
import type { FullPublishedDoc, LegalKind } from "@/api/req/legal/types";
import { LegalDocumentBody } from "@/components/legal/document-body";
import { LegalLinks } from "@/components/legal/links";
import { LEGAL_PATHS, LEGAL_TITLES, legalDocumentHref } from "@/components/legal/policy";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Logo } from "@/components/ui/logo";
import { PublicTemplate } from "@/templates/public";

export const LegalTemplate = ({
  document,
  kind,
  versionRequested,
}: {
  document: FullPublishedDoc | null;
  kind: LegalKind;
  versionRequested: boolean;
}) => (
  <PublicTemplate>
    <main className="mx-auto min-h-dvh w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Link aria-label="Página inicial da Lectum" href="/">
          <Logo className="w-[132px]" />
        </Link>
        <Link
          className="text-sm font-semibold text-primary underline underline-offset-4"
          href="/auth/login"
        >
          Entrar na Lectum
        </Link>
      </header>
      <article className="min-w-0 rounded-[var(--lectum-card-radius)] border border-border bg-surface p-5 shadow-lectum-soft sm:p-8">
        <h1 className="break-words text-2xl font-extrabold leading-tight sm:text-3xl">
          {document?.title ?? LEGAL_TITLES[kind]}
        </h1>
        {document ? (
          <>
            <p className="mt-3 text-sm text-muted">
              {LEGAL_TITLES[kind]} · Versão {document.version} · Publicada em{" "}
              <time dateTime={document.published_at}>
                {new Intl.DateTimeFormat("pt-BR", {
                  dateStyle: "long",
                  timeZone: "America/Sao_Paulo",
                }).format(new Date(document.published_at))}
              </time>
            </p>
            <p className="mt-3 text-xs leading-5 text-muted">
              {versionRequested
                ? "Você está lendo a versão identificada neste link, que pode não ser a atual."
                : "Documento publicado. A leitura desta página não registra aceite."}
            </p>
            <Link
              className="mt-3 inline-block text-xs text-primary underline underline-offset-4"
              href={versionRequested ? LEGAL_PATHS[kind] : legalDocumentHref(document)}
              prefetch={false}
            >
              {versionRequested ? "Consultar versão atual" : "Link permanente desta versão"}
            </Link>
            {document.change_summary.trim() ? (
              <section
                aria-label="Resumo das alterações"
                className="my-6 rounded-[var(--lectum-control-radius)] border border-border bg-surface-muted p-4"
              >
                <h2 className="mb-2 text-sm font-bold">Resumo das alterações</h2>
                <p className="whitespace-pre-wrap break-words text-sm leading-6 text-muted [overflow-wrap:anywhere]">
                  {document.change_summary}
                </p>
              </section>
            ) : null}
            <div className="mt-6">
              <LegalDocumentBody body={document.body} />
            </div>
          </>
        ) : (
          <InlineAlert className="mt-6" title="Documento indisponível" variant="info">
            {versionRequested
              ? "Não foi possível disponibilizar esta versão. Nenhum outro documento foi exibido em seu lugar."
              : "O documento publicado não está disponível para leitura neste momento. Tente novamente mais tarde."}
          </InlineAlert>
        )}
      </article>
      <LegalLinks className="mt-6" />
    </main>
  </PublicTemplate>
);
