import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import ts from "typescript";
import { selectReceivedInteractionContentIds } from "./received-interaction-content";

const post = (id: string, communityId: string, createdAt = "2020-01-01T12:00:00Z") => ({
  community: { id: communityId },
  createdAt: new Date(createdAt),
  id,
});

const reply = (id: string, communityId: string, createdAt = "2020-01-01T12:00:00Z") => ({
  createdAt: new Date(createdAt),
  id,
  post: { community: { id: communityId } },
});

test("seleciona conteúdo histórico e recente sem aplicar a data de criação", () => {
  const result = selectReceivedInteractionContentIds({
    allPosts: [
      post("post-antigo", "a"),
      post("post-anterior", "a", "2026-08-10T12:00:00Z"),
      post("post-atual", "a", "2026-09-10T12:00:00Z"),
    ],
    allReplies: [
      reply("resposta-antiga", "a"),
      reply("resposta-anterior", "a", "2026-08-10T12:00:00Z"),
      reply("resposta-atual", "a", "2026-09-10T12:00:00Z"),
    ],
    communityFilterIds: null,
  });

  assert.deepEqual(result, {
    postIds: ["post-antigo", "post-anterior", "post-atual"],
    replyIds: ["resposta-antiga", "resposta-anterior", "resposta-atual"],
  });
});

test("recebidos continuam elegíveis quando não houve conteúdo produzido no período", () => {
  const result = selectReceivedInteractionContentIds({
    allPosts: [post("post-antigo", "a")],
    allReplies: [reply("resposta-antiga", "a")],
    communityFilterIds: new Set(["a"]),
  });

  assert.deepEqual(result, {
    postIds: ["post-antigo"],
    replyIds: ["resposta-antiga"],
  });
});

test("filtro resolvido de comunidade restringe posts e respostas históricas", () => {
  const result = selectReceivedInteractionContentIds({
    allPosts: [post("post-a", "a"), post("post-b", "b")],
    allReplies: [reply("resposta-b", "b"), reply("resposta-a", "a")],
    communityFilterIds: new Set(["a"]),
  });

  assert.deepEqual(result, { postIds: ["post-a"], replyIds: ["resposta-a"] });
});

test("all preserva conteúdo elegível de todas as comunidades", () => {
  const result = selectReceivedInteractionContentIds({
    allPosts: [post("post-b", "b"), post("post-a", "a")],
    allReplies: [reply("resposta-a", "a"), reply("resposta-b", "b")],
    communityFilterIds: null,
  });

  assert.deepEqual(result, {
    postIds: ["post-b", "post-a"],
    replyIds: ["resposta-a", "resposta-b"],
  });
});

test("preserva todos os IDs canônicos resolvidos sem escolher apenas uma comunidade", () => {
  const result = selectReceivedInteractionContentIds({
    allPosts: [post("post-a", "a"), post("post-b", "b"), post("post-c", "c")],
    allReplies: [reply("resposta-c", "c"), reply("resposta-b", "b")],
    communityFilterIds: new Set(["a", "b"]),
  });

  assert.deepEqual(result, { postIds: ["post-a", "post-b"], replyIds: ["resposta-b"] });
});

for (const communityFilterIds of [new Set<string>(), new Set(["desconhecida"])]) {
  test(`filtro sem correspondência não amplia a seleção (${communityFilterIds.size})`, () => {
    assert.deepEqual(
      selectReceivedInteractionContentIds({
        allPosts: [post("post-a", "a")],
        allReplies: [reply("resposta-a", "a")],
        communityFilterIds,
      }),
      { postIds: [], replyIds: [] },
    );
  });
}

test("conteúdo elegível vazio permanece vazio, sem fallback ou IDs fabricados", () => {
  assert.deepEqual(
    selectReceivedInteractionContentIds({ allPosts: [], allReplies: [], communityFilterIds: null }),
    { postIds: [], replyIds: [] },
  );
});

test("resposta a post de terceiro seleciona a resposta, sem promover o post a autoral", () => {
  const authoredReply = {
    ...reply("resposta-autoral", "a"),
    post: { id: "post-terceiro", community: { id: "a" } },
  };
  const result = selectReceivedInteractionContentIds({
    allPosts: [],
    allReplies: [authoredReply],
    communityFilterIds: new Set(["a"]),
  });

  assert.deepEqual(result, { postIds: [], replyIds: ["resposta-autoral"] });
});

test("seleção não altera entradas nem compartilha arrays de saída entre chamadas", () => {
  const allPosts = Object.freeze([Object.freeze(post("post-antigo", "a"))]);
  const allReplies = Object.freeze([Object.freeze(reply("resposta-antiga", "a"))]);
  const communityFilterIds = new Set(["a"]);
  const input = { allPosts, allReplies, communityFilterIds };
  const first = selectReceivedInteractionContentIds(input);
  first.postIds.push("somente-na-saida");
  first.replyIds.length = 0;

  assert.deepEqual(selectReceivedInteractionContentIds(input), {
    postIds: ["post-antigo"],
    replyIds: ["resposta-antiga"],
  });
  assert.equal(allPosts.length, 1);
  assert.equal(allReplies.length, 1);
  assert.deepEqual([...communityFilterIds], ["a"]);
});

// Static wiring guards complement the real pure selector tests. They do not
// execute the loader/repository and are not PostgreSQL integration evidence.
const source = ts.createSourceFile(
  "statistics-data.ts",
  readFileSync(join(__dirname, "statistics-data.ts"), "utf8"),
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TS,
);

const callsNamed = (name: string) => {
  const calls: ts.CallExpression[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && node.expression.getText(source) === name) calls.push(node);
    ts.forEachChild(node, visit);
  };
  visit(source);
  return calls.map((call) => call.arguments.map((argument) => argument.getText(source)));
};

test("wiring estático: seletor recebe históricos elegíveis e filtro já resolvido", () => {
  const calls = callsNamed("selectReceivedInteractionContentIds");
  assert.equal(calls.length, 1);
  assert.match(calls[0][0], /^\{\s*allPosts,\s*allReplies,\s*communityFilterIds,?\s*\}$/);
  assert.deepEqual(callsNamed("resolveCommunityFilterIds"), [
    ["query.community", "communityReferences"],
  ]);
});

const receivedQueries = [
  ["listPostSaves", "postIds"],
  ["listReplySaves", "replyIds"],
  ["listCommentsReceived", "postIds"],
  ["listPostVotes", "postIds"],
  ["listReplyVotes", "replyIds"],
  ["listPostShareEvents", "postIds"],
  ["listReplyShareEvents", "replyIds"],
] as const;

for (const [method, idKey] of receivedQueries) {
  test(`wiring estático: ${method} usa históricos com event time atual/anterior intacto`, () => {
    const ids = `receivedInteractionContentIds.${idKey}`;
    const identity = method === "listCommentsReceived" ? ["userId"] : [];
    assert.deepEqual(callsNamed(`repository.${method}`), [
      [ids, ...identity, "period.current.start", "period.current.end"],
      [ids, ...identity, "period.previous.start", "period.previous.end"],
    ]);
  });
}

test("wiring estático: consultas de conteúdo produzido preservam seus períodos", () => {
  for (const method of ["listAuthoredPosts", "listAuthoredReplies"]) {
    assert.deepEqual(callsNamed(`repository.${method}`), [
      ["userId", "period.current.start", "period.current.end"],
      ["userId"],
      ["userId", "period.previous.start", "period.previous.end"],
    ]);
  }
  assert.deepEqual(callsNamed("filterPostsByCommunity"), [
    ["posts", "query.community"],
    ["previousPosts", "query.community"],
  ]);
  assert.deepEqual(callsNamed("filterRepliesByCommunity"), [
    ["replies", "query.community"],
    ["previousReplies", "query.community"],
  ]);
});

test("wiring estático: cliques da grade e views não recebem o novo universo", () => {
  for (const [method, ids] of [
    ["countPostWhatsappClicks", "postIds"],
    ["countReplyWhatsappClicks", "replyIds"],
    ["countPostViews", "allPostIds"],
    ["countReplyViews", "allReplyIds"],
  ]) {
    assert.deepEqual(callsNamed(`repository.${method}`), [
      [ids, "period.current.start", "period.current.end"],
    ]);
  }
});
