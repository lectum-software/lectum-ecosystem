import { AlertTriangle } from "lucide-react";
import Link from "next/link";

import { getSafePublicErrorMessage } from "@/api/errors";
import { Button } from "@/registry/new-york-v4/ui/button";
import { CenterTemplate } from "@/templates/center";
import { normalizeSafeInternalRedirect } from "@/utils/safe-redirect";
import { AuthErrorSessionReset } from "./session-reset";

type PageProps = {
  searchParams: Promise<{
    callbackUrl?: string;
    clearSession?: string;
    error?: string;
    redirectTo?: string;
  }>;
};

const buildSignupHref = (redirectTo?: string, callbackUrl?: string) => {
  const params = new URLSearchParams();
  const returnTo = normalizeSafeInternalRedirect(redirectTo || callbackUrl);

  if (returnTo) {
    params.set("redirectTo", returnTo);
  }

  const queryString = params.toString();
  return queryString ? `/auth/profile-selection?${queryString}` : "/auth/profile-selection";
};

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;
  const error = getSafePublicErrorMessage(
    params.error,
    "Não foi possível concluir o login. Tente novamente.",
  );
  const shouldResetSession = params.clearSession === "1";
  const signupHref = buildSignupHref(params.redirectTo, params.callbackUrl);

  return (
    <CenterTemplate>
      <AuthErrorSessionReset enabled={shouldResetSession} />
      <div className="grid w-full justify-items-center gap-4 rounded-[var(--lectum-card-radius)] border border-border bg-surface p-7 text-center shadow-[var(--lectum-shadow-soft)]">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-danger/10 text-danger">
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        </span>
        <div className="grid gap-1.5">
          <h1 className="text-xl font-bold text-foreground">Erro no login</h1>
          <p className="text-sm leading-6 text-muted">{error}</p>
        </div>
        <div className="grid w-full gap-2">
          <Button asChild className="w-full">
            <Link href={signupHref}>Criar conta</Link>
          </Button>
          <Button asChild className="w-full" variant="outline">
            <Link href="/auth/login">Voltar para o login</Link>
          </Button>
        </div>
      </div>
    </CenterTemplate>
  );
}
