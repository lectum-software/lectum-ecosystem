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
    deleted: false,
    name: "Profissional",
    avatar: null,
    role: "psicologo",
    psychologist_profile: {
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
