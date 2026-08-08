import { LogIn, RefreshCw, ShieldCheck, UserPlus } from "lucide-react";
import { Button } from "@/registry/new-york-v4/ui/button";

type RestrictedAreaStateProps = {
  copy: {
    description: string;
    title: string;
  };
  onLogin: () => void;
  onRetry?: () => void;
  onSignup: () => void;
  sessionUnavailable?: boolean;
};

export const RestrictedAreaState = ({
  copy,
  onLogin,
  onRetry,
  onSignup,
  sessionUnavailable = false,
}: RestrictedAreaStateProps) => (
  <section className="w-full max-w-[460px] px-1 text-center">
    <div className="relative overflow-hidden rounded-[2rem] border border-border bg-surface px-6 py-8 shadow-lectum-soft ring-1 ring-media-foreground/80 sm:px-8 sm:py-10">
      <div
        aria-hidden="true"
        className="-top-24 -right-20 absolute h-48 w-48 rounded-full bg-primary/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="-bottom-24 -left-20 absolute h-48 w-48 rounded-full bg-surface-muted/20 blur-3xl"
      />

      <div className="relative z-10 grid justify-items-center">
        <div className="relative mb-5 grid h-20 w-20 place-items-center rounded-[1.65rem] bg-gradient-to-br from-primary-soft via-surface to-surface-muted text-primary shadow-lectum-soft ring-1 ring-border">
          <span
            aria-hidden="true"
            className="absolute inset-2 rounded-[1.3rem] border border-media-foreground/80"
          />
          <ShieldCheck className="h-9 w-9" aria-hidden="true" />
        </div>

        <p className="mb-3 rounded-full border border-border bg-surface-muted px-3 py-1 text-[11px] font-extrabold tracking-[0.16em] text-primary uppercase">
          {sessionUnavailable ? "Sessão indisponível" : "Área restrita"}
        </p>

        <h1 className="text-2xl font-extrabold tracking-[-0.04em] text-foreground sm:text-3xl">
          {copy.title}
        </h1>
        <p className="mt-3 max-w-[360px] text-balance text-sm leading-6 text-muted sm:text-base">
          {copy.description}
        </p>

        <div className="mt-7 grid w-full gap-3 sm:grid-cols-2">
          <Button
            className="h-12 rounded-2xl text-sm font-extrabold shadow-lectum-soft"
            onClick={sessionUnavailable ? onRetry : onSignup}
            type="button"
          >
            {sessionUnavailable ? (
              <RefreshCw className="h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <UserPlus className="h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            <span>{sessionUnavailable ? "Tentar novamente" : "Criar conta"}</span>
          </Button>
          <Button
            className="h-12 rounded-2xl border-border bg-surface text-sm font-extrabold text-primary shadow-none hover:border-primary/40 hover:bg-primary-soft/50"
            onClick={onLogin}
            type="button"
            variant="outline"
          >
            <LogIn className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{sessionUnavailable ? "Entrar novamente" : "Fazer login"}</span>
          </Button>
        </div>
      </div>
    </div>
  </section>
);
