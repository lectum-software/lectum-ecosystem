import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { getPublicPostData } from "@/lib/public-post-data";

export async function PublicPostHydration({
  id,
  slug,
  replyId,
  children,
}: {
  id: string;
  slug: string;
  replyId?: string;
  children: ReactNode;
}) {
  const data = await getPublicPostData(id, slug, replyId);
  const client = new QueryClient();
  for (const query of data?.queries ?? []) {
    // Public interaction flags must be refreshed with the browser's session.
    client.setQueryData(query.queryKey, query.data, { updatedAt: 1 });
  }
  return <HydrationBoundary state={dehydrate(client)}>{children}</HydrationBoundary>;
}
