import "../../../scripts/register-source-modules.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { setTimeout as wait } from "node:timers/promises";
import { createElement, Fragment, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const { createConversionPromptOpener, useConversionPromptState } = await import(
  "./progressive-conversion-lifecycle.ts"
);
const { ProgressiveConversionPrompt } = await import("./progressive-conversion-prompt.tsx");
const { isActionPromptType } = await import("./progressive-conversion-state.ts");
const { useAuthTokenPresence, getAuthTokenServerSnapshot } = await import(
  "../../hooks/use-auth-token-presence.ts"
);

// Real production callback/state hook/UI, native Node timers and React SSR.
// Router/DOM/auth/network/provider are not replaced. Boolean transitions are local contract
// inputs, not a reproduction of browser hydration, cookies, restored scroll or HTTP.
const passive = { trigger: "trigger_scroll" };
const makeIntent = (type) => ({
  createdAt: "2026-09-11T00:00:00.000Z",
  returnTo: "/comunidades/contrato-local",
  trigger: "trigger_salvar",
  type,
});
const actions = {
  closePrompt: () => assert.fail("SSR must not run closePrompt"),
  startSignup: () => assert.fail("SSR must not navigate to signup"),
  startLogin: () => assert.fail("SSR must not navigate to login"),
};
const modal = (prompt, isAuthenticated) =>
  createElement(ProgressiveConversionPrompt, { prompt, isAuthenticated, ...actions });

function openerState(authenticated = false) {
  const pathnameRef = { current: "/comunidades/contrato-local" };
  const authenticationRef = { current: authenticated };
  const prompts = [];
  const open = createConversionPromptOpener(pathnameRef, authenticationRef, (prompt) =>
    prompts.push(prompt),
  );
  return { pathnameRef, authenticationRef, prompts, open };
}

test("control: real token-presence hook SSR uses false, not a browser-session assertion", () => {
  function Presence() {
    return createElement("output", null, String(useAuthTokenPresence()));
  }
  assert.equal(typeof window, "undefined");
  assert.equal(getAuthTokenServerSnapshot(), false);
  assert.equal(renderToStaticMarkup(createElement(Presence)), "<output>false</output>");
});

test("control: anonymous passive offer keeps actual copy, dialog semantics and mobile tokens", () => {
  const html = renderToStaticMarkup(modal(passive, false));
  assert.match(html, /Crie sua conta gratuita/);
  assert.match(html, /Continuar explorando/);
  assert.match(html, /Criar conta/);
  assert.doesNotMatch(html, /Fazer login/);
  assert.match(html, /role="dialog"/);
  assert.match(html, /aria-modal="true"/);
  assert.match(html, /aria-labelledby="lectum-conversion-modal-title"/);
  assert.match(html, /aria-describedby="lectum-conversion-modal-description"/);
  assert.match(html, /px-4 py-6/);
  assert.match(html, /sm:px-6/);
});

for (const authenticated of [false, true]) {
  test(`control: empty prompt stays empty for authenticated=${authenticated}`, () => {
    assert.equal(renderToStaticMarkup(modal(null, authenticated)), "");
  });
}

test("regression: actual offer UI hides an already-open passive prompt as soon as authenticated", () => {
  assert.equal(renderToStaticMarkup(modal(passive, true)), "");
});

for (const [type, title] of [
  ["vote_post", "Entre para votar"],
  ["vote_reply", "Entre para votar"],
  ["save_post", "Entre para salvar este post"],
  ["save_reply", "Entre para salvar esta resposta"],
  ["comment_post", "Entre para comentar"],
  ["reply_comment", "Entre para responder"],
  ["follow_community", "Entre para seguir esta comunidade"],
  ["favorite_psychologist", "Entre para favoritar este psicólogo"],
  ["create_post", "Crie sua conta para publicar"],
]) {
  test(`control: anonymous ${type} still prompts signup/login and returns false`, () => {
    const intent = makeIntent(type);
    assert.equal(isActionPromptType(type), true);
    const state = openerState(false);
    assert.equal(state.open("trigger_salvar", intent), false);
    assert.equal(state.prompts.length, 1);
    assert.deepEqual(state.prompts[0].intent, intent);
    const html = renderToStaticMarkup(modal(state.prompts[0], false));
    assert.ok(html.includes(title));
    assert.match(html, /Fazer login/);
    assert.match(html, /Criar conta/);
  });
  test(`regression: authenticated ${type} cannot leave obsolete action modal visible`, () => {
    assert.equal(
      renderToStaticMarkup(modal({ trigger: "trigger_salvar", intent: makeIntent(type) }, true)),
      "",
    );
  });
}

for (const delay of [0, 250]) {
  test(`regression: native ${delay}ms callback queued while anonymous cannot open after auth becomes true`, async () => {
    const state = openerState(false);
    const scheduled = new Promise((resolve) => {
      setTimeout(() => {
        state.open("trigger_scroll");
        resolve();
      }, delay);
    });
    state.authenticationRef.current = true;
    await scheduled;
    assert.deepEqual(state.prompts, []);
  });
}

test("control: native callback still opens passive offer for a visitor who remains anonymous", async () => {
  const state = openerState(false);
  await wait(1);
  assert.equal(state.open("trigger_scroll"), false);
  assert.deepEqual(state.prompts, [{ ...passive, intent: undefined }]);
});

test("control: same opener reads latest pathname and keeps existing suppressed private routes", () => {
  const state = openerState(false);
  for (const path of ["/app/perfil", "/app/favoritos", "/app/notificacoes"]) {
    state.pathnameRef.current = path;
    assert.equal(state.open("trigger_scroll"), false);
  }
  assert.deepEqual(state.prompts, []);
});

test("control: new anonymous actions are still gated after authentication becomes false", () => {
  const state = openerState(true);
  state.authenticationRef.current = false;
  assert.equal(state.open("trigger_voto", makeIntent("vote_post")), false);
  assert.equal(state.prompts.length, 1);
});

for (const path of ["/app/perfil", "/app/favoritos", "/app/notificacoes"]) {
  test(`explicit publish click opens over ${path} without enabling passive prompts`, () => {
    const state = openerState(false);
    state.pathnameRef.current = path;
    const intent = {
      ...makeIntent("create_post"),
      returnTo: "/app/comunidades/feed/publicacao/nova",
      trigger: "trigger_comentar",
    };
    state.open("trigger_scroll", intent);
    state.open("trigger_comentar", makeIntent("comment_post"));
    assert.equal(state.prompts.length, 0);
    state.open("trigger_comentar", intent);
    assert.deepEqual(state.prompts, [{ trigger: "trigger_comentar", intent }]);
    assert.equal(state.pathnameRef.current, path);
    const html = renderToStaticMarkup(modal(state.prompts[0], false));
    assert.match(html, /Crie sua conta para publicar/);
    assert.match(html, /Continuar explorando/);
    state.authenticationRef.current = true;
    state.open("trigger_comentar", intent);
    assert.equal(state.prompts.length, 1);
  });
}

// Controlled React render-phase transitions run the real state hook, without effect
// emulation or hook replacement. This verifies state/render, NOT ReactDOM hydration effects.
function AuthenticationTransition({ logout = false, intent }) {
  const [phase, setPhase] = useState(0);
  const authenticated = phase === 1;
  const [prompt, setPrompt] = useConversionPromptState(authenticated);
  if (phase === 0) {
    createConversionPromptOpener(
      { current: "/comunidades/contrato-local" },
      { current: false },
      setPrompt,
    )("trigger_scroll", intent);
    setPhase(1);
  }
  if (phase === 1 && logout) setPhase(2);
  return createElement(
    Fragment,
    null,
    createElement("output", { "data-prompt-pending": Boolean(prompt) }, "lifecycle"),
    modal(prompt, authenticated),
  );
}

for (const intent of [undefined, makeIntent("save_post"), makeIntent("vote_reply")]) {
  for (const logout of [false, true]) {
    test(`regression: React state drops ${intent?.type ?? "passive"} prompt on auth${logout ? " and does not resurrect on logout" : ""}`, () => {
      const html = renderToStaticMarkup(
        createElement(AuthenticationTransition, { logout, intent }),
      );
      assert.match(html, /data-prompt-pending="false"/);
      assert.doesNotMatch(html, /role="dialog"/);
    });
  }
}

// Source wiring checks are explicitly not presented as execution of browser effects.
const coreText = readFileSync(
  new URL("./progressive-conversion-core.tsx", import.meta.url),
  "utf8",
);
const core = ts.createSourceFile(
  "core.tsx",
  coreText,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);
const effectBodies = [];
function visit(node) {
  if (ts.isCallExpression(node) && node.expression.getText(core) === "useEffect") {
    effectBodies.push(node.arguments[0].getText(core));
  }
  ts.forEachChild(node, visit);
}
visit(core);

test("automatic signup has only the active-time gate and defers behind visible modals", () => {
  const effect = effectBodies.find((body) => body.includes("trackVisibleNavigation"));
  assert.match(effect, /canShowAutomaticSignup\(elapsedMs\)/);
  assert.match(effect, /!hasVisibleModalLayer\(\)/);
  assert.match(effect, /!hasPromptBeenShown\(\)/);
  assert.doesNotMatch(coreText, /openPrompt\("trigger_(scroll|psicologos|comunidade)"\)/);
  assert.doesNotMatch(coreText, /60_000|nextSeconds >= 90|nextCount < 2/);
});

const timing = await import("../onboarding/navigation-prompt-timing.ts");

test("visible navigation accumulates across surfaces, pauses when hidden and cleans up", (t) => {
  t.mock.timers.enable({ apis: ["Date", "setInterval"], now: 1_000_000 });
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const storage = new Map();
  const events = new EventTarget();
  globalThis.window = {
    sessionStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
    },
    setInterval,
    clearInterval,
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
  };
  globalThis.document = {
    visibilityState: "visible",
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
  };
  const seen = [];
  let stop = timing.trackVisibleNavigation("test:community", (ms) => seen.push(ms));
  let close;
  try {
    t.mock.timers.tick(20_000);
    assert.equal(seen.at(-1), 20_000);
    document.visibilityState = "hidden";
    events.dispatchEvent(new Event("visibilitychange"));
    t.mock.timers.tick(300_000);
    assert.equal(seen.at(-1), 20_000);
    document.visibilityState = "visible";
    events.dispatchEvent(new Event("visibilitychange"));
    stop();
    stop = timing.trackVisibleNavigation("test:community", (ms) => seen.push(ms));
    t.mock.timers.tick(9_500);
    assert.ok(seen.at(-1) < timing.COMMUNITY_TIP_DELAY_MS);
    t.mock.timers.tick(500);
    assert.equal(seen.at(-1), timing.COMMUNITY_TIP_DELAY_MS);

    assert.equal(timing.canShowAutomaticSignup(179_999), false);
    assert.equal(timing.canShowAutomaticSignup(180_000), true);
    close = timing.trackCommunityTipOpen();
    t.mock.timers.tick(300_000);
    assert.equal(timing.canShowAutomaticSignup(500_000), false);
    close();
    assert.equal(timing.canShowAutomaticSignup(500_000), false);
    t.mock.timers.tick(119_999);
    assert.equal(timing.canShowAutomaticSignup(500_000), false);
    t.mock.timers.tick(1);
    assert.equal(timing.canShowAutomaticSignup(500_000), true);
    assert.equal(timing.canShowAutomaticSignup(179_999), false);

    // User actions bypass the automatic cooldown and the session frequency limit.
    storage.set("modal_exibida_na_sessao", "true");
    window.dispatchEvent = events.dispatchEvent.bind(events);
    const state = openerState();
    state.open("trigger_comentar", makeIntent("create_post"));
    state.open("trigger_salvar", makeIntent("save_post"));
    assert.equal(state.prompts.length, 2);
    state.open("trigger_tempo");
    assert.equal(state.prompts.length, 2);

    stop();
    const count = seen.length;
    t.mock.timers.tick(10_000);
    assert.equal(seen.length, count);
  } finally {
    close?.();
    stop();
    globalThis.window = previousWindow;
    globalThis.document = previousDocument;
  }
});

test("the public home feed counts as discovery, unlike auth and private account pages", async () => {
  const { isPublicDiscoveryPath } = await import("./progressive-conversion-state.ts");
  for (const path of ["/", "/comunidades/ansiedade", "/psicologos", "/comunidades/feed"]) {
    assert.equal(isPublicDiscoveryPath(path), true);
  }
  for (const path of ["/auth/login", "/app/perfil"]) {
    assert.equal(isPublicDiscoveryPath(path), false);
  }
});
