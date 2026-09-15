import { toDateKey } from "@/utils/date-range";

export const earlierDate = (current: Date | null, candidate: Date | null) => {
  if (!candidate) return current;
  if (!current) return candidate;

  return candidate < current ? candidate : current;
};

export const groupDateCounts = <T extends { createdAt: Date }>(items: T[], labels: string[]) => {
  const counts = new Map(labels.map((label) => [label, 0]));

  for (const item of items) {
    const label = toDateKey(item.createdAt);
    if (counts.has(label)) counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return counts;
};

export const normalizeSeconds = (value: number | null | undefined) => {
  const seconds = Number(value ?? 0);

  if (!Number.isFinite(seconds) || seconds <= 0) return 0;

  return Math.round(seconds);
};

export const valueFromMap = (map: Map<string, number>, key: string) => map.get(key) ?? 0;

export const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
