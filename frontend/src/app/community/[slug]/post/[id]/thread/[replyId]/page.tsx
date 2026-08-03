import type { Metadata } from "next";
import { PostReplyThreadLogic } from "@/app/app/community/[slug]/post/[id]/logic";
import { SITE_NAME } from "@/lib/seo";
import { resolveSeoMetadata } from "@/lib/seo-metadata";

export const generateMetadata = async (): Promise<Metadata> =>
  resolveSeoMetadata("community_post", {
    description: "Discussão pública de uma resposta em comunidade na Lectum.",
    title: `Discussão da comunidade | ${SITE_NAME}`,
  });

export default function PostReplyThreadPage() {
  return <PostReplyThreadLogic />;
}
