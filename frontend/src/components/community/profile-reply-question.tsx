"use client";

import { useState } from "react";
import { InlineExpandableText } from "./inline-expandable-text";

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
