import { ProfileLogic } from "@/app/app/profile/logic";
import { resolvePrivateSeoMetadata } from "@/lib/seo-metadata";

export const generateMetadata = () =>
  resolvePrivateSeoMetadata("app_profile", {
    canonical: "/app/perfil",
    description:
      "Página privada de perfil do usuário na Lectum, com dados pessoais e atalhos de conta.",
    title: "Perfil | Lectum",
  });

export default function ProfilePage() {
  return <ProfileLogic />;
}
