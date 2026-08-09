"use client";
import { Eye } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { AdminCommunityIdentity } from "@/api/req/communities";
import { renderableImageSrc } from "@/lib/admin-media";
import { deriveCommunityVisualPalette } from "@/lib/community-visual";
import { toPublicFrontendHref } from "@/lib/public-frontend-url";

import { formatCountLabel, formatDate, initials } from "../modules/detail-support";

import { StatusBadge } from "./content-shared";

export const CommunityHeader = ({
  community,
  postsCount,
}: {
  community: AdminCommunityIdentity;
  postsCount: number;
}) => {
  const avatarSrc = renderableImageSrc(community.avatar_url);

  return (
    <div className="overflow-hidden">
      <div className="flex flex-col gap-5 p-5 md:flex-row md:items-start md:justify-between md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div
            className="relative grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-[1.6rem] text-2xl font-black text-primary-foreground"
            style={{
              background: deriveCommunityVisualPalette(community.visual_primary_color).primaryColor,
            }}
          >
            {avatarSrc ? (
              <Image
                alt={`Avatar da comunidade ${community.name}`}
                className="object-cover"
                fill
                sizes="96px"
                src={avatarSrc}
                unoptimized
              />
            ) : (
              initials(community.name)
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">
                {community.name}
              </h1>
              <StatusBadge tone={community.active ? "green" : "muted"}>
                {community.active ? "Ativa" : "Inativa"}
              </StatusBadge>
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              {community.description || "Comunidade sem descrição cadastrada."}
            </p>
            <p className="mt-3 text-xs font-bold text-muted">
              <span className="font-black">Criada em</span>{" "}
              <span>
                {formatDate(community.created_at)} •{" "}
                {formatCountLabel(community.members_count, "seguidor", "seguidores")}
              </span>{" "}
              <span aria-hidden>•</span>{" "}
              <span>{formatCountLabel(postsCount, "post", "posts")}</span>
            </p>
          </div>
        </div>
        {community.active ? (
          <Link
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-primary/45 bg-surface px-5 text-sm font-black text-primary shadow-control transition hover:bg-primary-soft"
            href={toPublicFrontendHref(`/comunidades/${community.slug}`)}
            rel="noreferrer"
            target="_blank"
          >
            <Eye aria-hidden className="h-4 w-4" />
            Ver comunidade
          </Link>
        ) : (
          <span className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border bg-surface-muted px-5 text-sm font-black text-muted">
            <Eye aria-hidden className="h-4 w-4" />
            Comunidade desativada
          </span>
        )}
      </div>
    </div>
  );
};
