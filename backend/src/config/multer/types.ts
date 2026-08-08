export type Option = (
  | { fields?: { name: string; maxCount: number }[] }
  | { array?: string }
  | { single?: string }
) & { allowed: string[]; feature?: string; size: number; public?: boolean };
