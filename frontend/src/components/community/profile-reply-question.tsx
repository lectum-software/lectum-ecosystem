"use client";

import { useState } from "react";
import { InlineExpandableText } from "./inline-expandable-text";

// Same placement and palette as LectumSharePreviewArt, without export branding.
export const ProfileReplyVideoQuestion = ({ title }: { title: string }) => (
  <div
    className="absolute top-[13%] left-[10.2%] z-[2] flex max-h-[32%] w-[79.7%] flex-col overflow-hidden rounded-xl text-center"
    data-profile-video-question
  >
    <div className="shrink-0 bg-primary px-3 py-1.5 text-sm font-bold leading-5 text-primary-foreground">
      Pergunta
    </div>
    <section
      aria-label="Pergunta respondida no vídeo"
      className="min-h-0 overflow-y-auto overscroll-contain bg-media-foreground/95 px-4 py-4 text-media-background [overflow-wrap:anywhere] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
      // biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard users must be able to scroll long questions.
      tabIndex={0}
    >
      <h3 className="text-base font-bold leading-[1.24]">{title}</h3>
    </section>
  </div>
);

export const ProfileReplyQuestion = ({ title, content }: { title: string; content: string }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mb-4 grid min-w-0 gap-2 [overflow-wrap:anywhere]" data-profile-reply-question>
      <h3 className="text-[1.32rem] font-black leading-[1.18] text-foreground">{title}</h3>
      {content.trim() ? (
        <InlineExpandableText
          className="text-sm leading-6 text-muted"
          expanded={expanded}
          onToggle={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setExpanded((current) => !current);
          }}
          text={content}
        />
      ) : null}
    </div>
  );
};
