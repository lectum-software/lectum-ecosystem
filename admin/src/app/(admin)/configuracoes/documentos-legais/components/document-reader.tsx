export const LegalDocumentReader = ({ title, body }: { title: string; body: string }) => (
  <article
    aria-label={`Leitura de ${title}`}
    className="min-w-0 rounded-2xl border border-border bg-surface-muted/40 p-4 md:p-6"
  >
    <p className="mb-4 text-xs font-semibold text-muted">
      Leitura segura em texto. A marcação Markdown é exibida literalmente.
    </p>
    <div className="whitespace-pre-wrap break-words text-sm leading-7 text-foreground [overflow-wrap:anywhere]">
      {body}
    </div>
  </article>
);
