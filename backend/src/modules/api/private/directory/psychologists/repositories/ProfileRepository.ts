import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { getPostIdsWithPsychologistReplies } from "@/utils/community-post-replies";
import { getMutedPostIds } from "@/utils/post-notification-mute";
import { crpExperienceYears } from "@/utils/professional-experience";
import {
  buildProfessionalFullDisplayName,
  getProfessionalWhatsappDisplayName,
} from "@/utils/professional-name";
import { parseStoredCrp } from "@/utils/professional-registry";
import { activeProfessionalEntitlementWhere } from "@/utils/subscription-entitlement";
import type {
  DirectoryPsychologistPost,
  DirectoryPsychologistPostsResponse,
  DirectoryPsychologistProfile,
  DirectoryPsychologistReviewsResponse,
  IProfileListDTO,
  IProfileShowDTO,
} from "../DTOs/IProfileDTO";
import type { IProfileRepository } from "./interfaces/IProfileRepository";
import {
  buildWhatsappUrl,
  catalogSelect,
  hasAvailableToday,
  hasPublishedProfileRequirements,
  isCatalogItem,
  isProfessionalVerified,
  type MentorBadgeByCommunityId,
  normalizeAcademicFormations,
  normalizeLanguages,
  normalizePagination,
  normalizeStringArray,
  normalizeVoteValue,
  type ProfilePostResult,
  type ProfileReplyResult,
  profilePostSelect,
  profileReplySelect,
  profileReviewSelect,
  toReviewResponse,
  trimToNull,
} from "./support/profile-base";
import { getProfileTopMentorCommunities, publishedProfileWhere } from "./support/profile-query";

import { selectHighlightedPublication, toPostResponse } from "./support/profile-response";

export class ProfileRepository implements IProfileRepository {
  async hasPublishedProfile(psychologistId: string): Promise<boolean> {
    const item = await prisma.user.findFirst({
      where: publishedProfileWhere(psychologistId),
      select: {
        name: true,
        psychologist_profile: {
          select: {
            video_url: true,
            modality: true,
            gender: true,
            cpf: true,
            crp: true,
            target_audience: true,
            professional_address_city: true,
            professional_address_state: true,
          },
        },
        psychologist_specialties: {
          where: { deleted: false, specialty: { active: true, deleted: false } },
          select: { id: true },
          take: 1,
        },
        psychologist_services: {
          where: { deleted: false, service: { active: true, deleted: false } },
          select: { id: true },
          take: 1,
        },
        psychologist_approaches: {
          where: { deleted: false, approach: { active: true, deleted: false } },
          select: { id: true },
          take: 1,
        },
      },
    });

    return Boolean(
      item?.psychologist_profile &&
        hasPublishedProfileRequirements(item, item.psychologist_profile),
    );
  }

  async show(data: IProfileShowDTO): Promise<DirectoryPsychologistProfile | null> {
    const viewerId = data.auth?.id;
    const viewerRelationWhere = viewerId
      ? {
          user_id: viewerId,
          psychologist_id: {
            not: viewerId,
          },
          deleted: false,
        }
      : {
          id: "__anonymous__",
        };

    const item = await prisma.user.findFirst({
      where: publishedProfileWhere(data.p.id),
      select: {
        id: true,
        name: true,
        avatar: true,
        favorited_by_patients: {
          where: viewerRelationWhere,
          select: {
            id: true,
          },
          take: 1,
        },
        followed_by_patients: {
          where: viewerRelationWhere,
          select: {
            id: true,
          },
          take: 1,
        },
        psychologist_profile: {
          select: {
            professional_first_name: true,
            professional_last_name: true,
            headline: true,
            bio: true,
            cover_image_url: true,
            video_url: true,
            video_cover_url: true,
            crp: true,
            cpf: true,
            crp_registration_date: true,
            cfp_verified_at: true,
            crp_status: true,
            gender: true,
            discount_first_session: true,
            social_value: true,
            accepts_insurance: true,
            show_experience_tag: true,
            available_days: true,
            modality: true,
            languages: true,
            target_audience: true,
            academic_title: true,
            academic_institution: true,
            academic_graduation_year: true,
            academic_formations: true,
            professional_address_city: true,
            professional_address_state: true,
            rating_avg: true,
            rating_count: true,
            whatsapp: true,
            subscriptions: {
              where: activeProfessionalEntitlementWhere(),
              select: {
                id: true,
                source: true,
              },
              take: 1,
            },
          },
        },
        psychologist_specialties: {
          where: {
            deleted: false,
            specialty: {
              active: true,
              deleted: false,
            },
          },
          select: {
            specialty: {
              select: catalogSelect,
            },
          },
        },
        psychologist_services: {
          where: {
            deleted: false,
            service: {
              active: true,
              deleted: false,
            },
          },
          select: {
            service: {
              select: catalogSelect,
            },
          },
        },
        psychologist_approaches: {
          where: {
            deleted: false,
            approach: {
              active: true,
              deleted: false,
            },
          },
          select: {
            approach: {
              select: catalogSelect,
            },
          },
        },
      },
    });

    const profile = item?.psychologist_profile;
    if (!item || !profile) return null;
    if (!hasPublishedProfileRequirements(item, profile)) return null;
    const { crp_number, crp_region } = parseStoredCrp(profile.crp);
    const displayName = buildProfessionalFullDisplayName({
      fallbackName: item.name,
      firstName: profile.professional_first_name,
      lastName: profile.professional_last_name,
    });
    const whatsappDisplayName = getProfessionalWhatsappDisplayName({
      fallbackName: displayName,
      firstName: profile.professional_first_name,
    });

    return {
      id: item.id,
      name: displayName,
      whatsapp_name: whatsappDisplayName,
      avatar: item.avatar,
      headline: profile.headline,
      bio: profile.bio,
      cover_image_url: profile.cover_image_url,
      video_url: profile.video_url,
      video_cover_url: profile.video_cover_url,
      crp: profile.crp,
      crp_registration_date: profile.crp_registration_date,
      gender: profile.gender,
      modality: profile.modality,
      languages: normalizeLanguages(profile.languages),
      target_audience: normalizeStringArray(profile.target_audience),
      address_city: profile.professional_address_city,
      address_state: profile.professional_address_state,
      academic_formations: normalizeAcademicFormations(profile.academic_formations, {
        title: trimToNull(profile.academic_title),
        institution: trimToNull(profile.academic_institution),
        graduation_year: trimToNull(profile.academic_graduation_year),
      }),
      rating_avg: profile.rating_avg,
      rating_count: profile.rating_count,
      verified: isProfessionalVerified(profile),
      available_today: hasAvailableToday(profile.available_days),
      formation_years: crpExperienceYears(profile.crp_registration_date),
      regional_crp: crp_region,
      registration_number: crp_number,
      discount_first_session: profile.discount_first_session,
      social_value: profile.social_value,
      accepts_insurance: profile.accepts_insurance,
      show_experience_tag: profile.show_experience_tag,
      whatsapp_url: buildWhatsappUrl(profile.whatsapp, displayName, whatsappDisplayName),
      favorited: item.favorited_by_patients.length > 0,
      followed: item.followed_by_patients.length > 0,
      whatsapp_available: Boolean(profile.whatsapp),
      specialties: item.psychologist_specialties
        .map(({ specialty }) => specialty)
        .filter(isCatalogItem),
      services: item.psychologist_services.map(({ service }) => service).filter(isCatalogItem),
      approaches: item.psychologist_approaches
        .map(({ approach }) => approach)
        .filter(isCatalogItem),
    };
  }

  async posts(data: IProfileListDTO): Promise<DirectoryPsychologistPostsResponse> {
    const pagination = normalizePagination(data.q);
    const postsWhere: Prisma.community_postWhereInput = {
      author_id: data.p.id,
      deleted: false,
      status: "publicado",
      community: {
        active: true,
        deleted: false,
      },
    };
    const repliesWhere: Prisma.post_replyWhereInput = {
      author_id: data.p.id,
      deleted: false,
      post: {
        deleted: false,
        status: "publicado",
        community: {
          active: true,
          deleted: false,
        },
      },
    };
    const [posts, postsCount, replies, repliesCount, topMentorCommunities] = await Promise.all([
      prisma.community_post.findMany({
        where: postsWhere,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: profilePostSelect,
      }),
      prisma.community_post.count({ where: postsWhere }),
      prisma.post_reply.findMany({
        where: repliesWhere,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: profileReplySelect,
      }),
      prisma.post_reply.count({ where: repliesWhere }),
      getProfileTopMentorCommunities(data.p.id),
    ]);
    const mentorBadgeByCommunityId: MentorBadgeByCommunityId = new Map(
      topMentorCommunities.map((community) => [community.id, community.badge]),
    );
    const count = postsCount + repliesCount;
    const allReplyIds = replies.map((reply) => reply.id);
    const [replyChildrenCountRows, replySavesCountRows] = allReplyIds.length
      ? await Promise.all([
          prisma.post_reply.groupBy({
            by: ["parent_reply_id"],
            where: {
              deleted: false,
              parent_reply_id: {
                in: allReplyIds,
              },
            },
            _count: {
              parent_reply_id: true,
            },
          }),
          prisma.post_reply_save.groupBy({
            by: ["reply_id"],
            where: {
              deleted: false,
              reply_id: {
                in: allReplyIds,
              },
            },
            _count: {
              reply_id: true,
            },
          }),
        ])
      : [[], []];
    const replyChildrenCountById = new Map(
      replyChildrenCountRows.flatMap((row) =>
        row.parent_reply_id ? [[row.parent_reply_id, row._count.parent_reply_id]] : [],
      ),
    );
    const replySavesCountById = new Map(
      replySavesCountRows.map((row) => [row.reply_id, row._count.reply_id]),
    );
    const highlightedPublication = selectHighlightedPublication(
      posts,
      replies,
      replyChildrenCountById,
      replySavesCountById,
    );
    const mergedItems = [
      ...posts.map((post) => ({ createdAt: post.createdAt, kind: "post" as const, post })),
      ...replies.map((reply) => ({ createdAt: reply.createdAt, kind: "reply" as const, reply })),
    ]
      .sort((a, b) => {
        const byDate = b.createdAt.getTime() - a.createdAt.getTime();
        if (byDate !== 0) return byDate;

        const aId = a.kind === "post" ? a.post.id : a.reply.id;
        const bId = b.kind === "post" ? b.post.id : b.reply.id;

        return bId.localeCompare(aId);
      })
      .slice(pagination.skip, pagination.skip + pagination.limit);
    const postIds = Array.from(
      new Set(
        [
          ...mergedItems.map((item) => (item.kind === "post" ? item.post.id : item.reply.post.id)),
          highlightedPublication?.kind === "post"
            ? highlightedPublication.post.id
            : highlightedPublication?.reply.post.id,
        ].filter((postId): postId is string => Boolean(postId)),
      ),
    );
    const replyIds = Array.from(
      new Set(
        [
          ...mergedItems.flatMap((item) => (item.kind === "reply" ? [item.reply.id] : [])),
          highlightedPublication?.kind === "reply" ? highlightedPublication.reply.id : null,
        ].filter((replyId): replyId is string => Boolean(replyId)),
      ),
    );
    const authId = data.auth?.id;
    const [votes, saves, replySaves] = authId
      ? await Promise.all([
          postIds.length
            ? prisma.post_vote.findMany({
                where: {
                  deleted: false,
                  post_id: { in: postIds },
                  user_id: authId,
                },
                select: {
                  post_id: true,
                  value: true,
                },
              })
            : Promise.resolve([]),
          postIds.length
            ? prisma.post_save.findMany({
                where: {
                  deleted: false,
                  post_id: { in: postIds },
                  user_id: authId,
                },
                select: {
                  post_id: true,
                },
              })
            : Promise.resolve([]),
          replyIds.length
            ? prisma.post_reply_save.findMany({
                where: {
                  deleted: false,
                  reply_id: { in: replyIds },
                  user_id: authId,
                },
                select: {
                  reply_id: true,
                },
              })
            : Promise.resolve([]),
        ])
      : [[], [], []];
    const voteByPostId = new Map(
      votes.map((vote) => [vote.post_id, normalizeVoteValue(vote.value)]),
    );
    const savedPostIds = new Set(saves.map((save) => save.post_id));
    const savedReplyIds = new Set(replySaves.map((save) => save.reply_id));
    const [mutedPostIds, postsWithPsychologistReplies] = await Promise.all([
      getMutedPostIds(authId ?? undefined, postIds),
      getPostIdsWithPsychologistReplies(postIds),
    ]);
    const toDirectoryPublication = (
      item:
        | { kind: "post"; post: ProfilePostResult }
        | { kind: "reply"; reply: ProfileReplyResult },
    ): DirectoryPsychologistPost => {
      if (item.kind === "post") {
        return {
          ...toPostResponse(
            item.post,
            voteByPostId.get(item.post.id) ?? null,
            savedPostIds.has(item.post.id),
            savedReplyIds,
            undefined,
            mutedPostIds.has(item.post.id),
            postsWithPsychologistReplies.has(item.post.id),
            data.p.id,
            mentorBadgeByCommunityId,
          ),
          contribution_type: "post",
        };
      }

      return {
        ...toPostResponse(
          item.reply.post,
          voteByPostId.get(item.reply.post.id) ?? null,
          savedPostIds.has(item.reply.post.id),
          savedReplyIds,
          item.reply,
          mutedPostIds.has(item.reply.post.id),
          postsWithPsychologistReplies.has(item.reply.post.id),
          data.p.id,
          mentorBadgeByCommunityId,
        ),
        contribution_type: "reply",
      };
    };

    return {
      data: mergedItems.map((item) => toDirectoryPublication(item)),
      page: pagination.page,
      pages: Math.ceil(count / pagination.limit),
      count,
      summary: {
        posts_count: postsCount,
        replies_count: repliesCount,
        top_mentor_communities: topMentorCommunities.slice(0, 3),
      },
      highlighted_publication: highlightedPublication
        ? toDirectoryPublication(highlightedPublication)
        : null,
    };
  }

  async reviews(data: IProfileListDTO): Promise<DirectoryPsychologistReviewsResponse> {
    const pagination = normalizePagination(data.q);
    const where: Prisma.professional_reviewWhereInput = {
      psychologist_id: data.p.id,
      deleted: false,
      status: "publicada",
      author: {
        active: true,
        deleted: false,
      },
    };

    const [items, count, profile, distributionRows, highlightedReview] = await Promise.all([
      prisma.professional_review.findMany({
        where,
        take: pagination.limit,
        skip: pagination.skip,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: profileReviewSelect,
      }),
      prisma.professional_review.count({ where }),
      prisma.psychologist_profile.findFirst({
        where: {
          user_id: data.p.id,
          deleted: false,
          published: true,
          video_url: {
            not: null,
          },
          NOT: [
            {
              video_url: "",
            },
          ],
        },
        select: {
          rating_avg: true,
          rating_count: true,
        },
      }),
      prisma.professional_review.groupBy({
        by: ["rating"],
        where,
        _count: {
          rating: true,
        },
      }),
      prisma.professional_review.findFirst({
        where,
        orderBy: [{ rating: "desc" }, { createdAt: "desc" }, { id: "desc" }],
        select: profileReviewSelect,
      }),
    ]);

    const distribution = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    } satisfies Record<1 | 2 | 3 | 4 | 5, number>;

    for (const row of distributionRows) {
      if (row.rating >= 1 && row.rating <= 5) {
        distribution[row.rating as 1 | 2 | 3 | 4 | 5] = row._count.rating;
      }
    }

    return {
      data: items.map(toReviewResponse),
      summary: {
        rating_avg: profile?.rating_avg ?? 0,
        rating_count: profile?.rating_count ?? count,
        distribution,
      },
      highlighted_review: highlightedReview ? toReviewResponse(highlightedReview) : null,
      page: pagination.page,
      pages: Math.ceil(count / pagination.limit),
      count,
    };
  }
}
