import assert from "node:assert/strict";
import { test } from "node:test";
import { buildPublications } from "./publications";

type Bundle = Parameters<typeof buildPublications>[0];
type Post = Bundle["posts"][number];

const post = (id = "post-unidade"): Post => ({
  community: {
    avatar_url: null,
    id: "comunidade-unidade",
    name: "Comunidade de unidade",
    slug: "comunidade-unidade",
    visual_primary_color: "#112233",
  },
  content: " Conteúdo\n de unidade. ",
  createdAt: new Date("2026-01-05T12:00:00Z"),
  downvotes_count: 2,
  id,
  replies_count: 30,
  reports: [{ id: "denuncia-unidade" }],
  saves_count: 40,
  title: "Publicação de unidade",
  upvotes_count: 3,
});

const bundle = (posts: Post[] = [post()]): Bundle => ({
  memberships: [],
  membershipsInPeriod: [],
  postSaves: [],
  postSavesReceived: [],
  posts,
  replies: [],
  replySaves: [],
  replySavesReceived: [],
  reportsReceived: [],
  responsesReceived: [],
  reviews: [],
  sharesReceived: [],
  votesMade: [],
  votesReceived: [],
});

const response = (target: Post, id = "resposta-unidade"): Bundle["responsesReceived"][number] => ({
  author: { id: "autor-unidade", psychologist_profile: null, role: "paciente" },
  content: "Resposta de unidade.",
  createdAt: new Date("2026-01-06T12:00:00Z"),
  id,
  parent_reply: null,
  post: { community: target.community, id: target.id, title: target.title },
});

const save = (target: Post, id = "salvamento-unidade"): Bundle["postSavesReceived"][number] => ({
  createdAt: new Date("2026-01-06T12:00:00Z"),
  id,
  post: target,
});

test("nenhuma publicação retorna lista vazia", () => {
  assert.deepEqual(buildPublications(bundle([]), []), []);
});

test("comentários ausentes não reutilizam contador agregado", () => {
  const [item] = buildPublications(bundle(), []);
  assert.equal(item.metrics.comments.value, 0);
  assert.equal(item.metrics.comments.available, true);
});

test("salvamentos ausentes não reutilizam contador agregado", () => {
  const [item] = buildPublications(bundle(), []);
  assert.equal(item.metrics.saves.value, 0);
  assert.equal(item.metrics.saves.available, true);
});

test("relações positivas prevalecem sobre contadores agregados", () => {
  const target = post();
  const data = bundle([target]);
  data.responsesReceived = [response(target), response(target, "segunda-resposta")];
  data.postSavesReceived = [save(target)];
  const [item] = buildPublications(data, []);
  assert.equal(item.metrics.comments.value, 2);
  assert.equal(item.metrics.saves.value, 1);
});

test("relações de outro post não preenchem a ausência do post atual", () => {
  const data = bundle();
  data.responsesReceived = [response(post("outro"))];
  data.postSavesReceived = [save(post("outro"))];
  const [item] = buildPublications(data, []);
  assert.equal(item.metrics.comments.value, 0);
  assert.equal(item.metrics.saves.value, 0);
});

test("comentários positivos mantêm salvamentos ausentes em zero", () => {
  const target = post();
  const data = bundle([target]);
  data.responsesReceived = [response(target)];
  const [item] = buildPublications(data, []);
  assert.equal(item.metrics.comments.value, 1);
  assert.equal(item.metrics.saves.value, 0);
});

test("salvamentos positivos mantêm comentários ausentes em zero", () => {
  const target = post();
  const data = bundle([target]);
  data.postSavesReceived = [save(target)];
  const [item] = buildPublications(data, []);
  assert.equal(item.metrics.comments.value, 0);
  assert.equal(item.metrics.saves.value, 1);
});

test("cada publicação recebe somente suas relações elegíveis", () => {
  const first = post("a");
  const second = post("b");
  const data = bundle([second, first]);
  data.responsesReceived = [response(first), response(first, "outra-resposta")];
  data.postSavesReceived = [save(second)];
  const items = buildPublications(data, []);
  assert.deepEqual(
    items.map((item) => [item.id, item.metrics.comments.value, item.metrics.saves.value]),
    [
      ["a", 2, 0],
      ["b", 0, 1],
    ],
  );
});

test("compartilhamentos de resposta não são atribuídos ao post", () => {
  const target = post();
  const data = bundle([target]);
  data.sharesReceived = [
    { createdAt: target.createdAt, id: "do-post", post: target, reply: null },
    {
      createdAt: target.createdAt,
      id: "da-resposta",
      post: target,
      reply: {
        content: "Resposta de unidade.",
        createdAt: target.createdAt,
        id: "resposta-unidade",
        post: { community: target.community, id: target.id, title: target.title },
        title: null,
      },
    },
  ];
  assert.equal(buildPublications(data, [])[0].metrics.shares.value, 1);
});

test("agrupamento de visualizações mantém soma por alvo e ignora alvo nulo", () => {
  const target = post();
  const [item] = buildPublications(bundle([target]), [
    { _count: { _all: 3 }, target_id: target.id },
    { _count: { _all: 4 }, target_id: target.id },
    { _count: { _all: 20 }, target_id: "outro" },
    { _count: { _all: 30 }, target_id: null },
  ]);
  assert.equal(item.metrics.views.value, 7);
});

test("contrato de métricas e dados da publicação permanece estável", () => {
  const target = post();
  const data = bundle([target]);
  data.responsesReceived = [response(target)];
  data.postSavesReceived = [save(target)];
  const [item] = buildPublications(data, []);
  const expected = {
    comments: [1, "Comentários", "post_reply.post_id"],
    downvotes: [2, "Downvotes", "community_post.downvotes_count/post_vote"],
    reports: [1, "Denúncias", "post_report.post_id"],
    saves: [1, "Salvamentos", "post_save.post_id"],
    shares: [0, "Compartilhamentos", "post_share.post_id"],
    upvotes: [3, "Upvotes", "community_post.upvotes_count/post_vote"],
    views: [0, "Visualizações", "page_view_event.target_type=post/community_post"],
  } as const;
  assert.deepEqual(Object.keys(item.metrics).sort(), Object.keys(expected).sort());
  for (const [id, [value, label, source]] of Object.entries(expected)) {
    assert.deepEqual(item.metrics[id as keyof typeof item.metrics], {
      available: true,
      id,
      label,
      source,
      unavailable_reason: null,
      unit: "count",
      value,
    });
  }
  assert.equal(item.id, target.id);
  assert.equal(item.created_at, target.createdAt);
  assert.equal(item.title, target.title);
  assert.equal(item.content, target.content);
  assert.equal(item.excerpt, "Conteúdo de unidade.");
  assert.equal(item.source, "community_post");
  assert.equal(item.type, "post");
  assert.equal(item.type_label, "Post");
  assert.equal(item.public_url, "/comunidades/comunidade-unidade/publicacao/post-unidade");
  assert.equal(
    item.admin_statistics_url,
    "/comunidades/comunidade-unidade/conteudo/post/post-unidade",
  );
  assert.deepEqual(item.community, {
    avatar_url: null,
    color: "#112233",
    id: "comunidade-unidade",
    name: "Comunidade de unidade",
    slug: "comunidade-unidade",
  });
});

test("ordem recente com desempate por identificador não altera as entradas", () => {
  const older = post("antigo");
  older.createdAt = new Date("2026-01-04T12:00:00Z");
  const data = bundle([post("b"), older, post("a")]);
  const before = structuredClone(data);
  assert.deepEqual(
    buildPublications(data, []).map((item) => item.id),
    ["a", "b", "antigo"],
  );
  assert.deepEqual(data, before);
});
