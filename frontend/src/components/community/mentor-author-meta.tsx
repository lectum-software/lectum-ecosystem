"use client";

import { useParams } from "next/navigation";
import type { ReactNode } from "react";
import { useCommunityTopMentors } from "@/api/callers/community";
import type { Community } from "@/api/generator/types/community";
import { mentorPositionForAuthor } from "@/utils/mentor-author-ranking";

export const MentorAuthorMeta = ({
  badge,
  authorId,
  community,
  typeLabel,
  date,
  children,
}: {
  badge?: string | null;
  authorId?: string;
  community?: Pick<Community, "slug" | "name" | "category">;
  typeLabel?: string | null;
  date: ReactNode;
  children: ReactNode;
}) => {
  const params = useParams<{ slug?: string }>();
  const slug = community?.slug ?? params?.slug;
  const ranking = useCommunityTopMentors(
    { community: slug, period: "all", limit: 5 },
    Boolean(slug && authorId),
    60_000,
  );
  const position = mentorPositionForAuthor(ranking.data?.data, authorId);
  const rank =
    slug && authorId
      ? position && position <= 3
        ? String(position)
        : undefined
      : badge?.match(/#([123])\b/)?.[1];
  const rankedCommunity = community ?? ranking.data?.community;
  const theme = rankedCommunity?.category?.trim();
  const communityName = rankedCommunity?.name;
  if (!rank) return <>{children}</>;

  return (
    <span className="block min-w-0 whitespace-normal">
      <span
        className="block leading-snug"
        title={communityName ? `Top ${rank} mentor na comunidade ${communityName}` : undefined}
      >
        {typeLabel ? <>{typeLabel} &bull; </> : null}
        Top {rank} mentor{" "}
        {theme
          ? `de ${theme}`
          : communityName
            ? `na comunidade ${communityName}`
            : "nesta comunidade"}
      </span>
      <span className="mt-0.5 block text-[10px] font-normal leading-snug">{date}</span>
    </span>
  );
};
