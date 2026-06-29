import type { Metadata } from "next";
import { PostReplyThreadLogic } from "@/app/app/community/[slug]/post/[id]/logic";
import { SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: `Discussão da comunidade | ${SITE_NAME}`,
  description: "Discussão pública de uma resposta em comunidade na Lectum.",
};

export default function PostReplyThreadPage() {
  return <PostReplyThreadLogic />;
}
