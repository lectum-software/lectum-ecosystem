import "../../../scripts/register-source-modules.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const {
  createInteractionSnapshot,
  receiveInteractionSnapshot,
  beginInteractionSnapshot,
  finishInteractionSnapshot,
} = await import("./interaction-snapshot.ts");
const { useInteractionSnapshot } = await import("./use-interaction-snapshot.ts");
const source = { currentVote: null, downvotes: 0, upvotes: 4 };
const voted = { currentVote: 1, downvotes: 0, upvotes: 5 };
const refreshed = { currentVote: -1, downvotes: 1, upvotes: 8 };
const value = (state) => state.override ?? state.source;

test("sem ação local, atualização do mesmo item é a autoridade", () => {
  const state = createInteractionSnapshot("viewer:post", source);
  assert.deepEqual(value(receiveInteractionSnapshot(state, state.scope, refreshed)), refreshed);
});

test("objeto novo com os mesmos campos não provoca novo ajuste de render", () => {
  const state = createInteractionSnapshot("viewer:post", source);
  assert.equal(receiveInteractionSnapshot(state, state.scope, { ...source }), state);
});

test("resposta confirmada é substituída por novas props e não ressuscita", () => {
  const token = Symbol();
  let state = beginInteractionSnapshot(
    createInteractionSnapshot("viewer:post", source),
    token,
    voted,
  );
  state = finishInteractionSnapshot(state, token, voted);
  assert.deepEqual(value(state), voted);
  state = receiveInteractionSnapshot(state, state.scope, refreshed);
  assert.deepEqual(value(state), refreshed);
  state = receiveInteractionSnapshot(state, state.scope, source);
  assert.deepEqual(value(state), source);
});

test("refetch durante envio não apaga o otimismo; falha devolve props recentes", () => {
  const token = Symbol();
  let state = beginInteractionSnapshot(
    createInteractionSnapshot("viewer:post", source),
    token,
    voted,
  );
  state = receiveInteractionSnapshot(state, state.scope, refreshed);
  assert.deepEqual(value(state), voted);
  state = finishInteractionSnapshot(state, token);
  assert.deepEqual(value(state), refreshed);
  assert.equal(state.pending, null);
});

test("falha sem refetch restaura o último recibo confirmado", () => {
  const first = Symbol();
  const second = Symbol();
  let state = beginInteractionSnapshot(
    createInteractionSnapshot("viewer:post", source),
    first,
    voted,
  );
  state = finishInteractionSnapshot(state, first, voted);
  state = beginInteractionSnapshot(state, second, source);
  state = finishInteractionSnapshot(state, second);
  assert.deepEqual(value(state), voted);
});

test("confirmação igual às props libera o override", () => {
  const token = Symbol();
  let state = beginInteractionSnapshot(
    createInteractionSnapshot("viewer:post", source),
    token,
    voted,
  );
  state = receiveInteractionSnapshot(state, state.scope, voted);
  state = finishInteractionSnapshot(state, token, voted);
  assert.equal(state.override, null);
  assert.deepEqual(value(state), voted);
});

test("resposta anterior não encerra operação mais nova", () => {
  const first = Symbol();
  const second = Symbol();
  let state = beginInteractionSnapshot(
    createInteractionSnapshot("viewer:post", source),
    first,
    voted,
  );
  state = beginInteractionSnapshot(state, second, refreshed);
  assert.equal(finishInteractionSnapshot(state, first, voted), state);
  assert.equal(finishInteractionSnapshot(state, first), state);
});

for (const nextScope of ["viewer:other-post", "other-viewer:post", "guest:post"]) {
  test(`mudança de escopo descarta otimismo e callbacks: ${nextScope}`, () => {
    const token = Symbol();
    let state = beginInteractionSnapshot(
      createInteractionSnapshot("viewer:post", source),
      token,
      voted,
    );
    state = receiveInteractionSnapshot(state, nextScope, refreshed);
    assert.deepEqual(value(state), refreshed);
    assert.equal(finishInteractionSnapshot(state, token, voted), state);
    state = receiveInteractionSnapshot(state, "viewer:post", source);
    assert.equal(finishInteractionSnapshot(state, token, voted), state);
    assert.deepEqual(value(state), source);
  });
}

test("salvamento usa a mesma reconciliação sem depender dos campos de voto", () => {
  const token = Symbol();
  let state = createInteractionSnapshot("viewer:reply", { saved: false, saves: 2 });
  state = beginInteractionSnapshot(state, token, { saved: true, saves: 3 });
  state = finishInteractionSnapshot(state, token, { saved: true, saves: 3 });
  state = receiveInteractionSnapshot(state, state.scope, { saved: false, saves: 7 });
  assert.deepEqual(value(state), { saved: false, saves: 7 });
});

test("hook real produz o snapshot inicial em SSR sem efeito nem estado de outro usuário", () => {
  function Probe() {
    const { snapshot } = useInteractionSnapshot("guest:post", source);
    return createElement("output", null, snapshot.upvotes);
  }
  assert.equal(renderToStaticMarkup(createElement(Probe)), "<output>4</output>");
});

test("três cards usam o hook real por usuário/alvo, sem snapshots antigos paralelos", () => {
  for (const path of [
    "../../app/app/community/[slug]/components/post-card.tsx",
    "../../app/app/posts/mine/components/reply-item-card.tsx",
    "../../app/app/posts/saved/components/saved-reply-card.tsx",
  ]) {
    const text = readFileSync(new URL(path, import.meta.url), "utf8");
    assert.match(text, /useInteractionSnapshot/);
    assert.match(text, /currentUser\?\.id/);
    assert.doesNotMatch(text, /setVoteSnapshot|setSaveSnapshot|setVoteOverride|setSaveOverride/);
  }
});
