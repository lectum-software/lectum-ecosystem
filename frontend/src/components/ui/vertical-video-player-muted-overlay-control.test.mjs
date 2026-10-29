import "../../../scripts/register-source-modules.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const { VerticalVideoPlayerMutedOverlayControl } = await import(
  "./vertical-video-player-muted-overlay-control.tsx"
);

test("mute action consumes the click before enabling audio", () => {
  const calls = [];
  const button = VerticalVideoPlayerMutedOverlayControl({
    title: "Content video",
    onClick: () => calls.push("sound"),
  });
  button.props.onClick({
    preventDefault: () => calls.push("prevent"),
    stopPropagation: () => calls.push("stop"),
  });
  assert.deepEqual(calls, ["prevent", "stop", "sound"]);
  assert.equal(button.props["data-post-card-ignore-click"], "true");
});

test("muted indicator stays independent from the disabled reels-entry controls", () => {
  const player = readFileSync(new URL("./vertical-video-player.tsx", import.meta.url), "utf8");
  assert.match(player, /usesMutedOverlayControl = mutedControlVisibility === "when-hidden"/);
  assert.match(
    player,
    /!usesMinimalControls && !usesPersistentControls && !usesMutedOverlayControl/,
  );
  assert.match(player, /!controls \|\| \(usesPersistentControls && persistentControlsHidden\)/);
  assert.match(player, /video.addEventListener\("volumechange", syncPlayerState\)/);
});
