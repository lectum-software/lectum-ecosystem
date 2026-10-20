export function metricChange(
  current: number | null | undefined,
  previous: number | null | undefined,
) {
  if (
    current == null ||
    previous == null ||
    !Number.isFinite(current) ||
    !Number.isFinite(previous) ||
    current < 0 ||
    previous < 0
  )
    return null;
  if (current === previous) return { label: "0%", direction: "neutral" as const };
  if (previous === 0) return { label: "Novo", direction: "up" as const };
  const percent = Math.abs(((current - previous) / previous) * 100);
  const formatted =
    percent < 0.1
      ? "<0,1"
      : new Intl.NumberFormat("pt-BR", {
          maximumFractionDigits: 1,
          notation: percent >= 10000 ? "compact" : "standard",
        }).format(percent);
  return {
    label: `${formatted}%`,
    direction: current > previous ? ("up" as const) : ("down" as const),
  };
}
