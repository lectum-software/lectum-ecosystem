import "./register-source-modules.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const { feedHeaderControlClassName, feedHeaderDropdownPanelClassName, topFeedCommunities } =
  await import("../src/app/app/community/[slug]/modules/feed-support.ts");

test("dropdown ranks four communities by posts, breaking ties stably without changing input", () => {
  const make = (slug, posts_count, name = slug) => ({ slug, name, posts_count });
  const communities = [make("z", 1), make("b", 8), make("d", 3), make("a", 8), make("c", 5)];
  const original = [...communities];
  assert.deepEqual(
    topFeedCommunities(communities).map((item) => item.slug),
    ["a", "b", "c", "d"],
  );
  assert.deepEqual(communities, original);
  assert.deepEqual(topFeedCommunities([]), []);
  assert.equal(topFeedCommunities(communities.slice(0, 2)).length, 2);
  assert.deepEqual(
    topFeedCommunities([make("z", 0, "Igual"), make("a", 0, "Igual")]).map((item) => item.slug),
    ["a", "z"],
  );
});

test("all communities link follows shortcuts and the selector reads every API page", () => {
  const selector = source("components/feed-controls.tsx").split(
    "export const FeedCommunitySelect =",
  )[1];
  assert.ok(selector.indexOf("communityOptions.map") < selector.indexOf("Todas as comunidades"));
  assert.match(selector, /activeCommunity = communities.find/);
  const caller = readFileSync(
    new URL("../src/api/callers/community/index.tsx", import.meta.url),
    "utf8",
  );
  assert.match(caller, /page <= first.pages/);
  assert.match(caller, /communities.push\(\.\.\.next.data\)/);
  assert.match(caller, /staleTime: 60_000/);
});

const source = (file) =>
  readFileSync(new URL(`../src/app/app/community/[slug]/${file}`, import.meta.url), "utf8");

test("home header groups controls on an opaque full-width band", () => {
  const header = source("views/community-feed.tsx").match(/<header[\s\S]*?<\/header>/)?.[0];
  assert.ok(header);
  assert.match(header, /data-home-feed-header/);
  assert.match(header, /sticky top-0 z-30 -mx-5 border-b border-border bg-background /);
  assert.doesNotMatch(header, /bg-background\/|backdrop-blur|rounded-/);
  assert.match(header, /headerHidden/);
  assert.match(header, /<FeedSearchMenu/);
  assert.match(header, /<FeedCommunitySelect/);
  assert.match(header, /<FilterMenu/);
});

test("header icon controls stay flat in default and active states", () => {
  for (const active of [false, true]) {
    const classes = feedHeaderControlClassName(active);
    assert.match(classes, /h-11 w-11/);
    assert.match(classes, /shadow-none/);
    assert.doesNotMatch(classes, /shadow-lectum/);
    assert.match(classes, /focus-visible:ring-2/);
    assert.match(classes, active ? /bg-primary-soft/ : /bg-background/);
  }
});

test("community selector is flat while dropdowns retain their elevation", () => {
  const selector = source("components/feed-controls.tsx").split(
    "export const FeedCommunitySelect =",
  )[1];
  const button = selector.match(/<button[\s\S]*?<\/button>/)?.[0];
  assert.ok(button);
  assert.match(button, /shadow-none/);
  assert.doesNotMatch(button, /shadow-lectum/);
  assert.match(button, /tracking-normal/);
  assert.match(button, /aria-expanded=\{open\}/);
  assert.match(feedHeaderDropdownPanelClassName, /bg-surface/);
  assert.match(feedHeaderDropdownPanelClassName, /shadow-lectum-soft/);
});
