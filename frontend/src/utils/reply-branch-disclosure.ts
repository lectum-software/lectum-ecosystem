export const REPLY_BRANCH_INITIAL_VISIBLE_COUNT = 3;

export const REPLY_BRANCH_PAGE_SIZE = 5;

export type ReplyBranchVisibility = { focusReplyId: string | null; count: number };

export const getReplyBranchVisibleCount = (
  visibility: ReplyBranchVisibility | null,
  focusReplyId: string | null,
  hasFocusedDescendant: boolean,
  loadedRepliesCount: number,
) => {
  // A deep link opens its path, but subsequent user actions own that branch.
  const count =
    visibility?.focusReplyId === focusReplyId
      ? visibility.count
      : hasFocusedDescendant
        ? loadedRepliesCount
        : 0;
  return Math.max(0, Math.min(count, loadedRepliesCount));
};

export type ReplyBranchAction =
  | { count: number; kind: "expand" | "more" }
  | { count: 0; kind: "collapse" };

export const replyBranchActionLabel = (
  action: ReplyBranchAction | null,
  descendantsCount?: number,
): string | null => {
  if (!action) return null;
  if (action.kind === "collapse") return "Ocultar respostas";
  const count =
    action.kind === "expand" &&
    typeof descendantsCount === "number" &&
    Number.isInteger(descendantsCount)
      ? Math.max(action.count, descendantsCount)
      : action.count;
  return `${action.kind === "more" ? "Ver mais" : "Ver"} ${count} ${count === 1 ? "resposta" : "respostas"}`;
};

export const getNextReplyBranchVisibleCount = (
  currentVisibleCount: number,
  loadedRepliesCount: number,
) => {
  const nextBatchSize =
    currentVisibleCount === 0
      ? REPLY_BRANCH_INITIAL_VISIBLE_COUNT
      : currentVisibleCount + REPLY_BRANCH_PAGE_SIZE;

  return Math.min(Math.max(0, loadedRepliesCount), nextBatchSize);
};

export const resolveReplyBranchAction = (
  visibleRepliesCount: number,
  totalRepliesCount: number,
): ReplyBranchAction | null => {
  const normalizedTotal = Math.max(0, totalRepliesCount);
  if (normalizedTotal === 0) return null;

  const normalizedVisible = Math.min(Math.max(0, visibleRepliesCount), normalizedTotal);
  if (normalizedVisible === 0) return { count: normalizedTotal, kind: "expand" };

  const remainingRepliesCount = normalizedTotal - normalizedVisible;
  if (remainingRepliesCount > 0) {
    return { count: remainingRepliesCount, kind: "more" };
  }

  return { count: 0, kind: "collapse" };
};
