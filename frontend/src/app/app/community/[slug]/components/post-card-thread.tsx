import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const FeedThreadRoot = ({
  children,
  connected,
}: {
  children: ReactNode;
  connected: boolean;
}) => (
  <div className={cn("relative", connected && "pb-4")} data-feed-thread-root>
    {connected ? (
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-11 bottom-0 left-[1.125rem] w-[1.5px] -translate-x-1/2 rounded-full bg-border-strong"
        data-feed-thread-stem
      />
    ) : null}
    {children}
  </div>
);

export const FeedThreadReply = ({ children }: { children: ReactNode }) => (
  <div className="relative ml-10 grid min-w-0 gap-3" data-feed-thread-reply>
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute top-0 -left-[1.375rem] h-5 w-[1.375rem] overflow-visible text-border-strong"
      focusable="false"
      viewBox="0 0 22 20"
      data-feed-thread-branch
    >
      <path
        d="M0 0 V10 C0 14.4 3.6 18 8 18 H22"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
    {children}
  </div>
);
