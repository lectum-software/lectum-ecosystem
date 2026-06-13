"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { COMMUNITY_FEED_SLUG, DEFAULT_COMMUNITY_FEED_HREF } from "@/utils/community";

const normalizeParam = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) return value[0];

  return value;
};

export const CommunityPostSuccessLogic = () => {
  const params = useParams<{ slug?: string | string[] }>();
  const slug = normalizeParam(params?.slug);
  const publicationHref =
    slug && slug !== COMMUNITY_FEED_SLUG ? `/app/community/${slug}` : DEFAULT_COMMUNITY_FEED_HREF;

  return (
    <PrivateTemplate
      contentClassName="max-w-none bg-white px-0 py-0 dark:bg-background"
      showMobileNavigation={false}
      showNavigation={false}
    >
      <section className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col bg-white px-[18px] text-center text-[#111827] dark:bg-background dark:text-foreground">
        <div className="flex flex-1 flex-col items-center justify-center pt-12 pb-28">
          <div className="relative mb-9 grid h-[112px] w-[112px] place-items-center rounded-full bg-[#EAF4FF]">
            <span className="absolute -right-2 top-3 h-4 w-4 rounded-full bg-[#EAF4FF]" />
            <span className="absolute -left-5 bottom-7 h-7 w-7 rounded-full bg-[#F1F7FF]" />
            <span className="grid h-[80px] w-[80px] place-items-center rounded-full bg-[#308CE8] text-white shadow-[0_18px_32px_rgba(48,140,232,0.24)]">
              <Check className="h-10 w-10 stroke-[2.8]" aria-hidden="true" />
            </span>
          </div>
          <h1 className="mb-5 text-[22px] font-extrabold tracking-[-0.02em]">Post publicado!</h1>
          <p className="max-w-[310px] text-base leading-6 text-[#64748B]">
            Seu post foi compartilhado e logo poderá receber interações!
          </p>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-10 mx-auto w-full max-w-[430px] bg-white px-[18px] pt-3 pb-[max(18px,env(safe-area-inset-bottom))] dark:bg-background">
          <Button
            asChild
            className="h-[56px] w-full rounded-full bg-[#308CE8] text-base font-semibold shadow-[0_12px_24px_rgba(48,140,232,0.2)] hover:bg-[#2579CF]"
          >
            <Link href={publicationHref}>Ver minha publicação</Link>
          </Button>
        </div>
      </section>
    </PrivateTemplate>
  );
};
