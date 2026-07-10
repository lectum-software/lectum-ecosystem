import Link from "next/link";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;

  return (
    <section className="rounded-card border border-border bg-surface p-6 shadow-admin-soft">
      <p className="text-xs font-black uppercase tracking-[0.28em] text-primary">TASK-55</p>
      <h1 className="mt-2 text-2xl font-black text-foreground">Detalhe do psicólogo</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        A rota administrativa do detalhe foi reservada para o psicólogo {id}. O conteúdo completo
        será implementado na TASK-55 usando dados reais; esta página evita uma navegação quebrada a
        partir da lista da TASK-54.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          className="inline-flex h-11 items-center rounded-control bg-primary px-4 text-sm font-black text-white"
          href="/psicologos/lista"
        >
          Voltar para a lista
        </Link>
        <Link
          className="inline-flex h-11 items-center rounded-control border border-border bg-surface px-4 text-sm font-black text-foreground"
          href="/psicologos"
        >
          Ir para o dashboard
        </Link>
      </div>
    </section>
  );
}
