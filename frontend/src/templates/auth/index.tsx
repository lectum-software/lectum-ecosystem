import { BookOpen } from "lucide-react";
import type { PropsWithChildren } from "react";

export const AuthTemplate = ({ children }: PropsWithChildren) => {
  return (
    <main className="min-h-screen bg-[#f6f2ec] text-zinc-950">
      <div className="grid min-h-screen lg:grid-cols-[1fr_460px]">
        <section className="hidden min-h-screen bg-zinc-950 text-white lg:block">
          <div className="flex h-full flex-col justify-between px-14 py-12">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-400 text-zinc-950">
                <BookOpen className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="text-lg font-semibold">Lectum</span>
            </div>

            <div className="max-w-xl">
              <p className="text-sm font-medium uppercase text-emerald-300">Area segura</p>
              <h1 className="mt-4 text-5xl font-semibold leading-tight">
                Acesse seu ambiente de trabalho.
              </h1>
              <p className="mt-5 max-w-md text-base leading-7 text-zinc-300">
                Entre com suas credenciais ou utilize sua conta Google para continuar.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-sm text-zinc-300">
              <div className="rounded-md border border-white/10 bg-white/5 p-4">
                <span className="block text-2xl font-semibold text-white">01</span>
                Login
              </div>
              <div className="rounded-md border border-white/10 bg-white/5 p-4">
                <span className="block text-2xl font-semibold text-white">02</span>
                Sessao
              </div>
              <div className="rounded-md border border-white/10 bg-white/5 p-4">
                <span className="block text-2xl font-semibold text-white">03</span>
                Dashboard
              </div>
            </div>
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center px-5 py-8">
          {children}
        </section>
      </div>
    </main>
  );
};
