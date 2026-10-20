export type PersonAction = {
  id: string;
  user_id: string | null;
  visitor_id: string;
  occurred_at: Date;
};

// Attribute repeat clicks within a channel to the first observed entry.
export function distinctWhatsappPeople<T extends PersonAction>(actions: T[]): T[] {
  const seen = new Set<string>();
  return [...actions]
    .sort((a, b) => a.occurred_at.getTime() - b.occurred_at.getTime() || a.id.localeCompare(b.id))
    .filter((action) => {
      const key = action.user_id ? `user:${action.user_id}` : `visitor:${action.visitor_id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
