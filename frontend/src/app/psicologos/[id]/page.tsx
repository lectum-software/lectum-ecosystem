import type { Metadata } from "next";
import { PsychologistProfileLogic } from "@/app/app/psychologist/[id]/logic";
import { SITE_NAME } from "@/lib/seo";
import { getPublicPsychologistSeo, resolvePsychologistSeoMetadata } from "@/lib/seo-metadata";
import { publicPsychologistHref } from "@/utils/public-routes";

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
      canonical: publicPsychologistHref(id),
      description:
        "Perfil público de psicólogo na Lectum, com informações profissionais e participação em comunidades.",
      title: `Perfil de psicólogo | ${SITE_NAME}`,
    },
    id,
  });
};

export default async function PsychologistProfilePage({ params }: PsychologistProfilePageProps) {
  const { id } = await params;
  const seo = await getPublicPsychologistSeo({ id });
  return (
    <>
      <PsychologistProfileLogic />
      {seo?.captions?.cues.length ? (
        <section className="sr-only" aria-label="Transcrição do vídeo de apresentação">
          <h2>Transcrição do vídeo de apresentação</h2>
          <p>{seo.captions.cues.map((cue) => cue.text).join(" ")}</p>
        </section>
      ) : null}
    </>
  );
}
