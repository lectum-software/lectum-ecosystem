import type { Metadata } from "next";
import { PostDetailLogic } from "@/app/app/community/[slug]/post/[id]/logic";
import { SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: `Pergunta da comunidade | ${SITE_NAME}`,
  description:
    "Pergunta ou relato público de comunidade na Lectum, com respostas e contexto responsável.",
};

export default function PostDetailPage() {
  return <PostDetailLogic />;
}
