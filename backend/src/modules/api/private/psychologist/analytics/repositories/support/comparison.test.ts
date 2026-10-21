import assert from "node:assert/strict";
import test from "node:test";
import type { PsychologistAnalyticsPeriod } from "../../DTOs/IAnalyticsDTO";
import { previousAnalyticsPeriod } from "./comparison";

const period = (
  start: string,
  end: string,
  key: PsychologistAnalyticsPeriod["key"] = "custom",
): PsychologistAnalyticsPeriod => ({
  key,
  label: "",
  start_at: new Date(start),
  end_at: new Date(end),
});
test("four calendar days compare with the preceding four days in Sao Paulo", () => {
  const previous = previousAnalyticsPeriod(
    period("2026-10-16T00:00:00-03:00", "2026-10-19T23:59:59.999-03:00"),
  )!;
  assert.equal(previous.start_at.toISOString(), "2026-10-12T03:00:00.000Z");
  assert.equal(previous.end_at.toISOString(), "2026-10-16T02:59:59.999Z");
});
test("relative, leap-year and partial-year ranges preserve exact duration without overlap", () => {
  for (const current of [
    period("2026-10-13T18:00:00Z", "2026-10-20T18:00:00Z", "7d"),
    period("2024-02-28T03:00:00Z", "2024-03-01T02:59:59.999Z"),
    period("2026-01-01T03:00:00Z", "2026-10-20T18:00:00Z", "year"),
  ]) {
    const previous = previousAnalyticsPeriod(current)!;
    assert.equal(previous.end_at.getTime() + 1, current.start_at.getTime());
    assert.equal(
      previous.end_at.getTime() - previous.start_at.getTime(),
      current.end_at.getTime() - current.start_at.getTime(),
    );
  }
});
test("all-time and invalid intervals have no comparison", () => {
  assert.equal(previousAnalyticsPeriod(period("1970-01-01", "2026-10-20", "all")), null);
  assert.equal(previousAnalyticsPeriod(period("2026-10-20", "2026-10-19")), null);
});
