import type { notification as NotificationItem } from "@/api/generator/types";

const startOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

export const getRelativeTime = (value?: string) => {
  if (!value) return "agora";

  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.max(1, Math.round(diffMs / 60_000));

  if (minutes < 60) return `${minutes} min`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h`;

  const days = Math.round(hours / 24);
  return `${days} d`;
};

export const groupNotifications = (items: NotificationItem[]) => {
  const today = startOfToday();

  return items.reduce(
    (acc, item) => {
      const createdAt = item.createdAt ? new Date(item.createdAt) : new Date();
      const key = createdAt >= today ? "today" : "previous";
      acc[key].push(item);
      return acc;
    },
    { today: [] as NotificationItem[], previous: [] as NotificationItem[] },
  );
};
