import type { Prisma } from "@/external/generated/prisma/client";
import prisma, { type ORM } from "@/infra/database/prisma";
import { activeProfessionalEntitlementWhere } from "@/utils/subscription-entitlement";
import type {
  IPostCreateReplyDTO,
  IPostRepliesDTO,
  IPostSaveDTO,
  IPostShowDTO,
  IPostVoteDTO,
  PostAuthorDTO,
  PostCommunityDTO,
  PostDetailDTO,
  PostDetailResponse,
  PostMutationResult,
  PostRepliesResponse,
  PostReplyDTO,
  PostSaveResponse,
  PostVoteResponse,
} from "../DTOs/IPostDTO";
import type { IPostRepository } from "./interfaces/IPostRepository";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 30;

const CONTACT_MESSAGE =
  "Olá, encontrei sua resposta na comunidade Lectum e gostaria de conversar sobre atendimento.";

const communitySelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  category: true,
  members_count: true,
  createdAt: true,
} satisfies Prisma.communitySelect;

const professionalProfileSelect = {
  gender: true,
  whatsapp: true,
  cfp_verified_at: true,
  subscriptions: {
    where: activeProfessionalEntitlementWhere(),
    select: {
      id: true,
    },
    take: 1,
  },
} satisfies Prisma.psychologist_profileSelect;

const authorSelect = {
  id: true,
  name: true,
  avatar: true,
  role: true,
  psychologist_profile: {
    select: professionalProfileSelect,
  },
} satisfies Prisma.userSelect;

const postSelect = {
  id: true,
  title: true,
  content: true,
  anonymous: true,
  status: true,
  upvotes_count: true,
  downvotes_count: true,
  replies_count: true,
  saves_count: true,
  createdAt: true,
  community: {
    select: communitySelect,
  },
  author: {
    select: authorSelect,
  },
} satisfies Prisma.community_postSelect;

const replyBaseSelect = {
  id: true,
  title: true,
  content: true,
  media_url: true,
  media_type: true,
  upvotes_count: true,
  createdAt: true,
  parent_reply_id: true,
  author: {
    select: authorSelect,
  },
} satisfies Prisma.post_replySelect;

const replySelect = {
  ...replyBaseSelect,
  replies: {
    where: {
      deleted: false,
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: 3,
    select: replyBaseSelect,
  },
} satisfies Prisma.post_replySelect;

type PostResult = Prisma.community_postGetPayload<{ select: typeof postSelect }>;
type AuthorResult = PostResult["author"];
type ReplyBaseResult = Prisma.post_replyGetPayload<{ select: typeof replyBaseSelect }>;
type ReplyResult = Prisma.post_replyGetPayload<{ select: typeof replySelect }>;
type CurrentVote = 1 | -1 | null;

const normalizePagination = (query: { page?: number; limit?: number }) => {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(query.limit || DEFAULT_LIMIT)));

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

const toCommunityResponse = (item: {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  members_count: number;
  createdAt: Date;
}): PostCommunityDTO => ({
  id: item.id,
  name: item.name,
  slug: item.slug,
  description: item.description,
  category: item.category,
  members_count: item.members_count,
  created_at: item.createdAt,
});

const buildWhatsappUrl = (value?: string | null) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length < 8) return null;

  return `https://wa.me/${digits}?text=${encodeURIComponent(CONTACT_MESSAGE)}`;
};

const anonymousDisplayNameForPost = (postId: string) => {
  let hash = 0;

  for (const character of postId) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return `Membro Anônimo #${1000 + (hash % 9000)}`;
};

const isProfessionalVerified = (profile?: { cfp_verified_at: Date | null } | null) => {
  return Boolean(profile?.cfp_verified_at);
};

const hasPaidProfessionalEntitlement = (profile?: { subscriptions: { id: string }[] } | null) => {
  return Boolean(profile?.subscriptions.length);
};

const buildProfessionalWhatsappUrl = (
  profile?: {
    cfp_verified_at: Date | null;
    subscriptions: { id: string }[];
    whatsapp: string | null;
  } | null,
) => {
  if (!isProfessionalVerified(profile) || !hasPaidProfessionalEntitlement(profile)) return null;

  return buildWhatsappUrl(profile?.whatsapp);
};

const mentorBadgeForScore = (
  profile?: { cfp_verified_at: Date | null; subscriptions: { id: string }[] } | null,
  score = 0,
) => {
  if (!isProfessionalVerified(profile) || !hasPaidProfessionalEntitlement(profile)) return null;
  if (score >= 80) return "TOP #1 MENTOR";
  if (score >= 65) return "TOP #2 MENTOR";
  if (score >= 50) return "TOP #3 MENTOR";

  return null;
};

const authorTypeLabel = (role?: string | null, gender?: string | null, anonymous = false) => {
  if (role === "psicologo") {
    const normalizedGender = String(gender ?? "")
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase();

    if (normalizedGender.includes("feminino")) return "Psicóloga";
    if (normalizedGender.includes("masculino")) return "Psicólogo";

    return "Psicólogo(a)";
  }

  return anonymous ? "Membro Anônimo" : "Paciente";
};

const toAuthorResponse = (
  author: AuthorResult,
  mentorScore = 0,
  anonymous = false,
  anonymousDisplayName?: string,
): PostAuthorDTO => {
  const profile = author.psychologist_profile;
  const isPsychologist = author.role === "psicologo";
  const shouldMaskAuthor = !isPsychologist && anonymous;

  return {
    id: author.id,
    name: shouldMaskAuthor ? (anonymousDisplayName ?? "Membro Anônimo") : author.name,
    avatar: shouldMaskAuthor ? null : author.avatar,
    role: author.role,
    type_label: authorTypeLabel(author.role, profile?.gender, anonymous),
    verified: isPsychologist && isProfessionalVerified(profile),
    featured_badge: isPsychologist ? mentorBadgeForScore(profile, mentorScore) : null,
    whatsapp_url: isPsychologist ? buildProfessionalWhatsappUrl(profile) : null,
  };
};

const normalizeVoteValue = (value?: number | null): CurrentVote => {
  if (value === 1 || value === -1) return value;

  return null;
};

const toPostResponse = (
  item: PostResult,
  currentUserVote: CurrentVote,
  saved: boolean,
): PostDetailDTO => {
  const responseCommunity = toCommunityResponse(item.community);
  const anonymous = item.author.role !== "psicologo" && item.anonymous;
  const author = toAuthorResponse(
    item.author,
    item.upvotes_count,
    anonymous,
    anonymous ? anonymousDisplayNameForPost(item.id) : undefined,
  );

  return {
    id: item.id,
    title: item.title,
    content: item.content,
    anonymous,
    status: item.status,
    upvotes_count: item.upvotes_count,
    downvotes_count: item.downvotes_count,
    replies_count: item.replies_count,
    saves_count: item.saves_count,
    created_at: item.createdAt,
    tags: responseCommunity.category ? [responseCommunity.category] : [],
    featured_badge: author.featured_badge,
    media_url: null,
    media_type: null,
    current_user_vote: currentUserVote,
    saved,
    community: responseCommunity,
    author,
  };
};

const toReplyResponse = (
  item: ReplyResult | ReplyBaseResult,
  currentVotes: Map<string, CurrentVote>,
): PostReplyDTO => {
  const nestedReplies = "replies" in item ? item.replies : [];

  return {
    id: item.id,
    title: item.title,
    content: item.content,
    media_url: item.media_url,
    media_type: item.media_type,
    upvotes_count: item.upvotes_count,
    created_at: item.createdAt,
    parent_reply_id: item.parent_reply_id,
    current_user_vote: currentVotes.get(item.id) ?? null,
    author: toAuthorResponse(item.author, item.upvotes_count),
    replies: nestedReplies.map((reply) => toReplyResponse(reply, currentVotes)),
  };
};

const collectReplyIds = (items: ReplyResult[]) => {
  const ids = new Set<string>();

  for (const item of items) {
    ids.add(item.id);
    for (const child of item.replies) {
      ids.add(child.id);
    }
  }

  return [...ids];
};

const findPublishedPost = (id: string) => {
  return prisma.community_post.findFirst({
    where: {
      id,
      deleted: false,
      status: "publicado",
      community: {
        deleted: false,
      },
    },
    select: {
      id: true,
      upvotes_count: true,
      downvotes_count: true,
      saves_count: true,
    },
  });
};

export class PostRepository implements IPostRepository {
  readonly repository: ORM["community_post"];

  constructor() {
    this.repository = prisma.community_post;
  }

  async show(data: IPostShowDTO): Promise<PostDetailResponse | null> {
    const post = await this.repository.findFirst({
      where: {
        id: data.p.id,
        deleted: false,
        status: "publicado",
        community: {
          deleted: false,
        },
      },
      select: postSelect,
    });

    if (!post) return null;

    const [vote, save] = await Promise.all([
      prisma.post_vote.findUnique({
        where: {
          user_id_post_id: {
            user_id: data.auth.id!,
            post_id: post.id,
          },
        },
        select: {
          deleted: true,
          value: true,
        },
      }),
      prisma.post_save.findUnique({
        where: {
          user_id_post_id: {
            user_id: data.auth.id!,
            post_id: post.id,
          },
        },
        select: {
          deleted: true,
        },
      }),
    ]);

    return {
      post: toPostResponse(
        post,
        vote && !vote.deleted ? normalizeVoteValue(vote.value) : null,
        Boolean(save && !save.deleted),
      ),
    };
  }

  async replies(data: IPostRepliesDTO): Promise<PostRepliesResponse | null> {
    const post = await findPublishedPost(data.p.id);
    if (!post) return null;

    const pagination = normalizePagination(data.q);
    const where: Prisma.post_replyWhereInput = {
      post_id: post.id,
      parent_reply_id: null,
      deleted: false,
    };

    const [items, count] = await Promise.all([
      prisma.post_reply.findMany({
        where,
        take: pagination.limit,
        skip: pagination.skip,
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: replySelect,
      }),
      prisma.post_reply.count({ where }),
    ]);

    const replyIds = collectReplyIds(items);
    const votes =
      replyIds.length > 0
        ? await prisma.post_vote.findMany({
            where: {
              user_id: data.auth.id!,
              reply_id: {
                in: replyIds,
              },
              deleted: false,
            },
            select: {
              reply_id: true,
              value: true,
            },
          })
        : [];
    const voteMap = new Map<string, CurrentVote>();

    for (const vote of votes) {
      if (vote.reply_id) {
        voteMap.set(vote.reply_id, normalizeVoteValue(vote.value));
      }
    }

    return {
      data: items.map((item) => toReplyResponse(item, voteMap)),
      page: pagination.page,
      pages: Math.ceil(count / pagination.limit),
      count,
    };
  }

  async createReply(data: IPostCreateReplyDTO): Promise<PostMutationResult<PostReplyDTO>> {
    const post = await findPublishedPost(data.p.id);
    if (!post) return { kind: "not_found" };

    if (data.b.parentReplyId) {
      const parent = await prisma.post_reply.findFirst({
        where: {
          id: data.b.parentReplyId,
          post_id: post.id,
          parent_reply_id: null,
          deleted: false,
        },
        select: {
          id: true,
        },
      });

      if (!parent) return { kind: "invalid_parent" };
    }

    const reply = await prisma.$transaction(async (transaction) => {
      const created = await transaction.post_reply.create({
        data: {
          post_id: post.id,
          author_id: data.auth.id!,
          parent_reply_id: data.b.parentReplyId || null,
          content: data.b.content.trim(),
        },
        select: replyBaseSelect,
      });

      await transaction.community_post.update({
        where: {
          id: post.id,
        },
        data: {
          replies_count: {
            increment: 1,
          },
        },
      });

      return created;
    });

    return {
      kind: "ok",
      data: toReplyResponse(reply, new Map()),
    };
  }

  async vote(data: IPostVoteDTO): Promise<PostMutationResult<PostVoteResponse>> {
    const post = await findPublishedPost(data.p.id);
    if (!post) return { kind: "not_found" };

    const replyId = data.b.replyId || null;
    const value = data.b.value;

    if (replyId) {
      const reply = await prisma.post_reply.findFirst({
        where: {
          id: replyId,
          post_id: post.id,
          deleted: false,
        },
        select: {
          id: true,
        },
      });

      if (!reply) return { kind: "invalid_target" };
    }

    const response = await prisma.$transaction(async (transaction) => {
      const existing = replyId
        ? await transaction.post_vote.findUnique({
            where: {
              user_id_reply_id: {
                user_id: data.auth.id!,
                reply_id: replyId,
              },
            },
            select: {
              id: true,
              deleted: true,
              value: true,
            },
          })
        : await transaction.post_vote.findUnique({
            where: {
              user_id_post_id: {
                user_id: data.auth.id!,
                post_id: post.id,
              },
            },
            select: {
              id: true,
              deleted: true,
              value: true,
            },
          });

      const oldValue = existing && !existing.deleted ? normalizeVoteValue(existing.value) : null;
      const nextValue: CurrentVote = oldValue === value ? null : value;
      const upDelta = (nextValue === 1 ? 1 : 0) - (oldValue === 1 ? 1 : 0);
      const downDelta = (nextValue === -1 ? 1 : 0) - (oldValue === -1 ? 1 : 0);

      if (existing) {
        await transaction.post_vote.update({
          where: {
            id: existing.id,
          },
          data: {
            value,
            deleted: nextValue === null,
            deletedAt: nextValue === null ? new Date() : null,
          },
        });
      } else if (nextValue !== null) {
        await transaction.post_vote.create({
          data: {
            user_id: data.auth.id!,
            post_id: replyId ? null : post.id,
            reply_id: replyId,
            value,
          },
        });
      }

      if (replyId) {
        const updatedReply = await transaction.post_reply.update({
          where: {
            id: replyId,
          },
          data: {
            upvotes_count: {
              increment: upDelta,
            },
          },
          select: {
            upvotes_count: true,
          },
        });

        return {
          target_type: "reply" as const,
          post_id: post.id,
          reply_id: replyId,
          value: nextValue,
          upvotes_count: updatedReply.upvotes_count,
          downvotes_count: null,
        };
      }

      const updatedPost = await transaction.community_post.update({
        where: {
          id: post.id,
        },
        data: {
          upvotes_count: {
            increment: upDelta,
          },
          downvotes_count: {
            increment: downDelta,
          },
        },
        select: {
          upvotes_count: true,
          downvotes_count: true,
        },
      });

      return {
        target_type: "post" as const,
        post_id: post.id,
        reply_id: null,
        value: nextValue,
        upvotes_count: updatedPost.upvotes_count,
        downvotes_count: updatedPost.downvotes_count,
      };
    });

    return {
      kind: "ok",
      data: response,
    };
  }

  async save(data: IPostSaveDTO): Promise<PostMutationResult<PostSaveResponse>> {
    const post = await findPublishedPost(data.p.id);
    if (!post) return { kind: "not_found" };

    const response = await prisma.$transaction(async (transaction) => {
      const existing = await transaction.post_save.findUnique({
        where: {
          user_id_post_id: {
            user_id: data.auth.id!,
            post_id: post.id,
          },
        },
        select: {
          id: true,
          deleted: true,
        },
      });

      if (existing) {
        if (existing.deleted) {
          await transaction.post_save.update({
            where: {
              id: existing.id,
            },
            data: {
              deleted: false,
              deletedAt: null,
            },
          });
        }
      } else {
        await transaction.post_save.create({
          data: {
            user_id: data.auth.id!,
            post_id: post.id,
          },
        });
      }

      const shouldIncrement = !existing || existing.deleted;
      const updatedPost = shouldIncrement
        ? await transaction.community_post.update({
            where: {
              id: post.id,
            },
            data: {
              saves_count: {
                increment: 1,
              },
            },
            select: {
              saves_count: true,
            },
          })
        : { saves_count: post.saves_count };

      return {
        post_id: post.id,
        saved: true,
        saves_count: updatedPost.saves_count,
      };
    });

    return {
      kind: "ok",
      data: response,
    };
  }

  async unsave(data: IPostSaveDTO): Promise<PostMutationResult<PostSaveResponse>> {
    const post = await findPublishedPost(data.p.id);
    if (!post) return { kind: "not_found" };

    const response = await prisma.$transaction(async (transaction) => {
      const existing = await transaction.post_save.findUnique({
        where: {
          user_id_post_id: {
            user_id: data.auth.id!,
            post_id: post.id,
          },
        },
        select: {
          id: true,
          deleted: true,
        },
      });

      if (existing && !existing.deleted) {
        await transaction.post_save.update({
          where: {
            id: existing.id,
          },
          data: {
            deleted: true,
            deletedAt: new Date(),
          },
        });
      }

      const shouldDecrement = Boolean(existing && !existing.deleted && post.saves_count > 0);
      const updatedPost = shouldDecrement
        ? await transaction.community_post.update({
            where: {
              id: post.id,
            },
            data: {
              saves_count: {
                decrement: 1,
              },
            },
            select: {
              saves_count: true,
            },
          })
        : { saves_count: post.saves_count };

      return {
        post_id: post.id,
        saved: false,
        saves_count: updatedPost.saves_count,
      };
    });

    return {
      kind: "ok",
      data: response,
    };
  }
}
