import { adminApi } from "@/api/client";
import { resolveApiData } from "@/api/handle";
import type { ApiResponse } from "@/api/types";
import { cleanGlobalContentParams } from "./params";
import type { AdminCommunityContentItem, AdminCommunityContentQuery } from "./types/content";

export type AdminGlobalContentQuery = Pick<
  AdminCommunityContentQuery,
  "from" | "to" | "period" | "page" | "limit" | "q"
> & {
  community?: string;
  psychologist?: string;
  type?: "all" | "posts" | "replies";
  sort?: "recent" | "oldest";
};
export type ContentCommunity = { id: string; name: string; slug: string };
export type AdminGlobalContentItem = AdminCommunityContentItem & { community: ContentCommunity };
export type AdminGlobalContent = {
  data: AdminGlobalContentItem[];
  count: number;
  page: number;
  pages: number;
  per_page: number;
  communities: ContentCommunity[];
};

export const getAdminGlobalContent = async (query: AdminGlobalContentQuery) => {
  const response = await adminApi.get<ApiResponse<AdminGlobalContent>>(
    "/api/admin/private/communities/content",
    { params: cleanGlobalContentParams(query) },
  );
  return resolveApiData(response.data);
};
