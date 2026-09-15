// O ponto é uma data civil do calendário administrativo, não o dia UTC do instante.
const chartDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "America/Sao_Paulo",
  year: "numeric",
});

export const chartDateKey = (date: Date) => {
  const parts = chartDateFormatter.formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";

  return `${get("year")}-${get("month")}-${get("day")}`;
};

export const incrementChartPoint = <T extends { date: string }>(
  map: Map<string, T>,
  date: Date,
  createPoint: (date: string) => T,
  key: string,
) => {
  const day = chartDateKey(date);
  const point = map.get(day) ?? createPoint(day);
  const writable = point as unknown as Record<string, number>;

  writable[key] = Number(writable[key] ?? 0) + 1;
  map.set(day, point);
};

export const sortChartPoints = <T extends { date: string }>(map: Map<string, T>) =>
  [...map.values()].sort((left, right) => left.date.localeCompare(right.date));
