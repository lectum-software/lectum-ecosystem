import { createHash } from "node:crypto";

export const WEEKLY_WHATSAPP_KEY = "weekly_whatsapp_report";
const DAY_MS = 86_400_000;
export const WHATSAPP_WEEK_MS = 7 * DAY_MS;

export function editableWhatsappWeek(start: Date, now = new Date()) {
  const current = previousWhatsappWeek(now).end.getTime();
  const age = current - start.getTime();
  return (
    Number.isFinite(age) && age >= 0 && age <= 4 * WHATSAPP_WEEK_MS && age % WHATSAPP_WEEK_MS === 0
  );
}

export function parseWhatsappWeek(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const start = new Date(`${value}T00:00:00-03:00`);
  if (
    !Number.isFinite(start.getTime()) ||
    start.toISOString().slice(0, 10) !== value ||
    start.getUTCDay() !== 1
  )
    return null;
  return start;
}

export function isWhatsappWeekReleased(availableAt: Date, startAt?: string) {
  if (!startAt?.trim()) return true;
  // Require an explicit UTC instant and reject dates normalized by Date.parse.
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(startAt)) return false;
  const timestamp = Date.parse(startAt);
  if (!Number.isFinite(timestamp)) return false;
  if (new Date(timestamp).toISOString() !== startAt.replace("Z", ".000Z")) return false;
  return availableAt.getTime() >= timestamp;
}

export function previousWhatsappWeek(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => Number(parts.find((item) => item.type === type)?.value);
  const today = new Date(Date.UTC(part("year"), part("month") - 1, part("day"), 3));
  const monday = today.getTime() - ((today.getUTCDay() + 6) % 7) * DAY_MS;
  return {
    start: new Date(monday - 7 * DAY_MS),
    end: new Date(monday),
    availableAt: new Date(monday + 9 * 3_600_000),
  };
}

export function hashWhatsappVisitor(value: unknown) {
  if (typeof value !== "string" || !/^[a-zA-Z0-9_-]{8,120}$/.test(value)) return null;
  return createHash("sha256").update(`lectum-whatsapp:${value}`).digest("hex");
}

export function validAcquiredCount(value: unknown): value is number {
  return (
    typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= 1_000_000
  );
}

export const weekDateLabel = (date: Date) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
  }).format(date);

export const reportDates = (start: Date, end: Date) => ({
  start_label: weekDateLabel(start),
  end_label: weekDateLabel(new Date(end.getTime() - 1)),
});
