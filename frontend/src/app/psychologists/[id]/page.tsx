import type { Metadata } from "next";
import { PsychologistProfileLogic } from "@/app/app/psychologist/[id]/logic";
import { SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: `Perfil de psicólogo | ${SITE_NAME}`,
  description:
    "Perfil público de psicólogo na Lectum, com informações profissionais e participação em comunidades.",
};

export default function PsychologistProfilePage() {
  return <PsychologistProfileLogic />;
}
