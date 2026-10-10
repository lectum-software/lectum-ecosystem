import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  featuredActivityDecay,
  featuredPostScore,
  professionalActivityScore,
} from "./community-featured";
import {
  emptyCommunityPostSortMetrics,
  type PostResult,
  type ProfessionalReplyResult,
  sortCommunityPostResults,
  sortGeneralFeedPostResults,
} from "./community-feed";
import {
  hasFeedVideoReply,
  isAvailableProfessionalVideoReply,
  readyFeedVideoAssetWhere,
  withAvailableProfessionalReplies,
} from "./community-feed-eligibility";
import {
  hasAvailableOriginalVideo,
  interleaveFeedGroups,
  isMixedFeedEligible,
  originalProfessionalScore,
  sortMixedFeedPosts,
} from "./community-feed-mix";
import { communityOpportunityWhere, resolveCommunityFeedSort } from "./community-feed-mode";
import { feedVariationWeight } from "./community-feed-variation";

const now = Date.now();
const daysAgo = (days: number) => new Date(now - days * 86_400_000);
const reply = (id: string, days = 7): ProfessionalReplyResult => ({
  id,
  title: null,
  content: "Contribuição",
  media_type: "video",
  media_url: "/public/files/posts/media/video.mp4",
  thumbnail_url: null,
  parent_reply_id: null,
  parent_reply: null,
  createdAt: daysAgo(days),
  edited_at: null,
  upvotes_count: 0,
  downvotes_count: 0,
  author: {
    id: `professional-${id}`,
    active: true,
    deleted: false,
    name: "Profissional",
    avatar: null,
    role: "psicologo",
    psychologist_profile: {
      deleted: false,
      cfp_verified_at: daysAgo(400),
      crp_status: "aprovado",
      crp: null,
      professional_first_name: null,
      professional_last_name: null,
      gender: null,
      whatsapp: null,
      subscriptions: [{ id: "subscription", source: "admin_grant" }],
    },
  },
});

const post = (id: string, count = 0, days = 7): PostResult => ({
  id,
  title: "Pergunta",
  content: "Conteúdo",
  anonymous: true,
  status: "publicado",
  createdAt: daysAgo(days),
  edited_at: null,
  upvotes_count: 0,
  downvotes_count: 0,
  replies_count: count,
  saves_count: 0,
  media_url: null,
  media_type: null,
  thumbnail_url: null,
  media_items: [],
  replies: Array.from({ length: count }, (_, index) => reply(`${id}-${index}`, days)),
  author: { ...reply("patient").author, role: "paciente", psychologist_profile: null },
  community: {
    id: "community",
    slug: "community",
    name: "Comunidade",
    description: null,
    category: null,
    members_count: 0,
    avatar_url: null,
    visual_primary_color: null,
    visual_primary_dark_color: null,
    visual_soft_color: null,
    visual_text_color: null,
    visual_gradient_color: null,
    createdAt: daysAgo(400),
  },
});

describe("destaque por acolhimento profissional recente", () => {
  it("aplica meia-vida individual de 14 dias sem favorecer datas futuras", () => {
    assert.equal(featuredActivityDecay(daysAgo(14), now), 0.5);
    assert.equal(featuredActivityDecay(daysAgo(-1), now), 1);
    assert.equal(featuredActivityDecay(new Date("invalid"), now), 0);
  });

  it("10 respostas de sete dias superam 50 de um ano nas duas ordenações", () => {
    const recent = post("recent", 10, 7);
    const old = post("old", 50, 365);
    const metrics = new Map();
    assert.deepEqual(
      sortCommunityPostResults([old, recent], "featured", "all", metrics).map((p) => p.id),
      ["recent", "old"],
    );
    assert.deepEqual(
      sortGeneralFeedPostResults([old, recent], metrics).map((p) => p.id),
      ["recent", "old"],
    );
  });

  it("uma resposta nova não renova cinquenta antigas; texto também pontua", () => {
    const old = post("old", 50, 365);
    const previous = professionalActivityScore(old.replies, now);
    const text = { ...reply("new", 0), media_type: null, media_url: null };
    old.replies.push(text);
    assert.ok(Math.abs(professionalActivityScore(old.replies, now) - previous - 40) < 1e-9);
    assert.ok(
      professionalActivityScore(post("recent", 10, 7).replies, now) >
        professionalActivityScore(old.replies, now),
    );
    old.replies[0].edited_at = daysAgo(0);
    assert.ok(Math.abs(professionalActivityScore(old.replies, now) - previous - 40) < 1e-9);
  });

  it("bonifica profissionais distintos sem confundir comentário com resposta direta", () => {
    const first = reply("first", 0);
    const same = { ...reply("same", 0), author: first.author };
    assert.equal(professionalActivityScore([first, same], now), 70);
    assert.equal(professionalActivityScore([first, reply("distinct", 0)], now), 80);
    assert.equal(professionalActivityScore([{ ...first, parent_reply_id: "comment" }], now), 0);
    assert.equal(
      professionalActivityScore([{ ...first, author: { ...first.author, deleted: true } }], now),
      0,
    );
  });

  it("engajamento não profissional é limitado e não domina uma resposta recente", () => {
    const metrics = emptyCommunityPostSortMetrics();
    metrics.upvotes.all = 1_000_000;
    metrics.comments.all = 1_000_000;
    metrics.shares_count = 1_000_000;
    assert.equal(featuredPostScore(post("viral", 0, 0), metrics, now), 10);
    assert.equal(featuredPostScore(post("professional", 1, 0), metrics, now), 50);
    metrics.penalty = 1_000_000;
    assert.equal(featuredPostScore(post("penalized", 1, 0), metrics, now), 0);
  });

  it("sem respostas permanece na comunidade; novos e oportunidades preservados", () => {
    const newPost = post("new", 0, 0);
    const answered = post("answered", 3, 7);
    const old = post("old", 5, 365);
    const metrics = new Map([
      [answered.id, { ...emptyCommunityPostSortMetrics(), psychologist_replies_count: 3 }],
    ]);
    assert.equal(sortCommunityPostResults([answered, newPost], "new", "all", metrics)[0].id, "new");
    assert.deepEqual(
      sortCommunityPostResults([answered, old, newPost], "opportunities", "all", metrics).map(
        (p) => p.id,
      ),
      ["new", "answered"],
    );
    assert.equal(sortCommunityPostResults([newPost], "featured", "all", metrics).length, 1);
    assert.equal(hasFeedVideoReply(newPost), false);
  });

  it("mais úteis e comentados continuam usando período, com desempate estável", () => {
    const a = post("a", 1);
    const b = post("b", 2);
    const aMetrics = emptyCommunityPostSortMetrics();
    const bMetrics = emptyCommunityPostSortMetrics();
    aMetrics.comments.week = 3;
    bMetrics.upvotes.week = 4;
    const metrics = new Map([
      [a.id, aMetrics],
      [b.id, bMetrics],
    ]);
    assert.equal(sortCommunityPostResults([a, b], "commented", "week", metrics)[0].id, "a");
    assert.equal(sortCommunityPostResults([a, b], "voted", "week", metrics)[0].id, "b");
    assert.deepEqual(
      sortCommunityPostResults([post("a"), post("b")], "featured", "all", new Map()).map(
        (p) => p.id,
      ),
      ["b", "a"],
    );
  });
});

describe("elegibilidade do feed antes da paginação", () => {
  it("aceita somente vídeo direto profissional, nunca vídeo do post/texto/comentário", () => {
    const valid = post("valid", 1);
    const text = post("text", 1);
    text.replies[0].media_type = null;
    text.replies[0].media_url = null;
    const nested = post("nested", 1);
    nested.replies[0].parent_reply_id = "parent";
    const ownVideo = post("own");
    ownVideo.media_type = "video";
    ownVideo.media_url = valid.replies[0].media_url;
    const unverified = post("unverified", 1);
    unverified.replies[0].author.psychologist_profile = null;
    const removed = { ...valid, id: "removed", status: "removido" };
    const all = withAvailableProfessionalReplies(
      [text, nested, ownVideo, unverified, removed, valid],
      new Map(),
    );
    const eligible = all.filter(hasFeedVideoReply);
    assert.equal(eligible.length, 1);
    assert.equal(eligible.slice(0, 1)[0].id, "valid");
    assert.equal(eligible.slice(1, 2).length, 0);
    assert.equal(all.length, 6);
  });

  it("rejeita mídia ausente/inválida, autor excluído e asset não ready", () => {
    const video = reply("video");
    for (const media_url of [null, "", " ", "https://example.com/video.mp4"]) {
      assert.equal(
        isAvailableProfessionalVideoReply({ ...video, media_url }, "post", new Map()),
        false,
      );
    }
    video.author.deleted = true;
    assert.equal(isAvailableProfessionalVideoReply(video, "post", new Map()), false);
    assert.deepEqual(readyFeedVideoAssetWhere, {
      deleted: false,
      provider: "cloudflare_stream",
      status: "ready",
      purpose: "community_reply",
      owner: { active: true, deleted: false },
    });
  });

  it("Stream exige asset pronto do mesmo autor e post; filtra vídeo indisponível da prévia", () => {
    const video = reply("stream");
    video.media_url = "/api/private/video-assets/asset_12345678/playback";
    const assets = new Map([
      ["asset_12345678", { id: "asset_12345678", owner_id: video.author.id, context_id: "post" }],
    ]);
    assert.equal(isAvailableProfessionalVideoReply(video, "post", assets), true);
    assert.equal(isAvailableProfessionalVideoReply(video, "other", assets), false);
    assert.equal(isAvailableProfessionalVideoReply(video, "post", new Map()), false);
    assert.equal(
      isAvailableProfessionalVideoReply(
        { ...video, author: { ...video.author, id: "other" } },
        "post",
        assets,
      ),
      false,
    );
    const original = { ...post("post"), replies: [video] };
    assert.equal(hasFeedVideoReply(withAvailableProfessionalReplies([original], assets)[0]), true);
    assert.equal(
      hasFeedVideoReply(withAvailableProfessionalReplies([original], new Map())[0]),
      false,
    );
    assert.equal(original.replies.length, 1);
  });
});

const original = (id: string, days = 7): PostResult => ({
  ...post(id, 0, days),
  author: reply(id).author,
});
describe("feed misto profissional 4:1", () => {
  it("admite texto profissional verificado sem respostas, mas nao paciente sem video", () => {
    assert.equal(isMixedFeedEligible(original("pro")), true);
    assert.equal(isMixedFeedEligible(post("patient")), false);
    assert.equal(isMixedFeedEligible(post("answered", 1)), true);
    const invalid = original("invalid");
    invalid.author.active = false;
    assert.equal(isMixedFeedEligible(invalid), false);
    invalid.author.active = true;
    invalid.author.deleted = true;
    assert.equal(isMixedFeedEligible(invalid), false);
    invalid.author.deleted = false;
    if (invalid.author.psychologist_profile) invalid.author.psychologist_profile.deleted = true;
    assert.equal(isMixedFeedEligible(invalid), false);
    invalid.author.psychologist_profile = null;
    assert.equal(isMixedFeedEligible(invalid), false);
    const removed = original("removed");
    removed.status = "removido";
    assert.equal(isMixedFeedEligible(removed), false);
  });
  it("intercala globalmente e completa filas curtas ou vazias", () => {
    assert.deepEqual(
      interleaveFeedGroups([1, 2, 3, 4, 5, 6, 7, 8, 9], ["a", "b", "c"] as (number | string)[]),
      [1, 2, 3, 4, "a", 5, 6, 7, 8, "b", 9, "c"],
    );
    assert.deepEqual(interleaveFeedGroups([1], [2, 3, 4]), [1, 2, 3, 4]);
    assert.deepEqual(interleaveFeedGroups([], [2, 3]), [2, 3]);
    assert.deepEqual(interleaveFeedGroups([1, 2], []), [1, 2]);
    assert.deepEqual(interleaveFeedGroups([], []), []);
  });
  it("bonus de video e unico e moderado, texto util/recente supera video antigo", () => {
    const metrics = emptyCommunityPostSortMetrics();
    const item = original("pro");
    const base = originalProfessionalScore(item, metrics, false, now);
    assert.equal(originalProfessionalScore(item, metrics, true, now), base * 1.15);
    assert.ok(
      originalProfessionalScore(original("recent", 1), metrics, false, now) >
        originalProfessionalScore(original("old", 365), metrics, true, now),
    );
    const useful = emptyCommunityPostSortMetrics();
    useful.upvotes.all = 5;
    assert.ok(
      originalProfessionalScore(item, useful, false, now) >
        originalProfessionalScore(item, metrics, true, now),
    );
    useful.penalty = 999;
    assert.equal(originalProfessionalScore(item, useful, true, now), 0);
  });
  it("valida video proprio Stream por owner/slug de comunidade e respeita carrossel", () => {
    const item = original("post-id");
    item.media_type = "video";
    item.media_url = "/api/private/video-assets/asset_original/playback";
    const assets = new Map([
      [
        "asset_original",
        { id: "asset_original", owner_id: item.author.id, context_id: item.community.slug },
      ],
    ]);
    assert.equal(hasAvailableOriginalVideo(item, assets), true);
    assert.equal(hasAvailableOriginalVideo(item, new Map()), false);
    assets.get("asset_original")!.owner_id = "another";
    assert.equal(hasAvailableOriginalVideo(item, assets), false);
    assets.get("asset_original")!.owner_id = item.author.id;
    assets.get("asset_original")!.context_id = "another";
    assert.equal(hasAvailableOriginalVideo(item, assets), false);
    item.media_url = "/public/files/posts/media/video.mp4";
    assert.equal(hasAvailableOriginalVideo(item, new Map()), true);
    item.media_items = [
      {
        id: "image",
        media_type: "image",
        media_url: "/public/files/posts/media/image.jpg",
        thumbnail_url: null,
        position: 0,
      },
    ];
    assert.equal(hasAvailableOriginalVideo(item, new Map()), false);
    item.media_items.push({
      id: "video",
      media_type: "video",
      media_url: "/public/files/posts/media/video.mp4",
      thumbnail_url: null,
      position: 1,
    });
    assert.equal(hasAvailableOriginalVideo(item, new Map()), true);
    item.media_items[1].media_url = "https://untrusted.example/video.mp4";
    assert.equal(hasAvailableOriginalVideo(item, new Map()), false);
  });
  it("profissional respondido ocupa uma unica fila e paginacao nao reinicia ciclo", () => {
    const patients = Array.from({ length: 13 }, (_, i) => post(`patient-${i}`, 1));
    const pros = Array.from({ length: 4 }, (_, i) => original(`pro-${i}`));
    pros[0].replies = [reply("answer")];
    const input = [...pros, ...patients, pros[0], post("excluded")];
    const result = sortMixedFeedPosts(input, new Map(), new Set(), now);
    assert.equal(result.length, 17);
    assert.equal(new Set(result.map((p) => p.id)).size, 17);
    assert.deepEqual(
      result.slice(0, 15).map((p) => p.author.role),
      Array.from({ length: 3 }, () => [
        "paciente",
        "paciente",
        "paciente",
        "paciente",
        "psicologo",
      ]).flat(),
    );
    const pages = [result.slice(0, 12), result.slice(12, 24)];
    assert.deepEqual(
      pages.flat().map((p) => p.id),
      result.map((p) => p.id),
    );
    assert.deepEqual(
      sortMixedFeedPosts([...input].reverse(), new Map(), new Set(), now).map((p) => p.id),
      result.map((p) => p.id),
    );
  });
});

it("variacao e determinista, limitada a 5%, preserva 4:1 e altera empates", () => {
  const items = [
    ...Array.from({ length: 16 }, (_, i) => post(String(i), 1)),
    ...Array.from({ length: 5 }, (_, i) => original(String(i + 20))),
  ];
  const run = (seed: number) => sortMixedFeedPosts(items, new Map(), new Set(), now, seed);
  assert.deepEqual(run(17), run(17));
  assert.notDeepEqual(
    run(17).map((p) => p.id),
    run(71).map((p) => p.id),
  );
  for (const seed of [17, 71]) {
    const result = run(seed);
    assert.equal(new Set(result.map((p) => p.id)).size, items.length);
    assert.deepEqual(
      result.slice(0, 20).map((p) => p.author.role),
      Array.from({ length: 4 }, () => [
        "paciente",
        "paciente",
        "paciente",
        "paciente",
        "psicologo",
      ]).flat(),
    );
    for (const item of items) {
      const w = feedVariationWeight(item.id, seed);
      assert.ok(w >= 0.95 && w <= 1.05);
    }
  }
  assert.equal(feedVariationWeight("id", 0), 1);
  assert.equal(feedVariationWeight("id", Number.NaN), 1);
  const dominant = original("dominant", 1);
  const old = original("old", 365);
  for (let seed = 1; seed <= 100; seed++)
    assert.equal(
      sortMixedFeedPosts([old, dominant], new Map(), new Set([old.id]), now, seed)[0].id,
      dominant.id,
    );
});

describe("modos do feed profissional", () => {
  it("paciente e visitante nao mudam destaque via query; clientes antigos preservados", () => {
    for (const sort of ["opportunities", "featured", "new", "commented", "voted", undefined]) {
      assert.equal(resolveCommunityFeedSort("paciente", sort), "featured");
      assert.equal(resolveCommunityFeedSort(undefined, sort), "featured");
      assert.equal(resolveCommunityFeedSort("psicologo", sort), sort ?? "featured");
    }
  });
  it("oportunidades usa mesma janela e exclui autores profissionais, nao todos os respondidos", () => {
    const where = communityOpportunityWhere("opportunities");
    assert.deepEqual(where.author, { role: { not: "psicologo" } });
    assert.ok(where.createdAt);
    assert.deepEqual(communityOpportunityWhere("featured"), {});
    const unanswered = post("unanswered", 0, 1);
    const answered = post("answered", 2, 2);
    const professional = { ...post("professional", 0, 0), author: reply("professional").author };
    const old = post("old", 0, 365);
    const metrics = new Map([
      [answered.id, { ...emptyCommunityPostSortMetrics(), psychologist_replies_count: 2 }],
    ]);
    assert.deepEqual(
      sortCommunityPostResults(
        [old, professional, answered, unanswered],
        "opportunities",
        "all",
        metrics,
      ).map((p) => p.id),
      ["unanswered", "answered"],
    );
    for (const sort of ["new", "commented", "voted"] as const) {
      assert.equal(
        sortCommunityPostResults([unanswered, professional], sort, "week", metrics).length,
        2,
      );
    }
    assert.equal(isMixedFeedEligible(unanswered), false);
    assert.equal(isMixedFeedEligible(professional), true);
  });
});
