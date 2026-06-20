"use client";

import { Check } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { COMMUNITY_FEED_SLUG, DEFAULT_COMMUNITY_FEED_HREF } from "@/utils/community";

const normalizeParam = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) return value[0];

  return value;
};

const LAST_CREATED_POST_HREF_KEY = "lectum:last-created-post-href";

type CommunityPostSuccessLogicProps = {
  asModalSlot?: boolean;
};

export const CommunityPostSuccessLogic = ({
  asModalSlot = false,
}: CommunityPostSuccessLogicProps) => {
  const params = useParams<{ slug?: string | string[] }>();
  const searchParams = useSearchParams();
  const slug = normalizeParam(params?.slug);
  const postId = searchParams.get("postId")?.trim() || null;
  const communitySlug = searchParams.get("communitySlug")?.trim() || null;
  const [publicationHref] = useState(() => {
    const storedPublicationHref =
      typeof window === "undefined"
        ? null
        : window.sessionStorage.getItem(LAST_CREATED_POST_HREF_KEY);
    const publicationSlug = communitySlug || (slug && slug !== COMMUNITY_FEED_SLUG ? slug : null);

    if (publicationSlug && postId) {
      return `/app/community/${publicationSlug}/post/${postId}`;
    }

    if (storedPublicationHref) {
      return storedPublicationHref;
    }

    return publicationSlug ? `/app/community/${publicationSlug}` : DEFAULT_COMMUNITY_FEED_HREF;
  });

  const handleViewPublication = () => {
    window.location.assign(publicationHref);
  };

  const modal = (
    <div
      className={cn(
        "fixed inset-0 z-[80] flex items-center justify-center px-5 py-8 text-center text-[#111827] transition-opacity duration-200 ease-out dark:text-foreground",
        asModalSlot
          ? "bg-slate-950/35 backdrop-blur-[8px] supports-[backdrop-filter]:bg-slate-950/35"
          : "bg-[#F5F7FA] dark:bg-background",
      )}
    >
      <section
        aria-labelledby="post-success-title"
        aria-modal="true"
        className="w-full max-w-[390px] rounded-[32px] border border-border/80 bg-white px-6 pt-10 pb-6 shadow-[0_28px_80px_rgba(15,23,42,0.22)] dark:bg-surface"
        role="dialog"
      >
        <div className="mx-auto mb-7 grid justify-items-center">
          <div className="relative grid h-[104px] w-[104px] place-items-center rounded-full bg-[#EAF4FF]">
            <span className="absolute -right-1 top-3 h-4 w-4 rounded-full bg-[#EAF4FF]" />
            <span className="absolute -left-4 bottom-7 h-7 w-7 rounded-full bg-[#F1F7FF]" />
            <span className="grid h-[76px] w-[76px] place-items-center rounded-full bg-[#308CE8] text-white shadow-[0_18px_32px_rgba(48,140,232,0.24)]">
              <Check className="h-9 w-9 stroke-[2.8]" aria-hidden="true" />
            </span>
          </div>
        </div>

        <h1 className="mb-4 text-[22px] font-extrabold tracking-[-0.02em]" id="post-success-title">
          Post publicado!
        </h1>
        <p className="mx-auto max-w-[300px] text-base leading-6 text-[#64748B]">
          {"Seu post foi compartilhado e logo poder\u00e1 receber intera\u00e7\u00f5es!"}
        </p>

        <Button
          className="mt-8 h-[54px] w-full rounded-full bg-[#308CE8] text-base font-semibold shadow-[0_12px_24px_rgba(48,140,232,0.2)] hover:bg-[#2579CF]"
          onClick={handleViewPublication}
          type="button"
        >
          Ver minha publicação
        </Button>
      </section>
    </div>
  );

  if (asModalSlot) {
    return modal;
  }

  return (
    <PrivateTemplate
      contentClassName="max-w-none bg-[#F5F7FA] px-0 py-0 dark:bg-background"
      showMobileNavigation={false}
      showNavigation={false}
    >
      {modal}
    </PrivateTemplate>
  );
};
