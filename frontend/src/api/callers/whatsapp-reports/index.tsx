"use client";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import keys from "@/api/cache/keys";
import * as api from "@/api/req/whatsapp-reports";

export function useWhatsappHistory(userId: string) {
  const client = useQueryClient();
  const history = useInfiniteQuery({
    queryKey: keys.whatsappReports.history(userId),
    initialPageParam: 0,
    queryFn: ({ pageParam }) => api.getWhatsappHistory(pageParam),
    getNextPageParam: (last) => last.next_page ?? undefined,
    enabled: Boolean(userId),
    retry: false,
  });
  const save = useMutation({
    mutationFn: ({ start, count }: { start: string; count: number }) =>
      api.saveWhatsappWeek(start, count),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: keys.whatsappReports.root(userId) });
      await client.invalidateQueries({ queryKey: keys.notification.root() });
      await client.invalidateQueries({ queryKey: keys.psychologistAnalytics.root() });
    },
  });
  return { history, save };
}

export function useWhatsappReports(userId: string, explicitId: string | null, enabled: boolean) {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["whatsapp_reports", userId, explicitId ?? "latest"],
    queryFn: () => (explicitId ? api.getWhatsappReport(explicitId) : api.latestWhatsappReport()),
    enabled,
    retry: false,
    staleTime: 0,
    refetchInterval: enabled && !explicitId ? 60_000 : false,
  });
  const open = useMutation({
    mutationFn: ({ id, automatic }: { id: string; automatic: boolean }) =>
      api.openWhatsappReport(id, automatic),
    onSuccess: async (report) => {
      if (report?.editable === false)
        await client.invalidateQueries({ queryKey: keys.notification.root() });
    },
  });
  const answer = useMutation({
    mutationFn: ({ id, count }: { id: string; count: number }) =>
      api.answerWhatsappReport(id, count),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["whatsapp_reports", userId] });
      await client.invalidateQueries({ queryKey: keys.notification.root() });
      await client.invalidateQueries({ queryKey: keys.psychologistAnalytics.root() });
    },
  });
  return { query, open, answer };
}
