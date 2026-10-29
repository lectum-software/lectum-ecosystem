import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import "./vertical-video-player-muted-overlay-control.test.mjs";
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

test("contact overlay is inside the expanded player and independent of hidden controls", () => {
  const source = readFileSync(new URL("./vertical-video-player.tsx", import.meta.url), "utf8");
  const start = source.indexOf("<VerticalVideoPlayerBottomOverlay");
  const end = source.indexOf("<VerticalVideoStreamStatus", start);
  const overlay = source.slice(start, end);
  assert.ok(start > source.indexOf("<VerticalVideoPlayerShell"));
  assert.ok(end < source.indexOf("</VerticalVideoPlayerShell>"));
  assert.match(overlay, /usesPersistentControls && !persistentControlsHidden/);
  assert.match(overlay, /\{bottomOverlay\}/);
  const component = readFileSync(
    new URL("./vertical-video-player-bottom-overlay.tsx", import.meta.url),
    "utf8",
  );
  assert.match(component, /data-lectum-video-bottom-overlay="true"/);
  assert.match(component, /4\.5rem/);
  assert.match(component, /inset-x-3 bottom-3/);
  assert.match(component, /sm:inset-x-4 sm:bottom-4/);
  assert.match(component, /--lectum-video-safe-bottom/);
  assert.match(component, /pointer-events-none/);
  assert.match(component, /\[&>\*\]:pointer-events-auto/);
  assert.doesNotMatch(component, /opacity-0|aria-hidden/);
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
  const shellSource = readFileSync(
    new URL("./vertical-video-player-shell.tsx", import.meta.url),
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
    /onFullscreenRequest:\s*usesInlineContentExpansion\s*\?\s*handleInlineContentExpansionRequest\s*:\s*undefined/,
  );
  assert.match(
    shellSource,
    /data-lectum-video-expanded=\{isContentExpanded \? "true" : undefined\}/,
  );
  assert.doesNotMatch(gesturesSource, /currentVideo\.controls = true/);
});

test("video expandido sai de cards com overflow e cobre o feed inferior", () => {
  const playerSource = readFileSync(
    new URL("./vertical-video-player.tsx", import.meta.url),
    "utf8",
  );
  const shellSource = readFileSync(
    new URL("./vertical-video-player-shell.tsx", import.meta.url),
    "utf8",
  );
  const expansionSource = readFileSync(
    new URL("./vertical-video-player-content-expansion.ts", import.meta.url),
    "utf8",
  );

  assert.match(playerSource, /<VerticalVideoPlayerShell/);
  assert.match(shellSource, /import \{ createPortal \} from "react-dom";/);
  assert.match(shellSource, /data-lectum-video-inline-placeholder="true"/);
  assert.match(shellSource, /createPortal\(playerRoot, document\.body\)/);
  assert.match(shellSource, /z-\[1100\]/);
  assert.match(shellSource, /data-lectum-video-expanded-portal/);
  assert.match(expansionSource, /data-lectum-inline-video-expanded/);
  assert.match(expansionSource, /documentElement\.style\.overflow = "hidden"/);
  assert.match(expansionSource, /document\.body\.style\.overscrollBehavior = "none"/);
});

test("controles focados pelo teclado não desaparecem durante a reprodução", () => {
  const state = {
    controlsRevealed: false,
    enabled: true,
    isPaused: false,
    visibility: "auto",
  };
  assert.equal(shouldHidePersistentVideoControls({ ...state, controlsFocused: true }), false);
  assert.equal(shouldHidePersistentVideoControls({ ...state, controlsFocused: false }), true);
});

test("Escape e botão de saída preservam a reprodução antes de desmontar o portal", () => {
  const expansion = readFileSync(
    new URL("./vertical-video-player-content-expansion.ts", import.meta.url),
    "utf8",
  );
  const player = readFileSync(new URL("./vertical-video-player.tsx", import.meta.url), "utf8");
  assert.match(player, /onBeforeClose: capturePlaybackSnapshot/);
  assert.match(player, /onClick=\{closeInlineContentExpansion\}/);
  assert.match(expansion, /beforeCloseRef\.current\?\.\(\);\s*setExpandedContentSource\(null\)/);
  assert.match(expansion, /if \(event\.key === "Escape"\) closeInlineContentExpansion\(\)/);
});
