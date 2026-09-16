import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ProfessionalReplyResult } from "./post-response";
import { selectHighlightedListProfessionalReply } from "./post-response";

const listReply = ({
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

describe("post list highlighted professional reply", () => {
  it("seleciona o video mais votado mesmo quando texto tem mais votos", () => {
    const textReply = listReply({ id: "texto", upvotes: 90 });
    const lowVideo = listReply({
      id: "video-baixo",
      mediaType: "video",
      mediaUrl: "/api/private/video-assets/video-low/playback",
      upvotes: 2,
    });
    const topVideo = listReply({
      id: "video-top",
      mediaType: "video",
      mediaUrl: "/api/private/video-assets/video-top/playback",
      upvotes: 8,
    });

    assert.equal(
      selectHighlightedListProfessionalReply([textReply, lowVideo, topVideo])?.id,
      topVideo.id,
    );
  });

  it("nao devolve resposta em destaque quando nao existe video profissional", () => {
    assert.equal(
      selectHighlightedListProfessionalReply([listReply({ id: "texto", upvotes: 5 })]),
      undefined,
    );
  });
});
