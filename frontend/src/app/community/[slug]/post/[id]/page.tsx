import type { Metadata } from "next";
import { PostDetailLogic } from "@/app/app/community/[slug]/post/[id]/logic";
import { SITE_NAME } from "@/lib/seo";
import { resolveSeoMetadata } from "@/lib/seo-metadata";

export const generateMetadata = async (): Promise<Metadata> =>
  resolveSeoMetadata("community_post", {
    description:
      "Pergunta ou relato público de comunidade na Lectum, com respostas e contexto responsável.",
    title: `Pergunta da comunidade | ${SITE_NAME}`,
  });

export default function PostDetailPage() {
  return <PostDetailLogic />;
}
