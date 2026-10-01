import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import { AdminCommunityManageRepository } from "../../manage/repositories/AdminCommunityManageRepository";
import {
  mapPostContent,
  mapReplyContent,
  resolveContentPeriod,
} from "../../manage/use-cases/services/content";
import { buildContentMetricsMaps } from "../../manage/use-cases/services/content-analytics";
import type { IAdminGlobalContentDTO } from "../DTOs/IAdminGlobalContentDTO";
import { AdminGlobalContentRepository } from "../repositories/AdminGlobalContentRepository";

export const listContent = async (data: IAdminGlobalContentDTO): Promise<Resolve> => {
  const query = data.q;
  const period = resolveContentPeriod({ from: query.from, to: query.to, period: query.period });
  if (!period.success) return { status: 400, ...error(period.code, {}) };
  const repository = new AdminGlobalContentRepository();
  const limit = query.limit ?? 20;
  const result = await repository.list(query, period.range, query.page ?? 1, limit);
  const metrics = await buildContentMetricsMaps(
    new AdminCommunityManageRepository(),
    result.posts.map((item) => item.id),
    result.replies.map((item) => item.id),
  );
  const items = [
    ...result.posts.map((item) => ({
      ...mapPostContent(item.community, item, metrics),
      community: { id: item.community.id, name: item.community.name, slug: item.community.slug },
    })),
    ...result.replies.map((item) => ({
      ...mapReplyContent(item.post.community, item, metrics),
      community: {
        id: item.post.community.id,
        name: item.post.community.name,
        slug: item.post.community.slug,
      },
    })),
  ];
  const byId = new Map(
    items.map((item) => [`${item.type === "post" ? "post" : "reply"}:${item.content_id}`, item]),
  );
  return {
    status: 200,
    ...msg("index", {}),
    data: {
      data: result.ids.flatMap((item) => {
        const content = byId.get(`${item.type}:${item.id}`);
        return content ? [content] : [];
      }),
      count: result.count,
      pages: result.pages,
      page: result.page,
      per_page: limit,
      communities: await repository.listCommunities(),
    },
  };
};
