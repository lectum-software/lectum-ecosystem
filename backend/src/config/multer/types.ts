export type Option = (
  | { fields?: { name: string; maxCount: number }[] }
  | { array?: string }
  | { single?: string }
) & { allowed?: string[]; size?: number; public?: boolean };
