import "../../scripts/register-source-modules.mjs";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement, Fragment, StrictMode } from "react";
import { renderToReadableStream, renderToString } from "react-dom/server";

// SSR nativo com módulos reais do frontend; não substitui a validação no navegador.

const {
  getAuthTokenServerSnapshot,
  getAuthTokenSnapshot,
  subscribeAuthToken,
  useAuthTokenPresence,
} = await import("./use-auth-token-presence.ts");

const Presence = () => {
  const hasToken = useAuthTokenPresence();
  return createElement("p", { "data-token-present": hasToken }, hasToken ? "presente" : "ausente");
};

const absentMarkup = '<p data-token-present="false">ausente</p>';

test("snapshot inicial de SSR é booleano false, sem acessar um ambiente browser", () => {
  assert.equal(typeof window, "undefined");
  assert.equal(typeof document, "undefined");
  assert.equal(getAuthTokenServerSnapshot(), false);
  assert.equal(getAuthTokenServerSnapshot(), getAuthTokenSnapshot());
});

test("assinatura no servidor é inerte e seu cleanup pode ser repetido", () => {
  let notifications = 0;
  const cleanup = subscribeAuthToken(() => notifications++);
  cleanup();
  cleanup();
  assert.equal(notifications, 0);
});

test("React SSR real renderiza o hook pelo snapshot ausente", () => {
  assert.equal(renderToString(createElement(Presence)), absentMarkup);
});

test("consumidores simultâneos e renderizações SSR repetidas mantêm o mesmo snapshot", () => {
  const content = createElement(
    StrictMode,
    null,
    createElement(Fragment, null, createElement(Presence), createElement(Presence)),
  );
  assert.equal(renderToString(content), absentMarkup.repeat(2));
  assert.equal(renderToString(content), absentMarkup.repeat(2));
});

test("streaming SSR real usa o mesmo contrato, sem alegar hidratação no browser", async () => {
  const stream = await renderToReadableStream(createElement(Presence));
  assert.equal(await new Response(stream).text(), absentMarkup);
});
