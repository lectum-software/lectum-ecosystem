import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { dominantAvatarColor } from "../src/lib/community-avatar-color.ts";

const pixels = (...regions) =>
  new Uint8ClampedArray(
    regions.flatMap(([color, count]) => Array.from({ length: count }, () => color).flat()),
  );

test("solid avatar preserves exact brand color", () => {
  assert.equal(dominantAvatarColor(pixels([[255, 138, 42, 255], 100])), "#FF8A2A");
});
test("transparent background and white lettering do not replace colored identity", () => {
  assert.equal(
    dominantAvatarColor(
      pixels([[0, 0, 0, 0], 100], [[255, 255, 255, 255], 80], [[255, 64, 80, 255], 20]),
    ),
    "#FF4050",
  );
});
test("tiny chromatic noise does not replace a neutral avatar", () => {
  assert.equal(
    dominantAvatarColor(pixels([[20, 20, 20, 255], 98], [[255, 0, 0, 255], 2])),
    "#141414",
  );
});
test("neutral, white and fully transparent avatars have deterministic fallbacks", () => {
  assert.equal(dominantAvatarColor(pixels([[255, 255, 255, 255], 10])), "#FFFFFF");
  assert.equal(dominantAvatarColor(pixels([[0, 0, 0, 255], 10])), "#000000");
  assert.equal(dominantAvatarColor(pixels([[255, 0, 0, 127], 10])), null);
  assert.equal(dominantAvatarColor(new Uint8ClampedArray()), null);
});
test("multicolor selection uses the most frequent meaningful group, not the average of all colors", () => {
  assert.equal(
    dominantAvatarColor(pixels([[245, 60, 70, 255], 60], [[60, 60, 245, 255], 40])),
    "#F53C46",
  );
});
test("similar shades are averaged within the dominant bucket", () => {
  assert.equal(
    dominantAvatarColor(pixels([[240, 64, 64, 255], 50], [[250, 74, 74, 255], 50])),
    "#F54545",
  );
});

test("creation wiring preserves completed identity before avatar upload and awaits both", () => {
  const source = readFileSync(
    new URL("../src/app/(admin)/comunidades/nova/client.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /createdRef\.current \?\? \(await createMutation\.mutateAsync/);
  assert.ok(
    source.indexOf("createdRef.current = community") <
      source.indexOf("await avatarMutation.mutateAsync"),
  );
  assert.ok(
    source.indexOf("await avatarMutation.mutateAsync") <
      source.indexOf('toast.success("Comunidade criada'),
  );
  assert.match(source, /id: community.id, file: avatar.file/);
  assert.match(source, /submittingRef.current \|\| avatar.analyzing/);
  assert.match(source, /isSaving \|\| Boolean\(created\)/);
  assert.match(source, /Reenviar avatar/);
});
