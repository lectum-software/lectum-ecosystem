import assert from "node:assert/strict";
import test from "node:test";
import { whatsappTimeline } from "./whatsapp-timeline";

test("each origin deduplicates people by day and independently across the period", () => {
  const event = {
    id: "1",
    user_id: "u1",
    visitor_id: "v1",
    occurred_at: new Date("2026-10-19T12:00:00Z"),
  };
  const result = whatsappTimeline([
    {
      id: "profile",
      label: "Perfil",
      events: [
        event,
        { ...event, id: "2" },
        { ...event, id: "3", occurred_at: new Date("2026-10-20T12:00:00Z") },
      ],
    },
    { id: "favorites", label: "Favoritos", events: [event] },
    { id: "communities", label: "Comunidades", events: [] },
  ]);
  assert.equal(result.series[0].total, 1);
  assert.deepEqual(result.series[0].points, [
    { date: "2026-10-19", value: 1 },
    { date: "2026-10-20", value: 1 },
  ]);
  assert.equal(result.series[1].total, 1);
  assert.equal(result.series[2].total, 0);
  assert.deepEqual(result.series[2].points, []);
});
