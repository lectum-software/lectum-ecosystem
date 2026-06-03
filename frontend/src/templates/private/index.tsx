"use client";

import { LogOut } from "lucide-react";
import type { PropsWithChildren } from "react";

import { Logo } from "@/components/ui/logo";
import { PageShell } from "@/components/ui/page-shell";
import { useSignOut } from "@/hooks/cookies/signout";
import { Button } from "@/registry/new-york-v4/ui/button";

export const PrivateTemplate = ({ children }: PropsWithChildren) => {
  const { out } = useSignOut();

  return (
    <PageShell
      header={
        <header className="border-b border-border bg-surface">
          <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5">
            <div className="flex items-center gap-3">
              <div>
                <Logo markClassName="h-5 w-3 before:h-1.5 before:w-5" textClassName="text-2xl" />
                <p className="mt-0.5 text-xs text-muted">Dashboard</p>
              </div>
            </div>
            <Button onClick={() => out("/auth/login")} type="button" variant="ghost">
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sair
            </Button>
          </div>
        </header>
      }
    >
      {children}
    </PageShell>
  );
};
