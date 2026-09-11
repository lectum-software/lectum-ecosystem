"use client";

import { ArrowLeft, BellOff, BellRing, Info, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useNotificationPreferences } from "@/api/callers/notification";
import { useNotificationPushPermission } from "@/hooks/notification";
import { useAppSelector } from "@/hooks/redux";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { NotificationPreferencesForm } from "./preferences-form";

const BrowserNotificationPermissionCard = () => {
  const {
    canRequestPermission,
    hasVapidKey,
    isChecking,
    isConfirmedUser,
    isRequestingPermission,
    isSupported,
    permission,
    requestPermissionAndSubscribe,
  } = useNotificationPushPermission();
  if (!isConfirmedUser) return null;

  const sharedClassName =
    "mb-6 rounded-3xl border border-border bg-surface p-4 text-sm shadow-sm md:p-5";

  if (isChecking && permission === "loading") {
    return (
      <section className={sharedClassName} aria-label="Status das notificações no navegador">
        <div className="flex gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
            <Info className="h-5 w-5" aria-hidden={true} />
          </span>
          <div className="min-w-0">
            <h2 className="font-extrabold text-foreground">Verificando notificações</h2>
            <p className="mt-1 leading-5 text-muted">
              Estamos conferindo se este navegador pode receber notificações da Lectum.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (!isSupported) {
    return (
      <section className={sharedClassName} aria-label="Notificações do navegador indisponíveis">
        <div className="flex gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-surface-muted text-muted">
            <BellOff className="h-5 w-5" aria-hidden={true} />
          </span>
          <div className="min-w-0">
            <h2 className="font-extrabold text-foreground">
              Notificações do navegador indisponíveis
            </h2>
            <p className="mt-1 leading-5 text-muted">
              Este navegador não oferece suporte completo a push. Suas notificações in-app continuam
              disponíveis na central da Lectum.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (!hasVapidKey && !isChecking) {
    return (
      <section className={sharedClassName} aria-label="Push ainda não configurado">
        <div className="flex gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-surface-muted text-muted">
            <Info className="h-5 w-5" aria-hidden={true} />
          </span>
          <div className="min-w-0">
            <h2 className="font-extrabold text-foreground">
              Push ainda não está disponível neste ambiente
            </h2>
            <p className="mt-1 leading-5 text-muted">
              As notificações no navegador ainda não estão disponíveis. Enquanto isso, a central de
              notificações continua funcionando normalmente.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (permission === "denied") {
    return (
      <section className={sharedClassName} aria-label="Notificações bloqueadas no navegador">
        <div className="flex gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-danger/10 text-danger">
            <BellOff className="h-5 w-5" aria-hidden={true} />
          </span>
          <div className="min-w-0">
            <h2 className="font-extrabold text-foreground">Notificações bloqueadas</h2>
            <p className="mt-1 leading-5 text-muted">
              O navegador bloqueou notificações para a Lectum. Para receber push, reative a
              permissão nas configurações do navegador ou do sistema. Não vamos tentar pedir
              novamente por aqui.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (permission === "granted") {
    return (
      <section className={sharedClassName} aria-label="Notificações do navegador ativas">
        <div className="flex gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
            <ShieldCheck className="h-5 w-5" aria-hidden={true} />
          </span>
          <div className="min-w-0">
            <h2 className="font-extrabold text-foreground">Notificações do navegador ativas</h2>
            <p className="mt-1 leading-5 text-muted">
              A Lectum pode revalidar sua inscrição push de forma segura. Você ainda controla quais
              categorias deseja receber abaixo.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (canRequestPermission) {
    return (
      <section className={sharedClassName} aria-label="Ativar notificações da Lectum">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="flex gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
              <BellRing className="h-5 w-5" aria-hidden={true} />
            </span>
            <div className="min-w-0">
              <h2 className="font-extrabold text-foreground">Ative notificações da Lectum</h2>
              <p className="mt-1 leading-5 text-muted">
                Receba avisos importantes sobre respostas, interações e contatos.
              </p>
            </div>
          </div>

          <Button
            className="h-11 rounded-2xl text-sm font-extrabold"
            disabled={isRequestingPermission}
            onClick={() => {
              void requestPermissionAndSubscribe();
            }}
            type="button"
          >
            <BellRing className="h-4 w-4" aria-hidden={true} />
            <span>{isRequestingPermission ? "Ativando..." : "Ativar notificações"}</span>
          </Button>
        </div>
      </section>
    );
  }

  return null;
};

export const NotificationSettingsLogic = () => {
  const sessionRole = useAppSelector((state) => state.user?.role);
  const { query, update } = useNotificationPreferences();
  return (
    <PrivateTemplate>
      <section className="mx-auto w-full max-w-2xl px-5 py-5 md:py-8">
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

        <BrowserNotificationPermissionCard />

        <NotificationPreferencesForm query={query} update={update} sessionRole={sessionRole} />
      </section>
    </PrivateTemplate>
  );
};
