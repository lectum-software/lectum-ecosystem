import type { PropsWithChildren } from "react";

export const AuthTemplate = ({ children }: PropsWithChildren) => {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[390px] flex-col justify-center px-4 py-6 sm:max-w-[var(--lectum-container)]">
        <section className="flex flex-1 items-center justify-center">{children}</section>
        <footer className="pt-6 text-center text-xs text-subtle">
          © 2026 Lectum. Todos os direitos reservados.
        </footer>
      </div>
    </main>
  );
};
