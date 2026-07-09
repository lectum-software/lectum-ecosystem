import { useQuery } from "@tanstack/react-query";
import { adminCommunitiesKeys } from "@/api/cache/keys";
import {
  type CommunitiesDashboardQuery,
  getAdminCommunitiesDashboard,
} from "@/api/req/communities";

export const useAdminCommunitiesDashboard = (
  input: CommunitiesDashboardQuery,
  options: { enabled?: boolean } = {},
) =>
  useQuery({
    enabled: options.enabled ?? true,
    queryFn: () => getAdminCommunitiesDashboard(input),
    queryKey: adminCommunitiesKeys.dashboard(input),
  });
