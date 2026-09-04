import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  shouldHidePersistentVideoControls,
  shouldUseInlineContentVideoExpansion,
} from "./vertical-video-player-support.ts";

test("controles persistentes permitem visibilidade permanente no modo imersivo", () => {
  assert.equal(
    shouldHidePersistentVideoControls({
      controlsRevealed: false,
      enabled: true,
      isPaused: false,
      visibility: "auto",
    }),
    true,
  );

  assert.equal(
    shouldHidePersistentVideoControls({
      controlsRevealed: false,
      enabled: true,
      isPaused: false,
      visibility: "always",
    }),
    false,
  );

  assert.equal(
    shouldHidePersistentVideoControls({
      controlsRevealed: false,
      enabled: true,
      isPaused: true,
      visibility: "auto",
    }),
    false,
  );
});

test("feed imersivo de psicologos opta por controles sempre visiveis", () => {
  const slideSource = readFileSync(
    new URL("../../app/app/psychologists/view/components/slide.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    slideSource,
    /controlsVariant=\{slideUsesNativeVideoControls \? "persistent" : "native"\}/,
  );
  assert.match(slideSource, /persistentControlsVisibility="always"/);
});

test("video de conteudo ampliado usa expansao inline sem fullscreen nativo", () => {
  assert.equal(
    shouldUseInlineContentVideoExpansion({
      controlsEnabled: true,
      controlsVariant: "persistent",
      fullscreenVariant: "content",
      persistentControlsLayout: "media",
    }),
    true,
  );

  assert.equal(
    shouldUseInlineContentVideoExpansion({
      controlsEnabled: true,
      controlsVariant: "persistent",
      fullscreenVariant: "default",
      persistentControlsLayout: "media",
    }),
    false,
  );

  assert.equal(
    shouldUseInlineContentVideoExpansion({
      controlsEnabled: true,
      controlsVariant: "persistent",
      fullscreenVariant: "content",
      persistentControlsLayout: "stacked",
    }),
    false,
  );

  assert.equal(
    shouldUseInlineContentVideoExpansion({
      controlsEnabled: false,
      controlsVariant: "persistent",
      fullscreenVariant: "content",
      persistentControlsLayout: "media",
    }),
    false,
  );

  const playerSource = readFileSync(
    new URL("./vertical-video-player.tsx", import.meta.url),
    "utf8",
  );
  const gesturesSource = readFileSync(
    new URL(
      "../../app/app/psychologists/hooks/use-psychologists-video-gestures.ts",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(
    playerSource,
    /onFullscreenRequest:\s*usesInlineContentExpansion \? handleInlineContentExpansion : undefined/,
  );
  assert.match(
    playerSource,
    /data-lectum-video-expanded=\{isContentExpanded \? "true" : undefined\}/,
  );
  assert.doesNotMatch(gesturesSource, /currentVideo\.controls = true/);
});
