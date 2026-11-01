"use client";

import { ChevronDown, FileText } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import type {
  DirectoryPsychologistParticipationCommunity,
  DirectoryPsychologistParticipationSummary,
} from "@/api/generator/types/directory";
import { isPublicMediaUrl, resolvePublicMediaUrl } from "@/utils/media";
import { getInitials } from "../modules/support";
import styles from "./publications-activity-summary.module.css";

const mentorRank = (community: DirectoryPsychologistParticipationCommunity) =>
  community.badge && community.position && community.position >= 1 && community.position <= 3
    ? community.position
    : null;

const Medal = ({ rank }: { rank: number }) => (
  <Image
    alt=""
    aria-hidden="true"
    width={24}
    height={30}
    src={`/images/community/top-mentor/${["gold", "silver", "bronze"][rank - 1]}.svg?v=ribbons-2`}
  />
);

const activityText = (posts: number, replies: number) =>
  [
    posts > 0 ? `${posts} ${posts === 1 ? "post" : "posts"}` : null,
    replies > 0 ? `${replies} ${replies === 1 ? "resposta" : "respostas"}` : null,
  ]
    .filter(Boolean)
    .join(" e ");

export const PublicationsActivitySummary = ({
  summary,
}: {
  summary: DirectoryPsychologistParticipationSummary;
}) => {
  const [expanded, setExpanded] = useState(false);
  const [listHeight, setListHeight] = useState<number>();
  const listRef = useRef<HTMLUListElement>(null);
  const detailsId = useId();
  const communities = useMemo(
    () =>
      [...(summary.participation_communities ?? summary.top_mentor_communities ?? [])].sort(
        (a, b) => (mentorRank(a) ?? 4) - (mentorRank(b) ?? 4),
      ),
    [summary.participation_communities, summary.top_mentor_communities],
  );
  const medals = [...new Set(communities.map(mentorRank).filter((rank) => rank !== null))];
  const totalActivity = activityText(summary.posts_count, summary.replies_count);
  const scrollable = communities.length > 3;

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!expanded || !scrollable || !list) return;
    // Measure whole rows, including wrapped names, rather than clipping at a fixed height.
    const measure = () => {
      const rows = [...list.children].slice(0, Math.min(communities.length, 3));
      setListHeight(rows.reduce((height, row) => height + row.getBoundingClientRect().height, 0));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    for (const row of [...list.children].slice(0, 3)) observer.observe(row);
    return () => observer.disconnect();
  }, [expanded, scrollable, communities]);

  return (
    <section className={styles.participation} data-publications-summary="true">
      <button
        className={styles.disclosure}
        type="button"
        aria-expanded={expanded}
        aria-controls={detailsId}
        disabled={!communities.length}
        onClick={() => setExpanded((value) => !value)}
      >
        {medals.length ? (
          <span
            className={styles.medals}
            aria-hidden="true"
            style={{ width: 24 + (medals.length - 1) * 16 }}
          >
            {medals.map((rank, index) => (
              <span key={rank} style={{ left: index * 16, zIndex: medals.length - index }}>
                <Medal rank={rank} />
              </span>
            ))}
          </span>
        ) : (
          <span className={styles.authority}>
            <FileText size={20} aria-hidden="true" />
          </span>
        )}
        <span className={styles.summary}>
          <span className={`${styles.title} dark:text-muted`}>
            {communities.length
              ? `Participa em ${communities.length} ${communities.length === 1 ? "comunidade" : "comunidades"}`
              : "Ainda sem participação em comunidades"}
          </span>
          {totalActivity ? (
            <span className={styles.description}>{totalActivity} no total</span>
          ) : null}
        </span>
        {communities.length ? (
          <ChevronDown
            size={18}
            aria-hidden="true"
            className={styles.chevron}
            style={{ transform: expanded ? "rotate(180deg)" : undefined }}
          />
        ) : null}
      </button>
      <div id={detailsId} hidden={!expanded} className={styles.details}>
        <section
          className={styles.scroll}
          style={{ maxHeight: scrollable ? listHeight : undefined }}
          tabIndex={scrollable ? 0 : undefined}
          aria-label="Comunidades em que participa"
        >
          <ul ref={listRef} className={styles.communities}>
            {communities.map((community) => {
              const avatar = resolvePublicMediaUrl(community.avatar_url);
              const rank = mentorRank(community);
              const activity =
                typeof community.posts_count === "number" &&
                typeof community.replies_count === "number"
                  ? activityText(community.posts_count, community.replies_count)
                  : "";
              return (
                <li key={community.id}>
                  <Link href={`/comunidades/${community.slug}`} className={styles.community}>
                    <span className={styles.avatar}>
                      <span
                        className={styles.avatarImage}
                        style={{
                          background: community.visual_soft_color || "var(--lectum-primary-soft)",
                          color: community.visual_text_color || "var(--lectum-primary)",
                        }}
                      >
                        {avatar ? (
                          <Image
                            alt=""
                            fill
                            sizes="48px"
                            src={avatar}
                            unoptimized={isPublicMediaUrl(community.avatar_url)}
                          />
                        ) : (
                          getInitials(community.name)
                        )}
                      </span>
                      {rank ? (
                        <span className={styles.avatarMedal}>
                          <Medal rank={rank} />
                        </span>
                      ) : null}
                    </span>
                    <span className={styles.info}>
                      <span className={styles.name}>{community.name}</span>
                      {activity ? <span className={styles.counts}>{activity}</span> : null}
                      {rank ? (
                        <span className={styles.mentor}>Top {rank} Mentor nesta comunidade</span>
                      ) : null}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </section>
  );
};
