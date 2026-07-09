type PlaceholderPageProps = {
  title: string;
  description: string;
  task: string;
};

export const PlaceholderPage = ({ description, task, title }: PlaceholderPageProps) => {
  return (
    <div className="space-y-5">
      <section className="rounded-card border border-border bg-surface p-5 shadow-admin-soft sm:p-7">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-primary">{task}</p>
        <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-foreground sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted sm:text-base">{description}</p>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-card border border-border bg-surface p-5 shadow-admin-soft">
          <h2 className="text-lg font-black text-foreground">Sem dados fake</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Esta etapa entrega navegação, autenticação e shell. Métricas reais serão conectadas nas
            tasks específicas.
          </p>
        </div>
        <div className="rounded-card border border-border bg-surface p-5 shadow-admin-soft">
          <h2 className="text-lg font-black text-foreground">Backend real</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            A sessão é hidratada com os endpoints administrativos reais criados na TASK-45.
          </p>
        </div>
        <div className="rounded-card border border-border bg-surface p-5 shadow-admin-soft">
          <h2 className="text-lg font-black text-foreground">Próximo passo</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            A tela visual completa deve ser implementada na task de produto correspondente a esta
            seção.
          </p>
        </div>
      </section>
    </div>
  );
};
