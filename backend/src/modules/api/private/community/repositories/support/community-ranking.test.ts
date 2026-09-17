import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import type { CommunityMentorRankingSignal } from "@/utils/community-mentor-ranking";
import type { ProfessionalReplyResult } from "./community-feed";
import type * as CommunityRanking from "./community-ranking";

process.env.DATABASE_URL ??= "postgresql://lectum:lectum@localhost:5432/lectum_test";
process.env.JWT_SECRET_KEY ??= "lectum-test-jwt-secret-key-32-bytes";

let compareProfessionalRepliesForHighlight: typeof CommunityRanking.compareProfessionalRepliesForHighlight;
let isProfessionalReplyVideoHighlightCandidate: typeof CommunityRanking.isProfessionalReplyVideoHighlightCandidate;

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
    avatar: null,
    deleted: false,
    id: `author-${id}`,
    name: `Psicologo ${id}`,
    psychologist_profile: {
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
    isProfessionalReplyVideoHighlightCandidate = module.isProfessionalReplyVideoHighlightCandidate;
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
