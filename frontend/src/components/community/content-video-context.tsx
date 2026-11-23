"use client";

import { createContext, type ReactNode, useContext } from "react";
import { TranscriptScope } from "@/components/video-captions/transcript";

export type ContentVideoSourceEntry = {
  postId: string;
  communitySlug?: string;
  videoId?: string;
  replyId?: string | null;
  mediaUrl?: string | null;
};
export type ContentVideoRequest = {
  initial: ContentVideoSourceEntry;
  initialTime?: number;
  watchedVideoKeys?: string[];
};
export const ContentVideoLaunchContext = createContext<
  ((request: ContentVideoRequest) => void) | null
>(null);
export const useContentVideoLauncher = () => useContext(ContentVideoLaunchContext);
export const ContentVideoOpenContext = createContext(false);
export type ContentVideoSource = {
  entries: ContentVideoSourceEntry[];
  mode: "discussion" | "feed" | "profile";
  hasNextPage?: boolean;
  onLoadMore?: () => unknown;
};

const SourceContext = createContext<ContentVideoSource | null>(null);
const PostContext = createContext<{
  postId: string;
  hideInlineContact?: boolean;
  disabled?: boolean;
} | null>(null);

export const ContentVideoScope = ({
  children,
  ...source
}: ContentVideoSource & { children: ReactNode }) => (
  <SourceContext.Provider value={source}>{children}</SourceContext.Provider>
);

export const ContentVideoPost = ({
  children,
  allowTranscript = false,
  ...post
}: {
  children: ReactNode;
  allowTranscript?: boolean;
  postId: string;
  hideInlineContact?: boolean;
  disabled?: boolean;
}) => (
  <PostContext.Provider value={post}>
    <TranscriptScope enabled={allowTranscript}>{children}</TranscriptScope>
  </PostContext.Provider>
);

export const useContentVideoSource = () => useContext(SourceContext);
export const useContentVideoPost = () => useContext(PostContext);
