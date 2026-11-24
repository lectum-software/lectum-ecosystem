import Link from "next/link";
import { absoluteUrl } from "@/lib/seo";
import { getPublicCommunityPostSeo } from "@/lib/seo-metadata";
import { getPublicApiSource } from "@/utils/public-asset-sources";

export async function PublicTranscript(props: { id: string; slug: string; replyId?: string }) {
  const data = await getPublicCommunityPostSeo(props);
  const caption = data?.captions;
  const api = getPublicApiSource()?.origin;
  const transcripts =
    data?.transcripts?.flatMap((item) => {
      if (
        !api ||
        !item.text.trim() ||
        !item.thumbnail_path ||
        !item.content_path ||
        !item.published_at ||
        !Number.isFinite(Date.parse(item.published_at))
      )
        return [];
      return [
        {
          "@type": "VideoObject",
          "@id": `${absoluteUrl(item.url)}#video-${encodeURIComponent(item.video_id)}`,
          url: absoluteUrl(item.url),
          name: item.title,
          description: item.description?.trim() || item.title,
          uploadDate: item.published_at,
          thumbnailUrl: [new URL(item.thumbnail_path, api).toString()],
          contentUrl: new URL(item.content_path, api).toString(),
          transcript: item.text,
          inLanguage: item.language,
        },
      ];
    }) ?? [];
  const structured = transcripts.length
    ? {
        "@context": "https://schema.org",
        "@graph": transcripts,
      }
    : null;
  if (!caption?.cues.length && !structured) return null;
  return (
    <>
      {structured ? (
        <script type="application/ld+json">
          {JSON.stringify(structured).replace(/</g, "\\u003c")}
        </script>
      ) : null}
      {caption?.cues.length ? (
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
            <p className="mt-3 whitespace-pre-line">
              {caption.cues.map((cue) => cue.text).join(" ")}
            </p>
          </details>
        </section>
      ) : null}
    </>
  );
}
