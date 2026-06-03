"use client";

import { Bell, LogOut } from "lucide-react";
import type { PropsWithChildren } from "react";

import { Logo } from "@/components/ui/logo";
import { PageShell } from "@/components/ui/page-shell";
import { ThemeSwitch } from "@/components/ui/theme-switch";
import { useSignOut } from "@/hooks/cookies/signout";
import { NotificationManager } from "@/hooks/notification";
import { Button } from "@/registry/new-york-v4/ui/button";

export const PrivateTemplate = ({ children }: PropsWithChildren) => {
  const { out } = useSignOut();

  return (
    <>
      <NotificationManager />
      <PageShell
        header={
          <header className="border-b border-border bg-surface">
            <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5">
              <div className="flex items-center gap-3">
                <div>
                  <Logo />
                  <p className="mt-0.5 text-xs text-muted">Dashboard</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ThemeSwitch />
                <a
                  aria-label="Notificações"
                  className="grid h-9 w-9 place-items-center rounded-full text-muted transition hover:bg-primary-soft hover:text-primary"
                  href="/app/notifications"
                >
                  <Bell className="h-5 w-5" aria-hidden="true" />
                </a>
                <Button onClick={() => out("/auth/login")} type="button" variant="ghost">
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Sair
                </Button>
              </div>
            </div>
          </header>
        }
      >
        {children}
      </PageShell>
    </>
  );
};
