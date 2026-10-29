"use client";

import Link from "next/link";
import type { CommunityAuthor } from "@/api/generator/types/community";
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
      <Link className={styles.name} href={`/psicologos/${author.id}`} onClick={onClose}>
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
    <div className={styles.role}>{author.type_label}</div>
  </>
);
