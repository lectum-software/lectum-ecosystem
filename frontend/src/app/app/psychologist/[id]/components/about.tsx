"use client";

import {
  BriefcaseBusiness,
  GraduationCap,
  Languages,
  MapPin,
  MessageSquareText,
  UsersRound,
} from "lucide-react";
import { type MouseEvent as ReactMouseEvent, useLayoutEffect, useRef, useState } from "react";
import type {
  DirectoryPsychologistProfile,
  DirectoryPsychologistProfilePost,
  DirectoryPsychologistProfileReview,
  DirectoryReviewSummary,
} from "@/api/generator/types/directory";
import type { PostListPost } from "@/api/generator/types/posts";
import { cn } from "@/lib/utils";

import {
  formatAttendanceLabel,
  formatList,
  PROFILE_ABOUT_LESS_LABEL,
  PROFILE_ABOUT_MAX_LINES,
  PROFILE_ABOUT_MORE_LABEL,
  type ProfileTab,
  type ProfileTabNavigationOptions,
  translateLanguage,
  translateTargetAudience,
} from "../modules/support";
import { PresentationVideo } from "./presentation-video";
import { PostsPreviewSection } from "./publications";

import { ReviewsPreviewSection } from "./reviews";
import { ProfileChipList, ProfileInfoCard, ProfileSectionCard } from "./shared";

export const AboutContactInfoBlock = () => (
  <div
    className="mt-4 rounded-[18px] border border-border bg-surface-muted/90 px-4 py-3.5 shadow-lectum-soft"
    data-about-contact-block="true"
  >
    <p className="text-[13.5px] font-extrabold leading-tight tracking-[-0.015em] text-foreground">
      Quer falar com o psicólogo?
    </p>
    <p className="mt-1.5 text-[12.75px] font-medium leading-[1.55] text-muted">
      Para consultar agenda, valores e informações do atendimento, chame o psicólogo no WhatsApp.
    </p>
  </div>
);

export const ExpandableAboutText = ({
  containerClassName,
  moreClassName,
  text,
  textClassName,
}: {
  containerClassName?: string;
  moreClassName?: string;
  text: string;
  textClassName?: string;
}) => {
  const [expanded, setExpanded] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLParagraphElement>(null);
  const content = text.trim();
  const paragraphClassName = cn(
    "whitespace-pre-line text-[14px] font-medium leading-[1.65] text-muted dark:text-foreground/80 sm:text-[14.5px]",
    textClassName,
  );

  useLayoutEffect(() => {
    const containerNode = containerRef.current;
    const measureNode = measureRef.current;

    if (!containerNode || !measureNode) return;

    let animationFrame = 0;
    let cancelled = false;

    const lineHeightPx = () => {
      const styles = window.getComputedStyle(measureNode);
      const parsedLineHeight = Number.parseFloat(styles.lineHeight);

      if (Number.isFinite(parsedLineHeight)) return parsedLineHeight;

      const parsedFontSize = Number.parseFloat(styles.fontSize);
      return Number.isFinite(parsedFontSize) ? parsedFontSize * 1.6 : 22;
    };

    const measure = () => {
      if (cancelled) return;

      const availableWidth = containerNode.getBoundingClientRect().width;
      const normalizedText = content.trimEnd();

      if (availableWidth <= 0 || normalizedText.length === 0) {
        setTruncated(false);
        return;
      }

      measureNode.style.width = `${availableWidth}px`;
      measureNode.textContent = normalizedText;

      setTruncated(measureNode.scrollHeight > lineHeightPx() * PROFILE_ABOUT_MAX_LINES + 1);
    };

    const scheduleMeasure = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(measure);
    };

    scheduleMeasure();

    const resizeObserver = new ResizeObserver(scheduleMeasure);
    resizeObserver.observe(containerNode);

    if ("fonts" in document) {
      void document.fonts.ready.then(scheduleMeasure);
    }

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
    };
  }, [content]);

  const toggleExpanded = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setExpanded((previous) => !previous);
  };
  const collapsedTextStyle =
    truncated && !expanded
      ? {
          WebkitBoxOrient: "vertical" as const,
          WebkitLineClamp: PROFILE_ABOUT_MAX_LINES,
          display: "-webkit-box",
          overflow: "hidden",
        }
      : undefined;

  return (
    <div
      className={cn("relative mt-2.5 min-w-0 max-w-full", containerClassName)}
      ref={containerRef}
    >
      <p className={paragraphClassName} style={collapsedTextStyle}>
        {content}
        {truncated && expanded ? (
          <>
            {" "}
            <button
              aria-expanded={expanded}
              className={cn(
                "pointer-events-auto inline cursor-pointer rounded-none border-0 bg-transparent p-0 align-baseline font-semibold text-primary/85 [font-size:inherit] [line-height:inherit] hover:text-primary-hover",
                moreClassName,
              )}
              onClick={toggleExpanded}
              type="button"
            >
              {PROFILE_ABOUT_LESS_LABEL}
            </button>
          </>
        ) : null}
      </p>
      {truncated && !expanded ? (
        <button
          aria-expanded={expanded}
          className={cn(
            "absolute right-0 bottom-0 cursor-pointer rounded-none border-0 bg-surface py-0 pr-0 pl-1 align-baseline font-semibold text-primary/85 [font-size:inherit] [line-height:inherit] hover:text-primary-hover dark:bg-surface",
            moreClassName,
          )}
          onClick={toggleExpanded}
          type="button"
        >
          {PROFILE_ABOUT_MORE_LABEL}
        </button>
      ) : null}
      <p
        aria-hidden="true"
        className={cn(
          paragraphClassName,
          "pointer-events-none invisible absolute inset-x-0 top-0 opacity-0",
        )}
        ref={measureRef}
      >
        {content}
      </p>
    </div>
  );
};

export const FormationSection = ({ profile }: { profile: DirectoryPsychologistProfile }) => {
  const formations = profile.academic_formations ?? [];
  const hasAnyFormation = formations.length > 0;

  return (
    <ProfileSectionCard title="Formação & Títulos">
      {hasAnyFormation ? (
        <div className="mt-3 grid gap-2.5">
          {formations.map((formation, index) => {
            const institutionLine = formatList(
              [formation.institution || "", formation.graduation_year || ""],
              "Instituição e data não informadas",
            );

            return (
              <article
                className="box-border flex items-start gap-3 rounded-[16px] border border-border bg-surface-muted px-3.5 py-3"
                key={`${formation.title || "formacao"}-${formation.institution || index}`}
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[14px] bg-surface text-primary-hover">
                  <GraduationCap className="h-[17px] w-[17px]" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-[13.5px] font-extrabold leading-[1.35] tracking-[-0.01em] text-foreground">
                    {formation.title || "Título não informado"}
                  </p>
                  <p className="mt-1 text-[12.5px] font-medium leading-[1.45] text-muted">
                    {institutionLine}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="mt-2.5 text-[13px] leading-[1.6] text-muted">
          Este profissional ainda não cadastrou formação e títulos.
        </p>
      )}
    </ProfileSectionCard>
  );
};

export const AboutTab = ({
  canReviewProfile,
  canInteractPosts,
  onTabChange,
  onOpenSocialVideoPreview,
  onSharePost,
  postsPreview,
  profile,
  reviewsPreview,
}: {
  canReviewProfile: boolean;
  canInteractPosts: boolean;
  onTabChange: (tab: ProfileTab, options?: ProfileTabNavigationOptions) => void;
  onOpenSocialVideoPreview?: (post: PostListPost, replyId?: string | null) => void;
  onSharePost: (post: PostListPost) => void;
  postsPreview: {
    isError: boolean;
    isLoading: boolean;
    highlightedPublication?: DirectoryPsychologistProfilePost | null;
    posts: DirectoryPsychologistProfilePost[];
    total: number;
  };
  profile: DirectoryPsychologistProfile;
  reviewsPreview: {
    isError: boolean;
    isLoading: boolean;
    highlightedReview?: DirectoryPsychologistProfileReview | null;
    reviews: DirectoryPsychologistProfileReview[];
    summary: DirectoryReviewSummary;
  };
}) => {
  const bioText = profile.bio?.trim() ?? "";
  const serviceText = formatList(
    profile.services.map((item) => item.name),
    "Serviços não informados.",
  );
  const approachText = formatList(
    profile.approaches.map((item) => item.name),
    "Abordagens não informadas.",
  );
  const targetText = formatList(
    (profile.target_audience ?? []).map(translateTargetAudience),
    "Público atendido não informado.",
  );
  const languageText = formatList(
    profile.languages.map(translateLanguage),
    "Idiomas não informados.",
  );
  const modalityText = formatList([formatAttendanceLabel(profile)], "Modalidade não informada.");
  return (
    <div className="grid gap-3.5 bg-surface-muted px-3 pt-3.5 pb-1 dark:bg-background sm:px-4 sm:pt-4">
      <ProfileSectionCard title="Sobre">
        {bioText ? <ExpandableAboutText text={bioText} /> : null}
        <PresentationVideo profile={profile} />
        {profile.whatsapp_url ? <AboutContactInfoBlock /> : null}
      </ProfileSectionCard>

      <ProfileSectionCard title="Especialidades">
        <ProfileChipList
          emptyMessage="Este profissional ainda não informou especialidades públicas."
          items={profile.specialties}
        />
      </ProfileSectionCard>

      <ReviewsPreviewSection
        canReviewProfile={canReviewProfile}
        highlightedReview={reviewsPreview.highlightedReview}
        isVerifiedSubscriber={profile.verified}
        isError={reviewsPreview.isError}
        isLoading={reviewsPreview.isLoading}
        onViewAll={() => onTabChange("avaliacoes", { scrollToContentTop: true })}
        psychologistId={profile.id}
        reviews={reviewsPreview.reviews}
        summary={reviewsPreview.summary}
      />

      <ProfileSectionCard title="Atendimento" className="mb-0">
        <div className="mt-3 grid gap-2.5">
          <ProfileInfoCard compact icon={MapPin} label="Modalidade" value={modalityText} />
          <ProfileInfoCard
            compact
            icon={MessageSquareText}
            label="Abordagens"
            value={approachText}
          />
          <ProfileInfoCard compact icon={BriefcaseBusiness} label="Serviços" value={serviceText} />
          <ProfileInfoCard compact icon={UsersRound} label="Público atendido" value={targetText} />
          <ProfileInfoCard compact icon={Languages} label="Idiomas" value={languageText} />
        </div>
      </ProfileSectionCard>

      <FormationSection profile={profile} />

      <PostsPreviewSection
        canInteract={canInteractPosts}
        highlightedPublication={postsPreview.highlightedPublication}
        isError={postsPreview.isError}
        isLoading={postsPreview.isLoading}
        onOpenSocialVideoPreview={onOpenSocialVideoPreview}
        onShare={onSharePost}
        onViewAll={() => onTabChange("publicacoes", { scrollToContentTop: true })}
        posts={postsPreview.posts}
        total={postsPreview.total}
      />
    </div>
  );
};
