import assert from "node:assert/strict";
import test from "node:test";
import { distinctWhatsappPeople } from "@/modules/whatsapp-reports/people";
import { rankCommunityHighlights } from "./community-highlights";
import { whatsappActionSummary } from "./whatsapp-actions";
import { whatsappOrigin, whatsappOriginGroups } from "./whatsapp-origins";
import { whatsappTimeline } from "./whatsapp-timeline";

const event = (id: string, target = "reply-a", user = "person-a", day = 19) => ({
  id,
  user_id: user,
  visitor_id: `browser-${user}`,
  occurred_at: new Date(Date.UTC(2026, 9, day, 12)),
  action_type: "whatsapp_click",
  target_type: "post_reply",
  target_id: target,
  page_kind: "community_post",
  path: "/app/comunidades/test",
});
test("two contents clicked by one person produce two clicks everywhere but one person", () => {
  const events = [event("1"), event("2", "reply-b")];
  assert.deepEqual(whatsappActionSummary(events), {
    whatsapp_clicks: 2,
    whatsapp_unique_people: 1,
    whatsapp_clicks_per_person: 2,
  });
  assert.deepEqual(
    rankCommunityHighlights(events, "replies").map((item) => item.whatsapp_clicks),
    [1, 1],
  );
  assert.equal(
    whatsappTimeline(whatsappOriginGroups(events)).series.find(
      (series) => series.id === "communities",
    )?.total,
    2,
  );
  assert.equal(distinctWhatsappPeople(events).length, 1, "people-based consumers remain unchanged");
});
test("same person repeats on different days and channels; source/day sums match summary", () => {
  const events = [
    event("1"),
    event("2"),
    {
      ...event("3", "psychologist", "person-a", 20),
      target_type: "psychologist",
      page_kind: "psychologist_profile",
      path: "/app/psicologos/a",
    },
    event("4", "reply-b", "person-b"),
  ];
  const summary = whatsappActionSummary(events);
  assert.deepEqual(summary, {
    whatsapp_clicks: 4,
    whatsapp_unique_people: 2,
    whatsapp_clicks_per_person: 2,
  });
  const timeline = whatsappTimeline(whatsappOriginGroups(events));
  assert.equal(
    timeline.series.reduce((sum, series) => sum + (series.total ?? 0), 0),
    4,
  );
  assert.equal(
    timeline.series.flatMap((series) => series.points).reduce((sum, point) => sum + point.value, 0),
    4,
  );
  assert.equal(rankCommunityHighlights(events, "replies")[0].whatsapp_clicks, 2);
});
test("same stored action referenced twice is not counted twice; empty mean is unavailable", () => {
  assert.equal(whatsappActionSummary([event("1"), event("1")]).whatsapp_clicks, 1);
  assert.deepEqual(whatsappActionSummary([]), {
    whatsapp_clicks: 0,
    whatsapp_unique_people: 0,
    whatsapp_clicks_per_person: null,
  });
});
test("unidentified origin is retained and top mentors belong to communities once", () => {
  const events = [
    { ...event("1"), target_type: "psychologist", path: "/unknown", page_kind: "unknown" },
    {
      ...event("2"),
      target_type: "psychologist",
      path: "/app/comunidades/top-mentores",
      page_kind: "community_top_mentors",
    },
  ];
  const groups = whatsappOriginGroups(events);
  assert.equal(groups.find((group) => group.id === "unknown")?.events.length, 1);
  assert.equal(groups.find((group) => group.id === "communities")?.events.length, 1);
  assert.equal(groups.flatMap((group) => group.events).length, 2);
});

test("WhatsApp uses the action surface, not return URLs or inherited ranking context", () => {
  const action = { ...event("one"), target_type: "psychologist" };
  for (const [path, expected] of [
    ["/psicologos/a?traffic_origin=community_top_mentors", "profile"],
    ["/psicologos/a?returnTo=/favoritos", "profile"],
    ["/app/favoritos", "favorites"],
    ["/unknown?returnTo=/comunidades/top-mentores", "unknown"],
  ])
    assert.equal(whatsappOrigin({ ...action, path }), expected, path);
  assert.equal(
    whatsappOrigin({
      ...action,
      path: "/psicologos/a",
      action_type: "psychologist_video_whatsapp_click",
    }),
    "profile",
  );
});
