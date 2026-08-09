import type { Metadata } from "next";
import { PsychologistContactLogic } from "@/app/app/psychologist/[id]/contact/logic";
import { SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: `Contato com psicólogo | ${SITE_NAME}`,
  description:
    "Canal público para iniciar contato responsável com psicólogos encontrados na Lectum.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function PsychologistContactPage() {
  return <PsychologistContactLogic />;
}
