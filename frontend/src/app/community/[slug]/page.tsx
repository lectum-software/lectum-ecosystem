import type { Metadata } from "next";
import { CommunityRouteLogic } from "@/app/app/community/[slug]/logic";
import { SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: `Comunidade | ${SITE_NAME}`,
  description: "Comunidade pública da Lectum com perguntas, relatos e respostas de psicólogos.",
};

export default function CommunityRoutePage() {
  return <CommunityRouteLogic />;
}
