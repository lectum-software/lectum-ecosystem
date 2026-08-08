"use client";

import { UserX } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getCommunityInitials as getInitials } from "@/utils/community-display";
import { isPublicMediaUrl, resolvePublicMediaUrl } from "@/utils/media";

export const AuthorAvatar = ({
  anonymous,
  avatar,
  href,
  name,
  size = "md",
}: {
  anonymous?: boolean;
  avatar: string | null;
  href?: string;
  name: string;
  size?: "md" | "lg";
}) => {
  const sizeClass = size === "lg" ? "h-10 w-10" : "h-9 w-9";
  const imageSize = size === "lg" ? "40px" : "36px";

  if (anonymous) {
    return (
      <span
        className={cn(
          "grid shrink-0 place-items-center rounded-full bg-surface-muted text-muted ring-2 ring-border",
          sizeClass,
        )}
      >
        <UserX className="h-5 w-5" aria-hidden="true" />
      </span>
    );
  }

  const avatarSrc = resolvePublicMediaUrl(avatar);

  const avatarNode = (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-primary-soft text-xs font-black text-primary ring-2 ring-background",
        sizeClass,
      )}
    >
      {avatarSrc ? (
        <Image
          alt={name}
          className="object-cover"
          fill
          sizes={imageSize}
          src={avatarSrc}
          unoptimized={isPublicMediaUrl(avatar)}
        />
      ) : (
        getInitials(name)
      )}
    </span>
  );

  if (!href) return avatarNode;

  return (
    <Link
      aria-label={`Abrir perfil de ${name}`}
      className="shrink-0 cursor-pointer rounded-full no-underline transition hover:brightness-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 active:scale-[0.98]"
      href={href}
    >
      {avatarNode}
    </Link>
  );
};
