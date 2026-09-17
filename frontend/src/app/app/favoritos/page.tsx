import { FavoritesLogic } from "@/app/app/favorites/logic";
import { resolvePrivateSeoMetadata } from "@/lib/seo-metadata";

export const generateMetadata = () =>
  resolvePrivateSeoMetadata("app_favorites", {
    canonical: "/app/favoritos",
    description: "Página privada de favoritos da Lectum, reunindo psicólogos salvos pelo usuário.",
    title: "Favoritos | Lectum",
  });

export default function FavoritesPage() {
  return <FavoritesLogic />;
}
