"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useAdminCommunityDetail } from "@/api/callers/communities";
import { resolveApiError } from "@/api/handle";

import { parseCommunityTab } from "./modules/detail-support";

import { DetailContent, ErrorState, LoadingState } from "./views/detail-content";

export const AdminCommunityDetailClient = ({ slug }: { slug: string }) => {
  const query = useAdminCommunityDetail(slug);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = parseCommunityTab(searchParams.get("tab"));
  const errorMessage = query.error ? resolveApiError(query.error) : null;

  return (
    <main className="space-y-5">
      {query.isLoading ? <LoadingState /> : null}
      {query.isError && errorMessage ? (
        <ErrorState message={errorMessage} onRetry={() => void query.refetch()} />
      ) : null}
      {query.data ? (
        <DetailContent activeTab={activeTab} detail={query.data} pathname={pathname} slug={slug} />
      ) : null}
    </main>
  );
};
