import type { CommunityPost } from "@/api/generator/types/community";

export const PSYCHOLOGIST_REPLY_TIP_SELECTOR =
  '[data-psychologist-tip-target="community-reply-post"]';
const PREFIX = "lectum:psychologist-reply-tip:v1:";
const CHANGE_EVENT = "lectum:psychologist-reply-tip";
const completed = new Set<string>();

export const isReplyTipPost = (post: CommunityPost) =>
  post.author.role === "paciente" && post.status === "publicado" && !post.muted_by_current_user;

export const prioritizeReplyTipPost = (posts: CommunityPost[], postId: string | null) => {
  const index = posts.findIndex((post) => post.id === postId && isReplyTipPost(post));
  if (index <= 0) return posts;
  return [posts[index], ...posts.slice(0, index), ...posts.slice(index + 1)];
};

export const hasSeenPsychologistReplyTip = (userId?: string | null) => {
  if (!userId || typeof window === "undefined") return false;
  if (completed.has(userId)) return true;
  try {
    return window.localStorage.getItem(`${PREFIX}${userId}`) === "1";
  } catch {
    return false;
  }
};

export const markPsychologistReplyTipSeen = (userId: string) => {
  if (typeof window === "undefined") return;
  completed.add(userId);
  const key = `${PREFIX}${userId}`;
  try {
    window.localStorage.setItem(key, "1");
  } catch {
    // Retain completion during this visit when browser storage is unavailable.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
};

export const subscribePsychologistReplyTip = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
};
