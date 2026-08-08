type ErrorSplashProps = {
  onRetry: () => void;
};

export const ErrorSplash = ({ onRetry }: ErrorSplashProps) => {
  return (
    <main className="grid min-h-dvh place-items-center bg-background p-6">
      <section
        aria-labelledby="admin-error-title"
        className="w-full max-w-md rounded-card border border-border bg-surface p-8 text-center shadow-admin-soft"
        role="alert"
      >
        <h1 className="text-xl font-black text-foreground" id="admin-error-title">
          Não foi possível carregar o painel
        </h1>
        <p className="mt-2 text-sm font-medium text-muted">
          Tente novamente. Se o problema continuar, aguarde alguns instantes.
        </p>
        <button
          className="mt-5 min-h-11 rounded-control bg-primary px-5 py-2.5 text-sm font-black text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          onClick={onRetry}
          type="button"
        >
          Tentar novamente
        </button>
      </section>
    </main>
  );
};
