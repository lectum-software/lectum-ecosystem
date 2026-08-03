import type { Metadata } from "next";
import { PsychologistProfileLogic } from "@/app/app/psychologist/[id]/logic";
import { SITE_NAME } from "@/lib/seo";
import { resolveSeoMetadata } from "@/lib/seo-metadata";

export const generateMetadata = async (): Promise<Metadata> =>
  resolveSeoMetadata("psychologist_profile", {
    description:
      "Perfil público de psicólogo na Lectum, com informações profissionais e participação em comunidades.",
    title: `Perfil de psicólogo | ${SITE_NAME}`,
  });

export default function PsychologistProfilePage() {
  return <PsychologistProfileLogic />;
}
