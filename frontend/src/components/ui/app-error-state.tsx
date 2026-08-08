type AppErrorStateProps = {
  onRetry: () => void;
};

export function AppErrorState({ onRetry }: AppErrorStateProps) {
  return (
    <main className="grid min-h-dvh place-items-center bg-background p-6">
      <section
        aria-labelledby="app-error-title"
        className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 text-center shadow-sm"
        role="alert"
      >
        <h1 className="text-xl font-bold text-foreground" id="app-error-title">
          Não foi possível carregar esta página
        </h1>
        <p className="mt-2 text-sm text-muted">
          Tente novamente. Se o problema continuar, volte em alguns instantes.
        </p>
        <button
          className="mt-5 min-h-11 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          onClick={onRetry}
          type="button"
        >
          Tentar novamente
        </button>
      </section>
    </main>
  );
}
