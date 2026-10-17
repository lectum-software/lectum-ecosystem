"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import keys from "@/api/cache/keys";
import * as api from "@/api/req/whatsapp-reports";

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
