import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { compareCommunityMentorIdentity } from "./community-mentor-tiebreak";

test("tied mentors use professional name before internal id", () => {
  const rousel = { id: "a", name: "Rousel Cesconetto" };
  const marielle = { id: "z", name: "Marielle Frascareli Lima" };
  assert.deepEqual([rousel, marielle].sort(compareCommunityMentorIdentity), [marielle, rousel]);
});

test("professional name overrides account name and equal names use id", () => {
  const a = {
    id: "a",
    name: "A",
    psychologist_profile: {
      professional_first_name: "Rousel",
      professional_last_name: "Cesconetto",
    },
  };
  const b = { id: "z", name: "Marielle" };
  assert.ok(compareCommunityMentorIdentity(a, b) > 0);
  assert.ok(compareCommunityMentorIdentity({ id: "a", name: "Ana" }, { id: "b", name: "Ana" }) < 0);
});

test("profile signals and public podium share the final tiebreak", () => {
  for (const path of [
    "src/utils/community-mentor-ranking.ts",
    "src/modules/api/private/community/repositories/queries/CommunityMentorRepository.ts",
  ]) {
    const source = readFileSync(path, "utf8");
    assert.match(source, /return compareCommunityMentorIdentity\(/);
  }
});
