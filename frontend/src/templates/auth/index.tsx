import type { PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

type AuthTemplateProps = PropsWithChildren<{
  contentClassName?: string;
}>;

export const AuthTemplate = ({ children, contentClassName }: AuthTemplateProps) => {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col px-4 py-4 sm:max-w-[var(--lectum-container)] sm:py-5">
        <section className={cn("flex flex-1 items-center justify-center py-2", contentClassName)}>
          {children}
        </section>
        <footer className="pb-1 pt-3 text-center text-[11px] leading-5 text-subtle sm:text-xs">
          © 2026 Lectum. Todos os direitos reservados.
        </footer>
      </div>
    </main>
  );
};
