import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminSettingsKeys } from "@/api/cache/keys";
import {
  createAdminPriceVersion,
  getAdminPriceOperations,
  getAdminPriceVersions,
  linkAdminPriceVersion,
  resumeAdminPriceOperation,
  setAdminOfferEnabled,
} from "@/api/req/settings/subscription-prices";

export const useAdminPriceVersions = (enabled: boolean) =>
  useInfiniteQuery({
    queryKey: adminSettingsKeys.subscriptionPriceVersions(),
    queryFn: ({ pageParam }) => getAdminPriceVersions(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.next_cursor ?? undefined,
    enabled,
    retry: false,
  });
export const useAdminPriceOperations = (enabled: boolean) =>
  useInfiniteQuery({
    queryKey: adminSettingsKeys.subscriptionPriceOperations(),
    queryFn: ({ pageParam }) => getAdminPriceOperations(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.next_cursor ?? undefined,
    enabled,
    retry: false,
  });

export const useAdminPriceActions = () => {
  const client = useQueryClient();
  const refresh = () =>
    client.invalidateQueries({ queryKey: adminSettingsKeys.subscriptionPlan() });
  const create = useMutation({
    mutationFn: createAdminPriceVersion,
    retry: false,
    onSettled: refresh,
  });
  const resume = useMutation({
    mutationFn: resumeAdminPriceOperation,
    retry: false,
    onSettled: refresh,
  });
  const link = useMutation({ mutationFn: linkAdminPriceVersion, retry: false, onSettled: refresh });
  const toggle = useMutation({
    mutationFn: setAdminOfferEnabled,
    retry: false,
    onSettled: refresh,
  });
  return {
    create,
    resume,
    link,
    toggle,
    busy: create.isPending || resume.isPending || link.isPending || toggle.isPending,
  };
};
