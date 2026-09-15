import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addDays,
  buildDateLabels,
  daysBetweenInclusive,
  endOfDate,
  parseDateOnly,
  resolveCalendarPeriod,
  startOfDate,
  startOfMonth,
  startOfWeek,
  startOfYear,
  toDateKey,
} from "./date-range";

describe("date-range", () => {
  it("não altera a data recebida ao calcular limites", () => {
    const input = new Date(2026, 7, 7, 14, 35, 20, 321);
    const snapshot = input.getTime();

    assert.equal(startOfDate(input).getHours(), 0);
    assert.equal(endOfDate(input).getHours(), 23);
    assert.equal(addDays(input, 2).getDate(), 9);
    assert.equal(input.getTime(), snapshot);
  });

  it("usa segunda-feira como início da semana e preserva o fuso local", () => {
    const sunday = new Date(2026, 7, 9, 12, 0, 0, 0);
    const monday = startOfWeek(sunday);

    assert.equal(monday.getDay(), 1);
    assert.equal(monday.getDate(), 3);
    assert.equal(monday.getHours(), 0);
    assert.equal(startOfMonth(sunday).getDate(), 1);
    assert.equal(startOfYear(sunday).getMonth(), 0);
  });

  it("valida datas civis e aplica o limite solicitado", () => {
    assert.equal(parseDateOnly("2026-02-30", "start"), null);
    assert.equal(parseDateOnly("2026/08/07", "start"), null);
    assert.equal(parseDateOnly("2026-08-07", "start")?.getHours(), 0);
    assert.equal(parseDateOnly("2026-08-07", "end")?.getHours(), 23);
  });

  it("centraliza chaves, rótulos e contagem inclusiva de calendário", () => {
    const start = new Date(2026, 7, 7, 12);

    assert.equal(toDateKey(start), "2026-08-07");
    assert.deepEqual(buildDateLabels(start, 3), ["2026-08-07", "2026-08-08", "2026-08-09"]);
    assert.equal(daysBetweenInclusive(start, new Date(2026, 7, 9, 1)), 3);
  });

  it("resolve presets e período anterior sem duplicar regras nos painéis", () => {
    const now = new Date(2026, 7, 7, 12);
    const period = resolveCalendarPeriod({ period: "7d" }, { defaultDays: 30, maxDays: 365, now });

    assert.equal(period?.days, 7);
    assert.equal(period?.label, "Últimos 7 dias");
    assert.equal(toDateKey(period?.start ?? now), "2026-08-01");
    assert.equal(toDateKey(period?.previousEnd ?? now), "2026-07-31");
    assert.equal(
      resolveCalendarPeriod({ period: "invalid" }, { defaultDays: 7, maxDays: 30 }),
      null,
    );
  });

  it("rejeita custom incompleto e limita todo o período", () => {
    const options = { defaultDays: 7, maxDays: 30, now: new Date(2026, 7, 7, 12) };

    assert.equal(resolveCalendarPeriod({ from: "2026-08-01" }, options), null);
    assert.equal(
      resolveCalendarPeriod(
        { period: "all" },
        { ...options, allPeriodStartDate: new Date(2026, 0, 1) },
      ),
      null,
    );
  });
});
