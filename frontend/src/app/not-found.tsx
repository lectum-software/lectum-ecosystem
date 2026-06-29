"use client";

import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/registry/new-york-v4/ui/button";
import { CenterTemplate } from "@/templates/center";

export default function NotFound() {
  return (
    <CenterTemplate>
      <div className="grid w-full justify-items-center gap-6 rounded-[var(--lectum-card-radius)] border border-border bg-surface p-8 text-center shadow-[var(--lectum-shadow-soft)]">
        <Logo className="w-[202px]" />
        <p className="text-6xl font-bold leading-none text-primary">404</p>
        <div className="grid gap-1.5">
          <h1 className="text-xl font-bold text-foreground">Página não encontrada</h1>
          <p className="text-sm leading-6 text-muted">
            A página que você procura não existe ou foi movida.
          </p>
        </div>
        <Button asChild className="w-full">
          <Link href="/">Voltar ao início</Link>
        </Button>
      </div>
    </CenterTemplate>
  );
}
