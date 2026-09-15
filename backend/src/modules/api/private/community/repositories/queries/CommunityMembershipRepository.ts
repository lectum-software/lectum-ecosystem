import prisma from "@/infra/database/prisma";
import { ensureCommunityMembership, removeCommunityMembership } from "@/utils/community-membership";
import { withSerializableTransaction } from "@/utils/prisma-transaction";
import type {
  CommunityMembershipResponse,
  ICommunityMembershipDTO,
  ICommunitySuggestionDTO,
} from "../../DTOs/ICommunityDTO";
import { communitySelect } from "../support/community-feed";
import { toCommunityDetailResponse } from "../support/community-ranking";

import { CommunityRepositoryContext } from "./CommunityRepositoryContext";

export class CommunityMembershipRepository extends CommunityRepositoryContext {
  async follow(data: ICommunityMembershipDTO): Promise<CommunityMembershipResponse | null> {
    const community = await this.repository.findFirst({
      where: {
        slug: data.p.slug,
        active: true,
        deleted: false,
      },
      select: communitySelect,
    });

    if (!community) return null;

    const membership = await withSerializableTransaction((transaction) =>
      ensureCommunityMembership({
        client: transaction,
        communityId: community.id,
        userId: data.auth.id!,
      }),
    );

    const postsCount = await prisma.community_post.count({
      where: {
        community_id: community.id,
        deleted: false,
        status: "publicado",
      },
    });
    const updatedCommunity = await this.repository.findUniqueOrThrow({
      where: {
        id: community.id,
      },
      select: communitySelect,
    });
    const detail = toCommunityDetailResponse(updatedCommunity, postsCount, membership.createdAt);

    return {
      community: detail.community,
      following: true,
    };
  }

  async unfollow(data: ICommunityMembershipDTO): Promise<CommunityMembershipResponse | null> {
    const community = await this.repository.findFirst({
      where: {
        slug: data.p.slug,
        active: true,
        deleted: false,
      },
      select: communitySelect,
    });

    if (!community) return null;

    await removeCommunityMembership({
      communityId: community.id,
      userId: data.auth.id!,
    });

    const postsCount = await prisma.community_post.count({
      where: {
        community_id: community.id,
        deleted: false,
        status: "publicado",
      },
    });
    const updatedCommunity = await this.repository.findUniqueOrThrow({
      where: {
        id: community.id,
      },
      select: communitySelect,
    });
    const detail = toCommunityDetailResponse(updatedCommunity, postsCount, null);

    return {
      community: detail.community,
      following: false,
    };
  }

  async suggest(data: ICommunitySuggestionDTO) {
    const suggestion = await prisma.community_suggestion.create({
      data: {
        user_id: data.auth.id!,
        theme: data.b.theme.trim(),
        status: "pendente",
      },
      select: {
        id: true,
        theme: true,
        status: true,
        createdAt: true,
      },
    });

    return {
      id: suggestion.id,
      theme: suggestion.theme,
      status: suggestion.status,
      created_at: suggestion.createdAt,
    };
  }
}
