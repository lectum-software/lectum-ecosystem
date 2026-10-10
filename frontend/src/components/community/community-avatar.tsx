"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { getCommunityInitials } from "@/utils/community-display";
import { isPublicMediaUrl, resolvePublicMediaUrl } from "@/utils/media";

export const CommunityAvatar = ({
  avatarUrl,
  className,
  name,
  sizes,
}: {
  avatarUrl?: string | null;
  className?: string;
  name: string;
  sizes: string;
}) => {
  const imageUrl = resolvePublicMediaUrl(avatarUrl);
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const shouldShowImage = Boolean(imageUrl && imageUrl !== failedImageUrl);

  return (
    <span className={cn("relative grid shrink-0 place-items-center overflow-hidden", className)}>
      {shouldShowImage && imageUrl ? (
        <Image
          alt={`Avatar da comunidade ${name}`}
          className="object-cover"
          draggable={false}
          fill
          onError={() => setFailedImageUrl(imageUrl)}
          sizes={sizes}
          src={imageUrl}
          unoptimized={isPublicMediaUrl(avatarUrl)}
        />
      ) : (
        getCommunityInitials(name)
      )}
    </span>
  );
};
