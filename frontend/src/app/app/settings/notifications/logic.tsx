"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useNotificationPreferences } from "@/api/callers/notification";
import { BrowserPushNotice } from "@/components/notifications/browser-push-notice";
import { useAppSelector } from "@/hooks/redux";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { NotificationPreferencesForm } from "./preferences-form";

export const NotificationSettingsLogic = () => {
  const sessionRole = useAppSelector((state) => state.user?.role);
  const { query, update } = useNotificationPreferences();
  return (
    <PrivateTemplate>
      <section className="mx-auto w-full max-w-[430px] py-5 md:max-w-2xl md:px-5 md:py-8">
        <header className="mb-6 flex items-start gap-3">
          <Button
            asChild
            className="h-10 w-10 shrink-0 rounded-full p-0"
            type="button"
            variant="ghost"
          >
            <Link aria-label="Voltar para notificações" href="/app/notificacoes">
              <ArrowLeft className="h-5 w-5" aria-hidden={true} />
            </Link>
          </Button>
          <div className="min-w-0 pt-1">
            <h1 className="text-xl font-extrabold tracking-tight text-foreground md:text-2xl">
              Configurações de Notificações
            </h1>
            <p className="mt-1 text-sm leading-5 text-muted">
              Personalize como deseja ser alertado sobre as novidades da Lectum
            </p>
          </div>
        </header>

        <BrowserPushNotice settings />

        <NotificationPreferencesForm query={query} update={update} sessionRole={sessionRole} />
      </section>
    </PrivateTemplate>
  );
};
