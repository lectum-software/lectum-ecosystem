export const SUSPENSION_DURATION_DAYS = [1, 7, 15, 30, 60, 90] as const;

export type SuspensionDurationDays = (typeof SUSPENSION_DURATION_DAYS)[number];

type AccountStatusCarrier = {
  account_status?: string | null;
  account_status_expires_at?: Date | string | null;
  deleted?: boolean | null;
};

export const isValidSuspensionDurationDays = (value: number): value is SuspensionDurationDays =>
  SUSPENSION_DURATION_DAYS.includes(value as SuspensionDurationDays);

export const suspensionExpiresAtFromDays = (
  durationDays: SuspensionDurationDays,
  from = new Date(),
) => {
  const expiresAt = new Date(from);
  expiresAt.setDate(expiresAt.getDate() + durationDays);
  return expiresAt;
};

export const isSuspensionExpired = (user: AccountStatusCarrier, now = new Date()) => {
  if (user.deleted) return false;
  if (user.account_status !== "suspended") return false;
  if (!user.account_status_expires_at) return false;

  return new Date(user.account_status_expires_at).getTime() <= now.getTime();
};
