export const adminChartColors = {
  accent: "var(--admin-chart-accent)",
  danger: "var(--admin-danger)",
  foreground: "var(--admin-foreground)",
  muted: "var(--admin-muted)",
  primary: "var(--admin-primary)",
  subtle: "var(--admin-subtle)",
  success: "var(--admin-success)",
  surface: "var(--admin-surface)",
  warning: "var(--admin-warning)",
} as const;

const clampAlpha = (alpha: number) => Math.min(1, Math.max(0, alpha));

export const colorWithAlpha = (
  color: string | null | undefined,
  alpha: number,
  fallback = adminChartColors.muted,
) => {
  const resolvedColor = color?.trim() || fallback;
  const normalized = resolvedColor.replace("#", "");
  const safeAlpha = clampAlpha(alpha);

  if (/^[0-9a-fA-F]{6}$/u.test(normalized)) {
    const red = Number.parseInt(normalized.slice(0, 2), 16);
    const green = Number.parseInt(normalized.slice(2, 4), 16);
    const blue = Number.parseInt(normalized.slice(4, 6), 16);

    return `rgb(${red} ${green} ${blue} / ${safeAlpha})`;
  }

  return `color-mix(in srgb, ${resolvedColor} ${safeAlpha * 100}%, transparent)`;
};

export const adminPrimaryGradient = `linear-gradient(90deg, ${colorWithAlpha(
  adminChartColors.primary,
  0.18,
)}, ${colorWithAlpha(adminChartColors.primary, 0.9)})`;
