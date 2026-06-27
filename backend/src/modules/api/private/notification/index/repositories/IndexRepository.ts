//Client

import { endOfDay, startOfDay } from "date-fns";
//Types
import type {
  //*
  Prisma,
} from "@/external/generated/prisma/client";
import prisma, { type ORM } from "@/infra/database/prisma";
//Objects
import type {
  //*
  notification,
} from "@/interfaces/objects";
import type {
  //*
  PaginationResponse,
} from "@/interfaces/pagination";
//Utils
import { format } from "@/utils/pagination";
import { activeProfessionalEntitlementWhere } from "@/utils/subscription-entitlement";
//DTOs
import type {
  //*
  IIndexDTO,
} from "../DTOs/IIndexDTO";
import type {
  //*
  IIndexRepository,
} from "./interfaces/IIndexRepository";

const notificationAuthorSelect = {
  id: true,
  deleted: true,
  name: true,
  avatar: true,
  role: true,
  psychologist_profile: {
    select: {
      gender: true,
      cfp_verified_at: true,
      subscriptions: {
        where: activeProfessionalEntitlementWhere(),
        select: {
          source: true,
        },
      },
    },
  },
} satisfies Prisma.userSelect;

type NotificationAuthor = Prisma.userGetPayload<{ select: typeof notificationAuthorSelect }>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const getStringProp = (value: unknown, key: string) => {
  if (!isRecord(value)) return undefined;

  const prop = value[key];
  return typeof prop === "string" ? prop : undefined;
};

const anonymousDisplayNameForAuthor = (authorId: string) => {
  let hash = 0;

  for (const character of authorId) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return `Membro Anônimo #${1000 + (hash % 9000)}`;
};

const professionalLabelForGender = (gender?: string | null) => {
  const normalizedGender = String(gender ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

  if (normalizedGender.includes("feminino")) return "Psicóloga";
  if (normalizedGender.includes("masculino")) return "Psicólogo";

  return "Psicólogo(a)";
};

const isProfessionalVerified = (
  profile?: { cfp_verified_at: Date | null; subscriptions: { source?: string | null }[] } | null,
) =>
  Boolean(
    profile?.cfp_verified_at ||
      profile?.subscriptions.some((subscription) => subscription.source === "admin_grant"),
  );

const toNotificationActor = (author: NotificationAuthor, anonymous = false) => {
  const isPsychologist = author.role === "psicologo";
  const isDeletedAuthor = Boolean(author.deleted);
  const shouldMaskAuthor = !isPsychologist && anonymous;
  const shouldHideIdentity = isDeletedAuthor || shouldMaskAuthor;
  const fallbackName = isPsychologist ? "Psicólogo" : "Membro";
  const deletedName = isPsychologist ? "Psicólogo Excluído" : "Membro Excluído";
  const publicName = author.name?.trim() || fallbackName;

  return {
    id: shouldHideIdentity ? null : author.id,
    name: isDeletedAuthor
      ? deletedName
      : shouldMaskAuthor
        ? anonymousDisplayNameForAuthor(author.id)
        : publicName,
    avatar: shouldHideIdentity ? null : author.avatar,
    role: author.role,
    professional_label:
      isPsychologist && !isDeletedAuthor
        ? professionalLabelForGender(author.psychologist_profile?.gender)
        : null,
    verified:
      isPsychologist && !isDeletedAuthor && isProfessionalVerified(author.psychologist_profile),
    anonymous: shouldMaskAuthor,
    deleted: isDeletedAuthor,
  } satisfies NonNullable<notification["actor"]>;
};

const postIdFromNotification = (item: notification) => {
  const sourceType = getStringProp(item.message_props, "source_type");

  return (
    getStringProp(item.message_props, "post_id") ??
    (sourceType === "community_post" ? getStringProp(item.message_props, "source_id") : undefined)
  );
};

const replyIdFromNotification = (item: notification) => {
  const sourceType = getStringProp(item.message_props, "source_type");

  return (
    getStringProp(item.message_props, "reply_id") ??
    (sourceType === "post_reply" ? getStringProp(item.message_props, "source_id") : undefined)
  );
};

const reviewIdFromNotification = (item: notification) => {
  const sourceType = getStringProp(item.message_props, "source_type");

  return (
    getStringProp(item.message_props, "review_id") ??
    (sourceType === "professional_review"
      ? getStringProp(item.message_props, "source_id")
      : undefined)
  );
};

const favoriteIdFromNotification = (item: notification) => {
  const sourceType = getStringProp(item.message_props, "source_type");

  return (
    getStringProp(item.message_props, "favorite_id") ??
    (sourceType === "psychologist_favorite"
      ? getStringProp(item.message_props, "source_id")
      : undefined)
  );
};

const contactRequestIdFromNotification = (item: notification) => {
  const sourceType = getStringProp(item.message_props, "source_type");

  return (
    getStringProp(item.message_props, "contact_request_id") ??
    (sourceType === "contact_request" ? getStringProp(item.message_props, "source_id") : undefined)
  );
};

export class IndexRepository implements IIndexRepository {
  readonly repository: ORM["notification"];

  constructor() {
    this.repository = prisma.notification;
  }

  private async withActors(items: notification[]) {
    const postIds = [
      ...new Set(
        items
          .filter((item) => item.message_key === "novo_post")
          .map(postIdFromNotification)
          .filter(Boolean),
      ),
    ] as string[];
    const replyIds = [
      ...new Set(
        items
          .filter((item) => item.message_key === "nova_resposta")
          .map(replyIdFromNotification)
          .filter(Boolean),
      ),
    ] as string[];
    const reviewIds = [
      ...new Set(
        items
          .filter((item) => item.message_key === "nova_avaliacao")
          .map(reviewIdFromNotification)
          .filter(Boolean),
      ),
    ] as string[];
    const favoriteIds = [
      ...new Set(
        items
          .filter((item) => item.message_key === "novo_favorito")
          .map(favoriteIdFromNotification)
          .filter(Boolean),
      ),
    ] as string[];
    const contactRequestIds = [
      ...new Set(
        items
          .filter((item) => item.message_key === "clique_whatsapp")
          .map(contactRequestIdFromNotification)
          .filter(Boolean),
      ),
    ] as string[];

    const [posts, replies, reviews, favorites, contactRequests] = await Promise.all([
      postIds.length > 0
        ? prisma.community_post.findMany({
            where: {
              id: {
                in: postIds,
              },
              deleted: false,
            },
            select: {
              id: true,
              anonymous: true,
              author: {
                select: notificationAuthorSelect,
              },
            },
          })
        : Promise.resolve([]),
      replyIds.length > 0
        ? prisma.post_reply.findMany({
            where: {
              id: {
                in: replyIds,
              },
              deleted: false,
            },
            select: {
              id: true,
              author: {
                select: notificationAuthorSelect,
              },
            },
          })
        : Promise.resolve([]),
      reviewIds.length > 0
        ? prisma.professional_review.findMany({
            where: {
              id: {
                in: reviewIds,
              },
              deleted: false,
            },
            select: {
              id: true,
              author: {
                select: notificationAuthorSelect,
              },
            },
          })
        : Promise.resolve([]),
      favoriteIds.length > 0
        ? prisma.psychologist_favorite.findMany({
            where: {
              id: {
                in: favoriteIds,
              },
              deleted: false,
            },
            select: {
              id: true,
              user: {
                select: notificationAuthorSelect,
              },
            },
          })
        : Promise.resolve([]),
      contactRequestIds.length > 0
        ? prisma.contact_request.findMany({
            where: {
              id: {
                in: contactRequestIds,
              },
              deleted: false,
            },
            select: {
              id: true,
              user: {
                select: notificationAuthorSelect,
              },
            },
          })
        : Promise.resolve([]),
    ]);

    const postActors = new Map(
      posts.map((post) => [
        post.id,
        toNotificationActor(post.author, post.author.role !== "psicologo" && post.anonymous),
      ]),
    );
    const replyActors = new Map(
      replies.map((reply) => [reply.id, toNotificationActor(reply.author)]),
    );
    const reviewActors = new Map(
      reviews.map((review) => [review.id, toNotificationActor(review.author)]),
    );
    const favoriteActors = new Map(
      favorites.map((favorite) => [favorite.id, toNotificationActor(favorite.user)]),
    );
    const contactRequestActors = new Map(
      contactRequests.map((contactRequest) => [
        contactRequest.id,
        contactRequest.user ? toNotificationActor(contactRequest.user) : null,
      ]),
    );

    return items.map((item) => {
      if (item.message_key === "novo_post") {
        const postId = postIdFromNotification(item);

        return {
          ...item,
          actor: postId ? (postActors.get(postId) ?? null) : null,
        };
      }

      if (item.message_key === "nova_resposta") {
        const replyId = replyIdFromNotification(item);

        return {
          ...item,
          actor: replyId ? (replyActors.get(replyId) ?? null) : null,
        };
      }

      if (item.message_key === "nova_avaliacao") {
        const reviewId = reviewIdFromNotification(item);

        return {
          ...item,
          actor: reviewId ? (reviewActors.get(reviewId) ?? null) : null,
        };
      }

      if (item.message_key === "novo_favorito") {
        const favoriteId = favoriteIdFromNotification(item);

        return {
          ...item,
          actor: favoriteId ? (favoriteActors.get(favoriteId) ?? null) : null,
        };
      }

      if (item.message_key === "clique_whatsapp") {
        const contactRequestId = contactRequestIdFromNotification(item);

        return {
          ...item,
          actor: contactRequestId ? (contactRequestActors.get(contactRequestId) ?? null) : null,
        };
      }

      return {
        ...item,
        actor: null,
      };
    });
  }

  async index(props: IIndexDTO): Promise<PaginationResponse<notification>> {
    const pages = format({ limit: 20, ...props.q });

    const whereConditions: Prisma.notificationWhereInput = {
      user_id: props.auth.id!,
      deleted: false,
      message_key: {
        not: "downvote",
      },
      read: props.q.search === "unread" ? false : undefined,
      createdAt: {
        gte: props.q.startDate ? startOfDay(props.q.startDate) : undefined,
        lte: props.q.endDate ? endOfDay(props.q.endDate) : undefined,
      },
    };

    const [res, count] = await Promise.all([
      this.repository.findMany({
        where: whereConditions,
        ...pages.control,
      }),
      this.repository.count({
        where: whereConditions,
      }),
    ]);

    return {
      data: await this.withActors(res),
      page: pages.page,
      pages: Math.ceil(count / pages.limit),
      count,
    };
  }
}
