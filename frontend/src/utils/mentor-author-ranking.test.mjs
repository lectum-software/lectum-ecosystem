import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { mentorPositionForAuthor } from "./mentor-author-ranking.ts";

test("ranking presentation uses a compact uppercase label without community backdrop colors", () => {
  const source = readFileSync(
    new URL("../app/app/community/top-mentors/logic.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /top-mentor-ranking-eyebrow text-\[14px\] font-extrabold uppercase/);
  assert.doesNotMatch(source, /visual_soft_color|--top-mentor-backdrop|style=\{pageStyle\}/);
  assert.match(source, /communityAvatar=\{communityData\?\.avatar_url/);
  assert.match(source, /navigateBackFromTopMentors\(router, community\)/);
  assert.match(source, /onClick=\{shareRanking\}/);
});

test("neutral ranking styles retain a dark variant without changing podium metal classes", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  const neutralColor = (pattern) => {
    const value = css.match(pattern)?.[1];
    assert.ok(value, "Expected a centralized neutral color");
    const channels = value.match(/.{2}/g).map((channel) => Number.parseInt(channel, 16));
    assert.ok(Math.max(...channels) - Math.min(...channels) <= 24, "Color must remain neutral");
    return channels.reduce((total, channel) => total + channel, 0) / channels.length;
  };
  const lightBackground = neutralColor(
    /\.top-mentor-ranking-header\s*\{[^}]*--top-mentor-pearl: #([\da-f]{6});/,
  );
  const darkBackground = neutralColor(
    /\.dark \.top-mentor-ranking-header\s*\{[^}]*--top-mentor-pearl: #([\da-f]{6});/,
  );
  assert.ok(lightBackground > 220);
  assert.ok(darkBackground < 60);
  assert.doesNotMatch(css, /--top-mentor-backdrop/);
  const lightLabel = neutralColor(/\.top-mentor-ranking-eyebrow\s*\{\s*color: #([\da-f]{6});/);
  const darkLabel = neutralColor(
    /\.dark \.top-mentor-ranking-eyebrow\s*\{\s*color: #([\da-f]{6});/,
  );
  assert.ok(lightLabel > 80 && lightLabel < 130);
  assert.ok(darkLabel > 140 && darkLabel < 190);
  for (const metal of ["gold", "silver", "bronze"]) {
    assert.ok(css.includes(`.top-mentor-podium-column--${metal}`));
  }
});

test("uses the reply author's community position, not the post author's", () => {
  const ranking = [
    { position: 1, professional: { id: "post-author" } },
    { position: 2, professional: { id: "reply-author" } },
  ];
  assert.equal(mentorPositionForAuthor(ranking, "reply-author"), 2);
  assert.equal(mentorPositionForAuthor(ranking, "unranked-author"), undefined);
});

test("does not transfer ranking between communities or invent a loading rank", () => {
  assert.equal(mentorPositionForAuthor(undefined, "reply-author"), undefined);
  assert.equal(mentorPositionForAuthor([], "reply-author"), undefined);
  assert.equal(
    mentorPositionForAuthor([{ position: 1, professional: { id: "other" } }], "reply-author"),
    undefined,
  );
});

test("only top three positions receive a label", () => {
  for (const position of [0, 1, 2, 3, 4, 5, 1.5]) {
    const ranking = [{ position, professional: { id: "author" } }];
    assert.equal(
      mentorPositionForAuthor(ranking, "author"),
      [1, 2, 3].includes(position) ? position : undefined,
    );
  }
});
