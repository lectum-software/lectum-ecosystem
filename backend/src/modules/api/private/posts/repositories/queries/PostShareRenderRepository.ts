import prisma from "@/infra/database/prisma";
import type { PostShareRenderTargetDTO } from "../../DTOs/IPostDTO";
import { authorSelect, toAuthorResponse, toPostMediaItemsResponse } from "../support/post-response";

export type PostShareRenderLookupResult =
  | { data: PostShareRenderTargetDTO; kind: "ok" }
  | { kind: "forbidden" | "invalid_media" | "invalid_target" | "not_found" };

type ShareRenderLookupInput = {
  postId: string;
  replyId?: string | null;
  userId: string;
};

const normalizeForComparison = (value?: string | null) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

const normalizeProfessionalRole = (typeLabel?: string | null): "Psicóloga" | "Psicólogo" =>
  normalizeForComparison(typeLabel).includes("psicologa") ? "Psicóloga" : "Psicólogo";

const normalizeProfessionalName = (name: string) => name.replace(/\s+/g, " ").trim();

const createShareTitle = (professionalName: string) =>
  `${normalizeProfessionalName(professionalName) || "Lectum"} na Lectum`;

const toProfessional = (author: ReturnType<typeof toAuthorResponse>) => ({
  name: normalizeProfessionalName(author.name) || "Lectum",
  roleLabel: normalizeProfessionalRole(author.type_label),
  verified: author.verified,
});

const replySourceText = (input: {
  parentContent?: string | null;
  parentReplyId?: string | null;
  postTitle: string;
}) => {
  const postTitle = input.postTitle.trim() || "Pergunta na Lectum";
  const hasCommentContext = Boolean(input.parentContent?.trim() || input.parentReplyId);

  return (hasCommentContext ? input.parentContent : postTitle)?.trim() || postTitle;
};

export class PostShareRenderRepository {
  async findTarget(data: ShareRenderLookupInput): Promise<PostShareRenderLookupResult> {
    return data.replyId ? this.findReplyTarget(data) : this.findPostTarget(data);
  }

  private async findPostTarget(data: ShareRenderLookupInput): Promise<PostShareRenderLookupResult> {
    const post = await prisma.community_post.findFirst({
      where: {
        deleted: false,
        id: data.postId,
        status: "publicado",
        community: {
          active: true,
          deleted: false,
        },
      },
      select: {
        author: {
          select: authorSelect,
        },
        author_id: true,
        content: true,
        id: true,
        media_items: {
          orderBy: [{ position: "asc" }, { createdAt: "asc" }, { id: "asc" }],
          select: {
            id: true,
            media_type: true,
            media_url: true,
            position: true,
            thumbnail_url: true,
          },
          where: {
            deleted: false,
          },
        },
        media_type: true,
        media_url: true,
        thumbnail_url: true,
        title: true,
        upvotes_count: true,
      },
    });

    if (!post) return { kind: "not_found" };
    if (post.author_id !== data.userId) return { kind: "forbidden" };
    if (post.author.role !== "psicologo") return { kind: "invalid_target" };

    const videoMedia = toPostMediaItemsResponse(post)[0];
    if (videoMedia?.media_type !== "video" || !videoMedia.media_url) {
      return { kind: "invalid_media" };
    }

    const author = toAuthorResponse(post.author, post.upvotes_count, false);
    const professional = toProfessional(author);
    const sourceText = post.title.trim() || post.content.trim() || "Post na Lectum";

    return {
      data: {
        cardLabel: "Postado na Lectum",
        mediaUrl: videoMedia.media_url,
        postId: post.id,
        professional,
        replyId: null,
        responseText: post.content.trim() || null,
        shareTitle: createShareTitle(professional.name),
        sourceText,
      },
      kind: "ok",
    };
  }

  private async findReplyTarget(
    data: ShareRenderLookupInput,
  ): Promise<PostShareRenderLookupResult> {
    const replyId = data.replyId;
    if (!replyId) return { kind: "not_found" };

    const reply = await prisma.post_reply.findFirst({
      where: {
        deleted: false,
        id: replyId,
        post_id: data.postId,
        post: {
          deleted: false,
          status: "publicado",
          community: {
            active: true,
            deleted: false,
          },
        },
      },
      select: {
        author: {
          select: authorSelect,
        },
        author_id: true,
        content: true,
        id: true,
        media_type: true,
        media_url: true,
        parent_reply: {
          select: {
            content: true,
          },
        },
        parent_reply_id: true,
        post: {
          select: {
            id: true,
            title: true,
          },
        },
        upvotes_count: true,
      },
    });

    if (!reply) return { kind: "not_found" };
    if (reply.author_id !== data.userId) return { kind: "forbidden" };
    if (reply.author.role !== "psicologo") return { kind: "invalid_target" };
    if (reply.media_type !== "video" || !reply.media_url) return { kind: "invalid_media" };

    const author = toAuthorResponse(
      reply.author,
      reply.upvotes_count,
      false,
      undefined,
      "community_reply",
    );
    const professional = toProfessional(author);

    return {
      data: {
        cardLabel: "Respondido na Lectum",
        mediaUrl: reply.media_url,
        postId: reply.post.id,
        professional,
        replyId: reply.id,
        responseText: reply.content.trim() || null,
        shareTitle: createShareTitle(professional.name),
        sourceText: replySourceText({
          parentContent: reply.parent_reply?.content ?? null,
          parentReplyId: reply.parent_reply_id,
          postTitle: reply.post.title,
        }),
      },
      kind: "ok",
    };
  }
}
