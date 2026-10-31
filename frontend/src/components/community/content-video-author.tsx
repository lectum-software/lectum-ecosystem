"use client";

import Link from "next/link";
import type { CommunityAuthor } from "@/api/generator/types/community";
import { formatExperienceLabel } from "@/app/app/psychologist/[id]/modules/support";
import { VerifiedBadgeIcon } from "@/components/ui/verified-badge";
import { getCommunityAuthorDisplayName } from "@/utils/community-display";
import styles from "./content-video-viewer.module.css";
import { FeedFavoriteButton } from "./feed-favorite-button";

export const ContentVideoAuthor = ({
  author,
  onClose,
}: {
  author: CommunityAuthor;
  onClose: () => void;
}) => (
  <>
    <div className={styles.author}>
      <Link className={styles.name} href={`/psicologos/${author.id}`} onNavigate={onClose}>
        {getCommunityAuthorDisplayName(author)}
      </Link>
      {/* Keep the final name word attached to its inline controls. */}
      {"\u2060"}
      <span className={styles.authorActions}>
        {author.verified ? (
          <VerifiedBadgeIcon className={styles.badge} aria-label="Perfil verificado" />
        ) : null}
        <FeedFavoriteButton author={author} />
      </span>
    </div>
    <div className={styles.role}>
      {author.type_label}
      {author.role === "psicologo" &&
      author.show_experience_tag === true &&
      typeof author.formation_years === "number" &&
      Number.isInteger(author.formation_years) &&
      author.formation_years > 0
        ? ` • ${formatExperienceLabel(author.formation_years)}`
        : null}
    </div>
  </>
);
