import type { Prisma } from "@/external/generated/prisma/client";
import prisma, { type ORM } from "@/infra/database/prisma";
import { withSerializableTransaction } from "@/utils/prisma-transaction";

type CommunityMembershipClient = Pick<ORM, "community" | "community_member">;

export type EnsureCommunityMembershipResult = {
  createdAt: Date;
  reactivated: boolean;
  created: boolean;
};

export const ensureCommunityMembership = async (input: {
  client?: CommunityMembershipClient | Prisma.TransactionClient;
  communityId: string;
  userId: string;
}): Promise<EnsureCommunityMembershipResult> => {
  const client = input.client ?? prisma;
  const where = {
    community_id_user_id: {
      community_id: input.communityId,
      user_id: input.userId,
    },
  };

  const existing = await client.community_member.findUnique({
    where,
    select: {
      createdAt: true,
      deleted: true,
    },
  });

  if (existing) {
    if (existing.deleted) {
      const membership = await client.community_member.update({
        where,
        data: {
          deleted: false,
          deletedAt: null,
        },
        select: {
          createdAt: true,
        },
      });

      await client.community.update({
        where: {
          id: input.communityId,
        },
        data: {
          members_count: {
            increment: 1,
          },
        },
      });

      return {
        created: false,
        createdAt: membership.createdAt,
        reactivated: true,
      };
    }

    return {
      created: false,
      createdAt: existing.createdAt,
      reactivated: false,
    };
  }

  const membership = await client.community_member.create({
    data: {
      community_id: input.communityId,
      user_id: input.userId,
    },
    select: {
      createdAt: true,
    },
  });

  await client.community.update({
    where: {
      id: input.communityId,
    },
    data: {
      members_count: {
        increment: 1,
      },
    },
  });

  return {
    created: true,
    createdAt: membership.createdAt,
    reactivated: false,
  };
};

export const removeCommunityMembership = async (input: { communityId: string; userId: string }) =>
  withSerializableTransaction(async (transaction) => {
    const where = {
      community_id_user_id: {
        community_id: input.communityId,
        user_id: input.userId,
      },
    };
    const existing = await transaction.community_member.findUnique({
      where,
      select: { deleted: true },
    });

    if (!existing || existing.deleted) return false;

    const community = await transaction.community.findUniqueOrThrow({
      where: { id: input.communityId },
      select: { members_count: true },
    });
    await transaction.community_member.update({
      where,
      data: {
        deleted: true,
        deletedAt: new Date(),
      },
    });
    await transaction.community.update({
      where: { id: input.communityId },
      data: {
        members_count: {
          decrement: community.members_count > 0 ? 1 : 0,
        },
      },
    });

    return true;
  });
