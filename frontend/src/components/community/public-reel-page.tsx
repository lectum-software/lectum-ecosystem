import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { captionVtt } from "@/components/video-captions/types";
import {
  getPublicReel,
  type ReelQuery,
  reelPlaybackUrl,
  reelSeoContent,
  reelVideoObject,
} from "@/lib/reel-seo";
import { PublicReelPlayer } from "./public-reel-player";

export async function PublicReelPage({
  slug,
  id,
  query,
}: {
  slug: string;
  id: string;
  query: ReelQuery;
}) {
  const data = await getPublicReel(slug, id, query);
  if (!data) notFound();
  if (query.reelPost !== id || (query.reelReply ?? null) !== data.reply_id)
    redirect(data.canonical_path);
  const { title, thumbnail } = reelSeoContent(data);
  const schema = reelVideoObject(data);
  return (
    <article
      data-public-reel-page
      data-post-href={data.post_path}
      className="fixed inset-0 z-[1098] flex h-dvh items-center justify-center bg-media-background"
    >
      {schema ? (
        <script type="application/ld+json">
          {JSON.stringify(schema).replace(/</g, "\\u003c")}
        </script>
      ) : null}
      <div className="h-full w-full" data-reel-server-player>
        <PublicReelPlayer
          src={reelPlaybackUrl(data.hls_url)}
          poster={thumbnail}
          title={title}
          captions={
            data.captions
              ? `data:text/vtt;charset=utf-8,${encodeURIComponent(captionVtt(data.captions.cues))}`
              : undefined
          }
        />
      </div>
      <span role="status" className="absolute bottom-8 text-media-foreground">
        Abrindo Reels...
      </span>
      <Link
        href={data.post_path}
        aria-label="Voltar à publicação"
        title="Voltar à publicação"
        className="absolute left-4 top-[calc(env(safe-area-inset-top,0px)+16px)] flex size-11 items-center justify-center rounded-full bg-media-background/50 text-media-foreground"
      >
        <ArrowLeft aria-hidden="true" size={24} />
      </Link>
    </article>
  );
}
