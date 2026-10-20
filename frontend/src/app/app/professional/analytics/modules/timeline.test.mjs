import assert from "node:assert/strict";
import test from "node:test";
import { pointerDayIndex, timelineDates } from "./timeline.ts";

test("daily dates include zero days and use Sao Paulo boundaries", () => {
  const timeline = {
    granularity: "day",
    series: [{ id: "a", label: "A", points: [{ date: "2026-10-17", value: 2 }] }],
  };
  assert.deepEqual(
    timelineDates(timeline, {
      key: "custom",
      start_at: "2026-10-16T03:00:00Z",
      end_at: "2026-10-19T02:59:59Z",
    }),
    ["2026-10-16", "2026-10-17", "2026-10-18"],
  );
});
test("all time starts with first real event, and weekly reports do not invent daily values", () => {
  const series = [
    {
      id: "a",
      label: "A",
      points: [
        { date: "2026-10-05", value: 3 },
        { date: "2026-10-19", value: 1 },
      ],
    },
  ];
  assert.deepEqual(timelineDates({ granularity: "week", series }), ["2026-10-05", "2026-10-19"]);
  assert.equal(
    timelineDates(
      { granularity: "day", series },
      { key: "all", start_at: "1970-01-01T00:00:00Z", end_at: "2026-10-20T02:59:00Z" },
    ).length,
    15,
  );
});
test("scrubbing clamps to first and last day", () => {
  assert.equal(pointerDayIndex(-20, 10, 100, 7), 0);
  assert.equal(pointerDayIndex(110, 10, 100, 7), 6);
  assert.equal(pointerDayIndex(60, 10, 100, 7), 3);
  assert.equal(pointerDayIndex(60, 10, 100, 1), 0);
});
