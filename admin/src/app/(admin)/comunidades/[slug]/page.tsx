import Link from "next/link";

export default async function CommunityDetailPlaceholder({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="space-y-5">
      <Link className="text-sm font-black text-primary" href="/comunidades">
        ← Voltar para Comunidades
      </Link>
      <section className="rounded-card border border-border bg-surface p-5 shadow-admin-soft sm:p-7">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-primary">TASK-52</p>
        <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-foreground sm:text-4xl">
          Detalhe da comunidade
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted sm:text-base">
          A navegação para a comunidade real <strong>{slug}</strong> já está disponível no Admin. A
          edição de nome, avatar, descrição, cor e regras será implementada na TASK-52.
        </p>
      </section>
    </div>
  );
}
