import type { Request } from "express";
import type { AdminCommunityContentQuery } from "../../manage/DTOs/IAdminCommunityManageDTO";

export type AdminGlobalContentQuery = Pick<
  AdminCommunityContentQuery,
  "from" | "to" | "period" | "page" | "limit" | "q"
> & {
  community?: string;
  psychologist?: string;
  type?: "all" | "posts" | "replies";
  sort?: "recent" | "oldest";
};

export interface IAdminGlobalContentDTO extends Request {
  q: AdminGlobalContentQuery;
}
