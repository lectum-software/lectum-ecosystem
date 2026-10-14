import { getBrowserStorage, readStorageItem, writeStorageItem } from "./browser-storage";

export const REPLY_TREE_RETURN_KEY = "lectum.replyTreeReturn.v1";
const MAX_AGE_MS = 30 * 60 * 1000;
const MAX_ENTRIES = 12;

export type ReplyBranchSnapshot = { count: number; contentExpanded: boolean };
export type ReplyTreeReturnSnapshot = {
  scope: string;
  createdAt: number;
  pageCount: number;
  branches: Record<string, ReplyBranchSnapshot>;
  anchorId: string;
  anchorTop: number;
  scrollY: number;
};

export const replyTreeReturnScope = (userId: string | null | undefined, href: string) =>
  JSON.stringify([userId ?? null, href.split("#")[0]]);

export const readReplyTreeReturnRaw = () =>
  readStorageItem(getBrowserStorage("sessionStorage"), REPLY_TREE_RETURN_KEY);

const parseSnapshots = (raw: string | null, now = Date.now()): ReplyTreeReturnSnapshot[] => {
  try {
    const entries: unknown = JSON.parse(raw ?? "[]");
    if (!Array.isArray(entries)) return [];
    return entries
      .filter((entry): entry is ReplyTreeReturnSnapshot => {
        if (!entry || typeof entry !== "object") return false;
        const { scope, createdAt, pageCount, branches, anchorId, anchorTop, scrollY } = entry;
        return (
          typeof scope === "string" &&
          Number.isFinite(createdAt) &&
          createdAt <= now &&
          now - createdAt <= MAX_AGE_MS &&
          Number.isSafeInteger(pageCount) &&
          pageCount >= 1 &&
          pageCount <= 1000 &&
          typeof anchorId === "string" &&
          Number.isFinite(anchorTop) &&
          Number.isFinite(scrollY) &&
          scrollY >= 0 &&
          branches &&
          typeof branches === "object" &&
          !Array.isArray(branches) &&
          Object.keys(branches).length <= 5000 &&
          Object.values(branches).every((value) => {
            if (!value || typeof value !== "object") return false;
            const branch = value as ReplyBranchSnapshot;
            return (
              Number.isSafeInteger(branch.count) &&
              branch.count >= 0 &&
              typeof branch.contentExpanded === "boolean"
            );
          })
        );
      })
      .slice(-MAX_ENTRIES);
  } catch {
    return [];
  }
};

export const findReplyTreeReturnSnapshot = (raw: string | null, scope: string, now = Date.now()) =>
  parseSnapshots(raw, now).find((entry) => entry.scope === scope) ?? null;

export const rememberReplyTreeReturn = (snapshot: ReplyTreeReturnSnapshot) => {
  const entries = parseSnapshots(readReplyTreeReturnRaw()).filter(
    (entry) => entry.scope !== snapshot.scope,
  );
  return writeStorageItem(
    getBrowserStorage("sessionStorage"),
    REPLY_TREE_RETURN_KEY,
    JSON.stringify([...entries, snapshot].slice(-MAX_ENTRIES)),
  );
};

export const captureReplyTreeReturn = (
  section: HTMLElement,
  anchor: HTMLElement,
  scope: string,
  pageCount: number,
) => {
  const branches: Record<string, ReplyBranchSnapshot> = Object.create(null);
  for (const element of section.querySelectorAll<HTMLElement>("[data-reply-branch-id]")) {
    const id = element.dataset.replyBranchId;
    if (!id) continue;
    branches[id] = {
      count: Number(element.dataset.replyVisibleCount) || 0,
      contentExpanded: element.dataset.replyContentExpanded === "true",
    };
  }
  return rememberReplyTreeReturn({
    scope,
    branches,
    pageCount,
    createdAt: Date.now(),
    anchorId: anchor.id,
    anchorTop: anchor.getBoundingClientRect().top,
    scrollY: Math.max(0, window.scrollY),
  });
};

export const resolveReplyTreeReturnScroll = (
  snapshot: ReplyTreeReturnSnapshot,
  anchor: HTMLElement | null,
) =>
  Math.max(
    0,
    anchor
      ? window.scrollY + anchor.getBoundingClientRect().top - snapshot.anchorTop
      : snapshot.scrollY,
  );
