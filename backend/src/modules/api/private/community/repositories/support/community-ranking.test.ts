import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import type { CommunityMentorRankingSignal } from "@/utils/community-mentor-ranking";
import type { ProfessionalReplyResult } from "./community-feed";
import type * as CommunityRanking from "./community-ranking";

process.env.DATABASE_URL ??= "postgresql://lectum:lectum@localhost:5432/lectum_test";
process.env.JWT_SECRET_KEY ??= "lectum-test-jwt-secret-key-32-bytes";

let compareProfessionalRepliesForHighlight: typeof CommunityRanking.compareProfessionalRepliesForHighlight;
let emptyTopMentorMetrics: typeof CommunityRanking.emptyTopMentorMetrics;
let isProfessionalReplyVideoHighlightCandidate: typeof CommunityRanking.isProfessionalReplyVideoHighlightCandidate;
let topMentorScore: typeof CommunityRanking.topMentorScore;
let topMentorsFormula: typeof CommunityRanking.topMentorsFormula;

describe("mentor profession label from profile gender", () => {
  it("uses the saved gender and keeps an inclusive fallback", async () => {
    const { authorTypeLabel } = await import("./community-ranking");
    assert.equal(authorTypeLabel("psicologo", "feminino"), "Psicóloga");
    assert.equal(authorTypeLabel("psicologo", "masculino"), "Psicólogo");
    for (const gender of [null, undefined, "", "outro", "prefiro-nao-informar"]) {
      assert.equal(authorTypeLabel("psicologo", gender), "Psicólogo(a)");
    }
  });
});

const professionalReply = ({
  createdAt = new Date("2026-09-16T12:00:00.000Z"),
  downvotes = 0,
  id,
  mediaType = null,
  mediaUrl = null,
  upvotes,
}: {
  createdAt?: Date;
  downvotes?: number;
  id: string;
  mediaType?: string | null;
  mediaUrl?: string | null;
  upvotes: number;
}): ProfessionalReplyResult => ({
  author: {
    active: true,
    avatar: null,
    deleted: false,
    id: `author-${id}`,
    name: `Psicologo ${id}`,
    psychologist_profile: {
      deleted: false,
      cfp_verified_at: new Date("2026-01-01T00:00:00.000Z"),
      crp: "06/123456",
      crp_status: "verificado",
      gender: "masculino",
      professional_first_name: "Psicologo",
      professional_last_name: id,
      subscriptions: [{ id: `subscription-${id}`, source: "admin_grant" }],
      whatsapp: null,
    },
    role: "psicologo",
  },
  content: `Resposta ${id}`,
  createdAt,
  downvotes_count: downvotes,
  edited_at: null,
  id,
  media_type: mediaType,
  media_url: mediaUrl,
  parent_reply: null,
  parent_reply_id: null,
  thumbnail_url: null,
  title: null,
  upvotes_count: upvotes,
});

describe("community highlighted professional reply ranking", () => {
  before(async () => {
    const module = await import("./community-ranking");

    compareProfessionalRepliesForHighlight = module.compareProfessionalRepliesForHighlight;
    emptyTopMentorMetrics = module.emptyTopMentorMetrics;
    isProfessionalReplyVideoHighlightCandidate = module.isProfessionalReplyVideoHighlightCandidate;
    topMentorScore = module.topMentorScore;
    topMentorsFormula = module.topMentorsFormula;
  });

  it("prioriza video mesmo quando uma resposta de texto tem mais votos", () => {
    const textReply = professionalReply({ id: "texto", upvotes: 100 });
    const videoReply = professionalReply({
      id: "video",
      mediaType: "video",
      mediaUrl: "/api/private/video-assets/video/playback",
      upvotes: 3,
    });
    const rankingSignals = new Map<string, CommunityMentorRankingSignal>();

    const [highlighted] = [textReply, videoReply].sort((a, b) =>
      compareProfessionalRepliesForHighlight(a, b, rankingSignals),
    );

    assert.equal(highlighted.id, videoReply.id);
  });

  it("mantem a maior pontuacao de votos entre videos candidatos", () => {
    const lessVotedVideo = professionalReply({
      id: "video-menos-votado",
      mediaType: "video",
      mediaUrl: "/api/private/video-assets/video-low/playback",
      upvotes: 10,
    });
    const moreVotedVideo = professionalReply({
      id: "video-mais-votado",
      mediaType: "video",
      mediaUrl: "/api/private/video-assets/video-high/playback",
      upvotes: 15,
    });
    const rankingSignals = new Map<string, CommunityMentorRankingSignal>();

    const [highlighted] = [lessVotedVideo, moreVotedVideo].sort((a, b) =>
      compareProfessionalRepliesForHighlight(a, b, rankingSignals),
    );

    assert.equal(highlighted.id, moreVotedVideo.id);
  });

  it("nao trata texto sem midia de video como candidato de destaque", () => {
    assert.equal(
      isProfessionalReplyVideoHighlightCandidate(professionalReply({ id: "texto", upvotes: 1 })),
      false,
    );
  });
});

describe("community top mentor score", () => {
  before(async () => {
    const module = await import("./community-ranking");

    emptyTopMentorMetrics = module.emptyTopMentorMetrics;
    topMentorScore = module.topMentorScore;
    topMentorsFormula = module.topMentorsFormula;
  });

  it("prioriza cobertura real de posts de pacientes sobre sinais invisiveis fracos", () => {
    const coverage = { ...emptyTopMentorMetrics(), reply_coverage_count: 1 };
    const invisibleSignals = { ...emptyTopMentorMetrics(), community_whatsapp_clicks: 3 };

    assert.ok(topMentorScore(coverage) > topMentorScore(invisibleSignals));
  });

  it("desempata positivamente quem responde mais vezes na mesma cobertura", () => {
    const oneReply = {
      ...emptyTopMentorMetrics(),
      replies_published: 1,
      reply_coverage_count: 1,
    };
    const twoReplies = {
      ...emptyTopMentorMetrics(),
      replies_published: 2,
      reply_coverage_count: 1,
    };

    assert.equal(topMentorScore(twoReplies) - topMentorScore(oneReply), 3);
  });

  it("aplica bonus especifico para video-respostas dentro da comunidade", () => {
    const textReply = {
      ...emptyTopMentorMetrics(),
      replies_published: 1,
      reply_coverage_count: 1,
    };
    const videoReply = {
      ...textReply,
      video_replies_published: 1,
    };

    assert.equal(topMentorScore(videoReply) - topMentorScore(textReply), 4);
  });

  it("expoe a formula vigente para auditoria do ranking", () => {
    const formula = topMentorsFormula();

    assert.equal(formula.upvote_weight, 4);
    assert.equal(formula.reply_weight, 3);
    assert.equal(formula.reply_coverage_weight, 10);
    assert.equal(formula.video_reply_weight, 4);
  });
});
