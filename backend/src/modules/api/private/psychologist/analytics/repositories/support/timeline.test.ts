import assert from "node:assert/strict";
import test from "node:test";
import { analyticsDay, dailyPoints, originGroup, uniqueDailyContacts } from "./timeline";

test("analytics use Sao Paulo calendar boundaries", () => {
  assert.equal(analyticsDay(new Date("2026-10-19T02:00:00Z")), "2026-10-18");
  assert.deepEqual(
    dailyPoints([
      { date: new Date("2026-10-19T02:00:00Z") },
      { date: new Date("2026-10-18T20:00:00Z") },
    ]),
    [{ date: "2026-10-18", value: 2 }],
  );
});
test("missing attribution is never relabeled as community or video", () => {
  assert.equal(originGroup(null), "unknown");
  assert.equal(originGroup("/psicologos/123"), "unknown");
  assert.equal(originGroup("/psicologos?specialty=ansiedade"), "presentation_video");
  assert.equal(originGroup("/comunidades/ansiedade/publicacao/123"), "communities");
});
test("WhatsApp deduplicates within each day, keeping distinct legacy visitors", () => {
  const createdAt = new Date("2026-10-19T12:00:00Z");
  const event = { id: "1", user_id: "u1", visitor_key: null, createdAt };
  assert.equal(
    uniqueDailyContacts([
      event,
      { ...event, id: "2" },
      { ...event, id: "3", createdAt: new Date("2026-10-20T12:00:00Z") },
      { ...event, id: "4", user_id: null },
      { ...event, id: "5", user_id: null },
    ]).length,
    4,
  );
});
