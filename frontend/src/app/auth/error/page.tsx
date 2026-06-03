import { AlertTriangle } from "lucide-react";
import Link from "next/link";

import { Button } from "@/registry/new-york-v4/ui/button";
import { CenterTemplate } from "@/templates/center";

type PageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;
  const error = params.error || "Não foi possível concluir o login.";

  return (
    <CenterTemplate>
      <div className="grid w-full justify-items-center gap-5 rounded-[var(--lectum-card-radius)] border border-border bg-surface p-8 text-center shadow-[var(--lectum-shadow-soft)]">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-danger/10 text-danger">
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        </span>
        <div className="grid gap-1.5">
          <h1 className="text-xl font-bold text-foreground">Erro no login</h1>
          <p className="text-sm leading-6 text-muted">{error}</p>
        </div>
        <Button asChild className="w-full">
          <Link href="/auth/login">Voltar para o login</Link>
        </Button>
      </div>
    </CenterTemplate>
  );
}
