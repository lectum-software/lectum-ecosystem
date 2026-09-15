"use client";

import type { MouseEventHandler } from "react";
import type { CommunityMediaOverlayAction } from "@/components/community/community-media-frame";
import type { LectumShareSocialTarget } from "@/utils/lectum-share-target";

type SocialPreviewAuthor = {
  id: string;
  role?: string | null;
};

type SocialPreviewCurrentUser = {
  id?: string | null;
  role?: string | null;
};

export const canShowSocialVideoPreviewAction = ({
  author,
  currentUser,
  mediaType,
  mediaUrl,
}: {
  author: SocialPreviewAuthor;
  currentUser?: SocialPreviewCurrentUser | null;
  mediaType?: string | null;
  mediaUrl?: string | null;
}) =>
  Boolean(
    mediaUrl &&
      mediaType === "video" &&
      author.role === "psicologo" &&
      currentUser?.role === "psicologo" &&
      currentUser.id &&
      author.id === currentUser.id,
  );

const InstagramGlyph = () => (
  <svg aria-hidden="true" className="h-5 w-5" fill="none" focusable="false" viewBox="0 0 24 24">
    <rect
      height="16"
      rx="5"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      width="16"
      x="4"
      y="4"
    />
    <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="2" />
    <circle cx="17" cy="7" fill="currentColor" r="1.2" />
  </svg>
);

export const createSocialVideoPreviewOverlayAction = ({
  disabled,
  onOpen,
  target,
}: {
  disabled?: boolean;
  onOpen: (target: LectumShareSocialTarget) => void;
  target: LectumShareSocialTarget | null;
}): CommunityMediaOverlayAction | undefined => {
  if (!target) return undefined;

  const handleClick: MouseEventHandler<HTMLButtonElement> = () => onOpen(target);

  return {
    ariaLabel: "Abrir prévia para redes sociais",
    disabled,
    icon: <InstagramGlyph />,
    onClick: handleClick,
  };
};
