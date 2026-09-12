import assert from "node:assert/strict";
import { test } from "node:test";
import { mapPostPublication } from "./post-publication";
import { toCountMap } from "./visibility-series";

type Post = Parameters<typeof mapPostPublication>[0];
type Maps = Parameters<typeof mapPostPublication>[1];

const post = (): Post => ({
  community: {
    avatar_url: null,
    id: "comunidade-unidade",
    name: "Comunidade de unidade",
    slug: "comunidade-unidade",
    visual_primary_color: "#112233",
  },
  content: "  Conteúdo\n da publicação. ",
  createdAt: new Date("2026-01-05T12:00:00Z"),
  downvotes_count: 2,
  id: "publicacao-unidade",
  media_items: [],
  media_type: null,
  media_url: null,
  replies_count: 30,
  reports: [{ id: "denuncia-unidade" }],
  saves_count: 40,
  title: "Publicação de unidade",
  upvotes_count: 3,
});

const maps = (): Maps => ({
  commentsReceivedByPost: new Map(),
  postSavesByPost: new Map(),
  postSharesByPost: new Map(),
  postViewsByPost: new Map(),
  postWhatsappClicksByPost: new Map(),
});

test("comentários sem relação elegível não reutilizam contador agregado", () => {
  const item = mapPostPublication(post(), maps());
  assert.equal(item.metrics.comments.value, 0);
  assert.equal(item.metrics.comments.available, true);
});

test("salvamentos sem relação elegível não reutilizam contador agregado", () => {
  const item = mapPostPublication(post(), maps());
  assert.equal(item.metrics.saves.value, 0);
  assert.equal(item.metrics.saves.available, true);
});

test("zero explícito tem o mesmo significado da ausência de chave", () => {
  const input = post();
  const counts = maps();
  counts.commentsReceivedByPost.set(input.id, 0);
  counts.postSavesByPost.set(input.id, 0);
  assert.deepEqual(mapPostPublication(input, counts), mapPostPublication(input, maps()));
});

test("relações elegíveis positivas prevalecem mesmo com agregados diferentes", () => {
  const input = post();
  const counts = maps();
  counts.commentsReceivedByPost.set(input.id, 2);
  counts.postSavesByPost.set(input.id, 5);
  const item = mapPostPublication(input, counts);
  assert.equal(item.metrics.comments.value, 2);
  assert.equal(item.metrics.saves.value, 5);
});

test("chaves de outra publicação não alteram os zeros da publicação atual", () => {
  const counts = maps();
  counts.commentsReceivedByPost.set("outra-publicacao", 7);
  counts.postSavesByPost.set("outra-publicacao", 9);
  const item = mapPostPublication(post(), counts);
  assert.equal(item.metrics.comments.value, 0);
  assert.equal(item.metrics.saves.value, 0);
});

test("comentários positivos não transformam ausência de salvamentos em agregado", () => {
  const input = post();
  const counts = maps();
  counts.commentsReceivedByPost.set(input.id, 8);
  const item = mapPostPublication(input, counts);
  assert.equal(item.metrics.comments.value, 8);
  assert.equal(item.metrics.saves.value, 0);
});

test("salvamentos positivos não transformam ausência de comentários em agregado", () => {
  const input = post();
  const counts = maps();
  counts.postSavesByPost.set(input.id, 6);
  const item = mapPostPublication(input, counts);
  assert.equal(item.metrics.comments.value, 0);
  assert.equal(item.metrics.saves.value, 6);
});

test("agregador real de relações vazio produz zero disponível no mapper real", () => {
  const counts = maps();
  counts.commentsReceivedByPost = toCountMap<{ post_id: string }>([], "post_id");
  counts.postSavesByPost = toCountMap<{ post_id: string }>([], "post_id");
  const item = mapPostPublication(post(), counts);
  assert.equal(item.metrics.comments.value, 0);
  assert.equal(item.metrics.saves.value, 0);
});

test("agregador real separa relações por publicação sem descartar contagens", () => {
  const input = post();
  const counts = maps();
  counts.commentsReceivedByPost = toCountMap(
    [{ post_id: input.id }, { post_id: "outra" }, { post_id: input.id }],
    "post_id",
  );
  counts.postSavesByPost = toCountMap([{ post_id: input.id }], "post_id");
  const item = mapPostPublication(input, counts);
  assert.equal(item.metrics.comments.value, 2);
  assert.equal(item.metrics.saves.value, 1);
});

test("contrato de disponibilidade, fontes e demais métricas permanece estável", () => {
  const input = post();
  const counts = maps();
  counts.commentsReceivedByPost.set(input.id, 4);
  counts.postSavesByPost.set(input.id, 5);
  counts.postSharesByPost.set(input.id, 6);
  counts.postViewsByPost.set(input.id, 7);
  counts.postWhatsappClicksByPost.set(input.id, 8);
  const item = mapPostPublication(input, counts);
  const expected = {
    comments: [4, "Comentários", "post_reply.post_id"],
    downvotes: [2, "Downvotes", "community_post.downvotes_count/post_vote"],
    reports: [1, "Denúncias", "post_report.post_id"],
    saves: [5, "Salvamentos", "post_save"],
    shares: [6, "Compartilhamentos", "post_share"],
    upvotes: [3, "Upvotes", "community_post.upvotes_count/post_vote"],
    views: [7, "Visualizações", "page_view_event.target_type=post/community_post"],
    whatsapp_clicks: [
      8,
      "Cliques WhatsApp",
      "important_action_event.action_type=whatsapp_click+target_type=post/community_post",
    ],
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
  assert.equal(item.id, input.id);
  assert.equal(item.type, "post");
  assert.equal(item.source, "community_post");
  assert.equal(item.title, input.title);
  assert.equal(item.excerpt, "Conteúdo da publicação.");
  assert.equal(item.created_at, input.createdAt);
  assert.equal(item.public_url, "/comunidades/comunidade-unidade/publicacao/publicacao-unidade");
  assert.deepEqual(item.community, {
    avatar_url: null,
    color: "#112233",
    id: "comunidade-unidade",
    name: "Comunidade de unidade",
    slug: "comunidade-unidade",
  });
  assert.equal(item.media, null);
});

test("seleção da mídia preserva primeiro item e alternativa legada", () => {
  const input = post();
  input.media_type = "image";
  input.media_url = "/midia-legada.png";
  assert.deepEqual(mapPostPublication(input, maps()).media, {
    type: "image",
    url: "/midia-legada.png",
  });
  input.media_items = [{ media_type: "image", media_url: "/primeira.png", position: 0 }];
  assert.deepEqual(mapPostPublication(input, maps()).media, {
    type: "image",
    url: "/primeira.png",
  });
});

test("mapeamento não altera entradas ou contadores persistidos", () => {
  const input = Object.freeze(post());
  const counts = maps();
  const beforePost = structuredClone(input);
  const beforeMaps = structuredClone(counts);
  const first = mapPostPublication(input, counts);
  assert.deepEqual(mapPostPublication(input, counts), first);
  assert.deepEqual(input, beforePost);
  assert.deepEqual(counts, beforeMaps);
});
