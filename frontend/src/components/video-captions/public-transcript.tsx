import Link from "next/link";
import { getPublicCommunityPostSeo } from "@/lib/seo-metadata";

export async function PublicTranscript(props: { id: string; slug: string; replyId?: string }) {
  const data = await getPublicCommunityPostSeo(props);
  const caption = data?.captions;
  if (!caption?.cues.length) return null;
  return (
    <section className="mx-auto max-w-3xl px-4 py-6" aria-label="Transcrição do vídeo">
      <details>
        <summary className="cursor-pointer text-primary">Ver transcrição</summary>
        <p className="mt-3 text-sm text-muted-foreground">
          {caption.reviewed
            ? "Transcrição revisada pelo psicólogo."
            : "Transcrição automática, não revisada."}
        </p>
        {caption.professional ? (
          <p className="mt-2 text-sm">
            <Link href={caption.professional.profile_url}>{caption.professional.name}</Link>
            {caption.professional.crp ? ` · CRP ${caption.professional.crp}` : ""}
          </p>
        ) : null}
        <p className="mt-3 whitespace-pre-line">{caption.cues.map((cue) => cue.text).join(" ")}</p>
      </details>
    </section>
  );
}
