"use client";

import { BookOpen, LogOut } from "lucide-react";
import type { PropsWithChildren } from "react";

import { useSignOut } from "@/hooks/cookies/signout";
import { Button } from "@/registry/new-york-v4/ui/button";

export const PrivateTemplate = ({ children }: PropsWithChildren) => {
  const { out } = useSignOut();

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-zinc-950 text-white">
              <BookOpen className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold">Lectum</p>
              <p className="text-xs text-zinc-500">Dashboard</p>
            </div>
          </div>
          <Button onClick={() => out("/auth/login")} type="button" variant="ghost">
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sair
          </Button>
        </div>
      </header>
      {children}
    </main>
  );
};
