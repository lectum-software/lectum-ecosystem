import { useQuery } from "@tanstack/react-query";
import { adminCommunitiesKeys } from "@/api/cache/keys";
import {
  type AdminGlobalContentQuery,
  getAdminGlobalContent,
} from "@/api/req/communities/global-content";

export const useAdminGlobalContent = (query: AdminGlobalContentQuery) =>
  useQuery({
    queryKey: adminCommunitiesKeys.globalContent(query),
    queryFn: () => getAdminGlobalContent(query),
  });
