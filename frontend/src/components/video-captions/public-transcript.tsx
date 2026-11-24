import { absoluteUrl } from "@/lib/seo";
import { getPublicCommunityPostSeo } from "@/lib/seo-metadata";
import { getPublicApiSource } from "@/utils/public-asset-sources";

export async function PublicTranscript(props: { id: string; slug: string; replyId?: string }) {
  const data = await getPublicCommunityPostSeo(props);
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
  if (!structured) return null;
  return (
    <script type="application/ld+json">
      {JSON.stringify(structured).replace(/</g, "\\u003c")}
    </script>
  );
}
