import assert from "node:assert/strict";
import test from "node:test";
import { distinctWhatsappPeople } from "./people";

test("origens deduplicam conta entre navegadores e visitante entre cliques", () => {
  const action = (id: string, user_id: string | null, visitor_id: string, day: number) => ({
    id,
    user_id,
    visitor_id,
    occurred_at: new Date(Date.UTC(2026, 9, day)),
  });
  const actions = [
    action("later", "person", "browser2", 12),
    action("first", "person", "browser1", 10),
    action("anon1", null, "visitor", 10),
    action("anon2", null, "visitor", 11),
    action("other", null, "other", 11),
  ];
  assert.deepEqual(
    distinctWhatsappPeople(actions).map((item) => item.id),
    ["anon1", "first", "other"],
  );
  assert.equal(actions[0].id, "later", "does not mutate source events");
});
