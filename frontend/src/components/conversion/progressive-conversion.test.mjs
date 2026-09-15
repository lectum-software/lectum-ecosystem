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

test("wiring: scroll effect cleanup cancels its delayed initial check, not only its listener", () => {
  const effect = effectBodies.find((body) => body.includes("window.scrollY"));
  assert.match(effect, /const timeout = window\.setTimeout\(onScroll, 250\)/);
  assert.match(effect, /return \(\) => \{[\s\S]*window\.clearTimeout\(timeout\)/);
  assert.match(effect, /window\.removeEventListener\("scroll", onScroll\)/);
});

test("wiring: profile/post visit effect cancels queued zero-delay prompts", () => {
  const effect = effectBodies.find((body) => body.includes("OPENED_POSTS_KEY"));
  assert.match(effect, /timeouts\.push\(window\.setTimeout/);
  assert.match(effect, /return \(\) =>[\s\S]*timeouts\.forEach/);
  assert.match(effect, /window\.clearTimeout\(timeout\)/);
});
