import prisma from "@/infra/database/prisma";
import type { AdminCommunitiesDashboardDateRange } from "../DTOs/IAdminCommunitiesDashboardDTO";
import type {
  IAdminCommunitiesDashboardRepository,
  MemberActivityRecord,
} from "./interfaces/IAdminCommunitiesDashboardRepository";

const createdAtWhere = (range: AdminCommunitiesDashboardDateRange) => ({
  gte: range.start,
  lte: range.end,
});

export class AdminCommunitiesDashboardRepository implements IAdminCommunitiesDashboardRepository {
  async countPendingReports(range: AdminCommunitiesDashboardDateRange): Promise<number> {
    return prisma.post_report.count({
      where: {
        createdAt: createdAtWhere(range),
        deleted: false,
        status: "pendente",
      },
    });
  }

  async listCommunities() {
    return prisma.community.findMany({
      orderBy: [{ members_count: "desc" }, { name: "asc" }],
      where: {
        deleted: false,
      },
      select: {
        id: true,
        members_count: true,
        name: true,
        slug: true,
        visual_primary_color: true,
      },
    });
  }

  async listCommunityMembers() {
    return prisma.community_member.findMany({
      where: {
        deleted: false,
        community: {
          deleted: false,
        },
        user: {
          active: true,
          deleted: false,
        },
      },
      select: {
        community_id: true,
        user_id: true,
      },
    });
  }

  async listCommunityPosts(range: AdminCommunitiesDashboardDateRange) {
    return prisma.community_post.findMany({
      orderBy: {
        createdAt: "desc",
      },
      where: {
        createdAt: createdAtWhere(range),
        deleted: false,
        status: "publicado",
        author: {
          active: true,
          deleted: false,
        },
        community: {
          deleted: false,
        },
      },
      select: {
        anonymous: true,
        author_id: true,
        community_id: true,
        content: true,
        createdAt: true,
        id: true,
        replies_count: true,
        status: true,
        title: true,
        author: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        community: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
  }

  async listMemberActivity(range: AdminCommunitiesDashboardDateRange) {
    const [posts, replies, votes, saves] = await Promise.all([
      prisma.community_post.findMany({
        where: {
          createdAt: createdAtWhere(range),
          deleted: false,
          status: "publicado",
          author: {
            active: true,
            deleted: false,
          },
          community: {
            deleted: false,
          },
        },
        select: {
          author_id: true,
          community_id: true,
        },
      }),
      prisma.post_reply.findMany({
        where: {
          createdAt: createdAtWhere(range),
          deleted: false,
          author: {
            active: true,
            deleted: false,
          },
          post: {
            deleted: false,
            status: "publicado",
            community: {
              deleted: false,
            },
          },
        },
        select: {
          author_id: true,
          post: {
            select: {
              community_id: true,
            },
          },
        },
      }),
      prisma.post_vote.findMany({
        where: {
          createdAt: createdAtWhere(range),
          deleted: false,
          user: {
            active: true,
            deleted: false,
          },
        },
        select: {
          user_id: true,
          post: {
            select: {
              community_id: true,
            },
          },
          reply: {
            select: {
              post: {
                select: {
                  community_id: true,
                },
              },
            },
          },
        },
      }),
      prisma.post_save.findMany({
        where: {
          createdAt: createdAtWhere(range),
          deleted: false,
          user: {
            active: true,
            deleted: false,
          },
          post: {
            deleted: false,
            status: "publicado",
            community: {
              deleted: false,
            },
          },
        },
        select: {
          user_id: true,
          post: {
            select: {
              community_id: true,
            },
          },
        },
      }),
    ]);

    const activity: MemberActivityRecord[] = [
      ...posts.map((post) => ({ community_id: post.community_id, user_id: post.author_id })),
      ...replies.map((reply) => ({
        community_id: reply.post.community_id,
        user_id: reply.author_id,
      })),
      ...votes.map((vote) => ({
        community_id: vote.post?.community_id ?? vote.reply?.post.community_id ?? null,
        user_id: vote.user_id,
      })),
      ...saves.map((save) => ({ community_id: save.post.community_id, user_id: save.user_id })),
    ];

    return activity;
  }

  async listPendingReports(range: AdminCommunitiesDashboardDateRange) {
    return prisma.post_report.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
      where: {
        createdAt: createdAtWhere(range),
        deleted: false,
        status: "pendente",
      },
      select: {
        createdAt: true,
        description: true,
        id: true,
        reason: true,
        status: true,
        target_id: true,
        target_type: true,
        post: {
          select: {
            content: true,
            title: true,
            community: {
              select: {
                name: true,
                slug: true,
              },
            },
          },
        },
        reply: {
          select: {
            content: true,
            title: true,
            post: {
              select: {
                title: true,
                community: {
                  select: {
                    name: true,
                    slug: true,
                  },
                },
              },
            },
          },
        },
        reporter: {
          select: {
            role: true,
          },
        },
      },
    });
  }

  async listPostReplies(range: AdminCommunitiesDashboardDateRange) {
    return prisma.post_reply.findMany({
      where: {
        createdAt: createdAtWhere(range),
        deleted: false,
        author: {
          active: true,
          deleted: false,
        },
        post: {
          deleted: false,
          status: "publicado",
          community: {
            deleted: false,
          },
        },
      },
      select: {
        author_id: true,
        createdAt: true,
        id: true,
        author: {
          select: {
            id: true,
            role: true,
          },
        },
        post: {
          select: {
            community_id: true,
          },
        },
      },
    });
  }
}
