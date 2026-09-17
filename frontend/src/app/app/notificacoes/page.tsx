import { NotificationsLogic } from "@/app/app/notifications/logic";
import { resolvePrivateSeoMetadata } from "@/lib/seo-metadata";

export const generateMetadata = () =>
  resolvePrivateSeoMetadata("app_notifications", {
    canonical: "/app/notificacoes",
    description:
      "Página privada de notificações da Lectum, com atualizações da conta e das comunidades.",
    title: "Notificacoes | Lectum",
  });

export default function NotificationsPage() {
  return <NotificationsLogic />;
}
