import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addFinanceDays,
  buildBuckets,
  endOfFinanceDate,
  parseFinanceDateOnly,
  resolveAdminFinancePeriod,
  startOfFinanceDate,
  toFinanceDateKey,
} from "./periods";

const period = (preset: "today" | "week" | "year", now: string) => {
  const result = resolveAdminFinancePeriod({ period: preset }, null, new Date(now));
  assert.equal(result.success, true);
  if (!result.success) throw new Error("period unavailable");
  return result.period;
};

describe("finance calendar America/Sao_Paulo", () => {
  it("keeps a 00:00 UTC payment in the previous BRT civil day", () => {
    const instant = new Date("2026-11-12T00:00:00.000Z");
    const snapshot = instant.getTime();
    const resolved = period("today", instant.toISOString());
    assert.equal(toFinanceDateKey(instant), "2026-11-11");
    assert.equal(resolved.current.start.toISOString(), "2026-11-11T03:00:00.000Z");
    assert.equal(resolved.current.end.toISOString(), "2026-11-12T02:59:59.999Z");
    assert.equal(resolved.previous.start.toISOString(), "2026-11-10T03:00:00.000Z");
    assert.equal(resolved.period.timezone, "America/Sao_Paulo");
    assert.equal(instant.getTime(), snapshot);
  });

  it("changes Monday and year boundaries only at BRT midnight", () => {
    assert.equal(period("week", "2026-11-16T00:00:00Z").period.from, "2026-11-09");
    assert.equal(period("week", "2026-11-16T03:00:00Z").period.from, "2026-11-16");
    assert.equal(period("year", "2027-01-01T00:00:00Z").period.from, "2026-01-01");
    assert.equal(period("year", "2027-01-01T03:00:00Z").period.from, "2027-01-01");
  });

  it("parses civil custom dates inclusively and validates leap dates", () => {
    const result = resolveAdminFinancePeriod({ from: "2024-02-29", to: "2024-03-01" });
    assert.equal(result.success, true);
    if (!result.success) return;
    assert.equal(result.period.days, 2);
    assert.equal(result.period.current.start.toISOString(), "2024-02-29T03:00:00.000Z");
    assert.equal(result.period.current.end.toISOString(), "2024-03-02T02:59:59.999Z");
    assert.equal(result.period.period.previous_from, "2024-02-27");
    assert.equal(result.period.period.previous_to, "2024-02-28");
    for (const invalid of ["2026-02-29", "2026-02-30", "2026-13-01", "2026/11/11", "0000-01-01"])
      assert.equal(parseFinanceDateOnly(invalid, "start"), null);
  });

  it("rejects future civil dates but accepts the whole current BRT day", () => {
    const now = new Date("2026-11-12T00:00:00Z");
    assert.equal(
      resolveAdminFinancePeriod({ from: "2026-11-11", to: "2026-11-11" }, null, now).success,
      true,
    );
    assert.deepEqual(
      resolveAdminFinancePeriod({ from: "2026-11-11", to: "2026-11-12" }, null, now),
      { code: "invalid_analytics_date_range", success: false },
    );
  });

  it("respects historic DST without a fixed offset or an extra/missing civil day", () => {
    const start = parseFinanceDateOnly("2018-11-04", "start");
    const end = parseFinanceDateOnly("2018-11-04", "end");
    assert.equal(start?.toISOString(), "2018-11-04T03:00:00.000Z");
    assert.equal(end?.toISOString(), "2018-11-05T01:59:59.999Z");
    assert.ok(start && end);
    assert.equal(end.getTime() - start.getTime() + 1, 23 * 60 * 60 * 1000);
    assert.equal(toFinanceDateKey(addFinanceDays(start, 1)), "2018-11-05");
    const result = resolveAdminFinancePeriod({ from: "2018-11-03", to: "2018-11-05" });
    assert.ok(result.success);
    assert.equal(result.period.days, 3);
    assert.deepEqual(
      buildBuckets(result.period.current, "day").map((bucket) => bucket.start_date),
      ["2018-11-03", "2018-11-04", "2018-11-05"],
    );
  });

  it("builds clipped daily, seven-day and monthly buckets from BRT boundaries", () => {
    const start = new Date("2026-10-31T23:59:00Z");
    const end = new Date("2026-11-09T01:00:00Z");
    for (const grouping of ["day", "week", "month"] as const) {
      const buckets = buildBuckets({ start, end }, grouping);
      assert.equal(buckets[0].start.getTime(), start.getTime());
      assert.equal(buckets.at(-1)?.end.getTime(), end.getTime());
      for (let index = 1; index < buckets.length; index++)
        assert.equal(buckets[index].start.getTime(), buckets[index - 1].end.getTime() + 1);
    }
    assert.deepEqual(
      buildBuckets({ start, end }, "month").map(({ start_date, end_date }) => [
        start_date,
        end_date,
      ]),
      [
        ["2026-10-31", "2026-10-31"],
        ["2026-11-01", "2026-11-08"],
      ],
    );
    assert.equal(startOfFinanceDate(start).toISOString(), "2026-10-31T03:00:00.000Z");
    assert.equal(endOfFinanceDate(end).toISOString(), "2026-11-09T02:59:59.999Z");
  });
});
