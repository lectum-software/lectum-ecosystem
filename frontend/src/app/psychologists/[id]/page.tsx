import type { Metadata } from "next";
import { PsychologistProfileLogic } from "@/app/app/psychologist/[id]/logic";
import { SITE_NAME } from "@/lib/seo";
import { resolvePsychologistSeoMetadata } from "@/lib/seo-metadata";

type PsychologistProfilePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export const generateMetadata = async ({
  params,
}: PsychologistProfilePageProps): Promise<Metadata> => {
  const { id } = await params;

  return resolvePsychologistSeoMetadata({
    fallback: {
      canonical: `/psychologists/${id}`,
      description:
        "Perfil público de psicólogo na Lectum, com informações profissionais e participação em comunidades.",
      title: `Perfil de psicólogo | ${SITE_NAME}`,
    },
    id,
  });
};

export default function PsychologistProfilePage() {
  return <PsychologistProfileLogic />;
}
