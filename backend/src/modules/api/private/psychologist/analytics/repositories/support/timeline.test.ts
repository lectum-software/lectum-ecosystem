import assert from "node:assert/strict";
import test from "node:test";
import {
  analyticsDay,
  dailyPoints,
  originGroup,
  presentationVideoOrigin,
  uniqueDailyContacts,
} from "./timeline";

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
  assert.equal(originGroup("/psicologos/123"), "profile");
  assert.equal(originGroup("/app/favoritos?tab=psychologists"), "favorites");
  assert.equal(originGroup("/app/favorites"), "favorites");
  assert.equal(originGroup("/app/psychologists/123"), "profile");
  assert.equal(originGroup("/outra-pagina"), "unknown");
  assert.equal(originGroup("/psicologos?specialty=ansiedade"), "presentation_video");
  assert.equal(originGroup("/comunidades/ansiedade/publicacao/123"), "communities");
});

test("origins match route boundaries, aliases and query-independent surfaces", () => {
  for (const [path, expected] of [
    ["/", "communities"],
    ["/app/community/anxiety", "communities"],
    ["/psicologos/?q=ansiedade", "presentation_video"],
    ["/psicologos/123?returnTo=/favorites&traffic_origin=community_top_mentors", "profile"],
    ["/unknown?returnTo=/favoritos", "unknown"],
    ["/favoritos-extra", "unknown"],
    ["//external.test/psicologos", "unknown"],
    ["https://external.test/psicologos", "unknown"],
  ])
    assert.equal(originGroup(path), expected, path);
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

test("presentation views distinguish profile, directory and unattributed legacy origins", () => {
  for (const path of [
    "/psicologos/123",
    "/psychologists/123",
    "/app/psicologo/123",
    "/app/psychologist/123",
    "/app/psychologists/123",
  ]) {
    assert.equal(presentationVideoOrigin(`${path}?ref=feed`), "profile", path);
  }
  for (const path of ["/psicologos", "/app/psicologos", "/app/psychologists", "/psychologists"]) {
    assert.equal(presentationVideoOrigin(path), "explore", path);
    assert.equal(presentationVideoOrigin(`${path}?search=ansiedade`), "search", path);
  }
  for (const path of [
    null,
    "",
    "/outra-pagina",
    "/comunidades/ansiedade",
    "/app/psicologo/123/contato",
  ]) {
    assert.equal(presentationVideoOrigin(path), "unknown", String(path));
  }
});
