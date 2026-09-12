import type { AdminCommunityRule } from "@/api/req/communities";

export const sortCommunityRules = (rules: readonly AdminCommunityRule[]) =>
  [...rules].sort(
    (left, right) =>
      left.position - right.position ||
      new Date(left.created_at).getTime() - new Date(right.created_at).getTime() ||
      left.id.localeCompare(right.id),
  );

export const planRuleMove = (
  rules: readonly AdminCommunityRule[],
  sourceRuleId: string,
  targetIndex: number,
) => {
  const sourceIndex = rules.findIndex((rule) => rule.id === sourceRuleId);
  if (sourceIndex < 0 || !Number.isInteger(targetIndex)) return null;
  const boundedIndex = Math.max(0, Math.min(targetIndex, rules.length - 1));
  if (sourceIndex === boundedIndex) return null;

  const ordered = [...rules];
  const [moved] = ordered.splice(sourceIndex, 1);
  if (!moved) return null;
  ordered.splice(boundedIndex, 0, moved);

  return {
    ordered,
    updates: ordered
      .map((rule, position) => ({ position, rule }))
      .filter(({ position, rule }) => rule.position !== position),
  };
};

// The ref locks synchronously, before React renders disabled controls.
export const acquireRuleOperation = (lock: { current: boolean }, blocked: boolean) => {
  if (lock.current || blocked) return false;
  lock.current = true;
  return true;
};

// A rejection must not release the UI while another individual write is running.
// The async wrapper also contains a synchronous throw without skipping later items.
export const settleRuleUpdates = <T>(
  updates: readonly T[],
  persist: (update: T) => Promise<unknown>,
) => Promise.allSettled(updates.map(async (update) => persist(update)));
