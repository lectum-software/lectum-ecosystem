import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  COMMUNITY_MENTOR_WHATSAPP_POST_TARGET_TYPES,
  COMMUNITY_MENTOR_WHATSAPP_REPLY_TARGET_TYPES,
  countCommunityMentorWhatsappClicks,
} from "./community-mentor-whatsapp-counts";

const posts = [{ id: "post-a", author_id: "mentor-a" }];
const replies = [{ id: "reply-b", author_id: "mentor-b" }];
const group = (
  target_type: string | null,
  target_id: string | null,
  user_id: string | null = null,
  count = 1,
) => ({ target_type, target_id, user_id, _count: { _all: count } });

describe("contagem de WhatsApp comunitário por mentor", () => {
  for (const targetType of COMMUNITY_MENTOR_WHATSAPP_POST_TARGET_TYPES) {
    it(`atribui ${targetType} ao autor do post`, () => {
      assert.deepEqual(
        countCommunityMentorWhatsappClicks(posts, replies, [group(targetType, "post-a")]),
        new Map([["mentor-a", 1]]),
      );
    });
  }

  for (const targetType of COMMUNITY_MENTOR_WHATSAPP_REPLY_TARGET_TYPES) {
    it(`atribui ${targetType} ao autor da resposta`, () => {
      assert.deepEqual(
        countCommunityMentorWhatsappClicks(posts, replies, [group(targetType, "reply-b")]),
        new Map([["mentor-b", 1]]),
      );
    });
  }

  it("soma eventos persistidos agrupados sem confundir eventos com atores únicos", () => {
    assert.deepEqual(
      countCommunityMentorWhatsappClicks(posts, replies, [
        group("community_post", "post-a", "terceiro", 3),
        group("post", "post-a", null, 2),
        group("post_reply", "reply-b", null, 4),
      ]),
      new Map([
        ["mentor-a", 5],
        ["mentor-b", 4],
      ]),
    );
  });

  it("exclui apenas autoações autenticadas para todos os tipos e aliases", () => {
    assert.deepEqual(
      countCommunityMentorWhatsappClicks(posts, replies, [
        group("community_post", "post-a", "mentor-a", 3),
        group("post", "post-a", "mentor-a", 2),
        group("post_reply", "reply-b", "mentor-b", 4),
        group("reply", "reply-b", "mentor-b", 5),
      ]),
      new Map(),
    );
  });

  it("preserva terceiro mesmo quando ele também é mentor candidato", () => {
    assert.deepEqual(
      countCommunityMentorWhatsappClicks(posts, replies, [
        group("community_post", "post-a", "mentor-b"),
        group("post_reply", "reply-b", "mentor-a"),
      ]),
      new Map([
        ["mentor-a", 1],
        ["mentor-b", 1],
      ]),
    );
  });

  it("preserva anônimos sem inferir que sejam o dono do conteúdo", () => {
    assert.deepEqual(
      countCommunityMentorWhatsappClicks(posts, replies, [
        group("community_post", "post-a", null, 2),
      ]),
      new Map([["mentor-a", 2]]),
    );
  });

  it("não atribui perfil genérico, contato, alvo ausente ou tipo incompatível", () => {
    assert.deepEqual(
      countCommunityMentorWhatsappClicks(posts, replies, [
        group("psychologist", "mentor-a"),
        group("psychologist", "post-a"),
        group("contact_request", "post-a"),
        group("community_post", "reply-b"),
        group("post_reply", "post-a"),
        group("community_post", "fora-do-escopo"),
        group("community_post", null),
        group(null, "post-a"),
        group("COMMUNITY_POST", "post-a"),
      ]),
      new Map(),
    );
  });

  it("resolve tipo e ID em conjunto mesmo com colisão de IDs entre tabelas", () => {
    assert.deepEqual(
      countCommunityMentorWhatsappClicks(
        [{ id: "mesmo-id", author_id: "mentor-a" }],
        [{ id: "mesmo-id", author_id: "mentor-b" }],
        [group("post", "mesmo-id", null, 2), group("reply", "mesmo-id", "mentor-a", 3)],
      ),
      new Map([
        ["mentor-a", 2],
        ["mentor-b", 3],
      ]),
    );
  });

  it("mantém ausência de sinal quando não há eventos ou alvos elegíveis", () => {
    assert.deepEqual(countCommunityMentorWhatsappClicks(posts, replies, []), new Map());
    assert.deepEqual(
      countCommunityMentorWhatsappClicks([], [], [group("post", "post-a")]),
      new Map(),
    );
  });

  it("não modifica alvos ou eventos recebidos", () => {
    const immutablePosts = Object.freeze(posts.map((post) => Object.freeze({ ...post })));
    const immutableReplies = Object.freeze(replies.map((reply) => Object.freeze({ ...reply })));
    const action = Object.freeze({
      ...group("community_post", "post-a"),
      _count: Object.freeze({ _all: 2 }),
    });
    const immutableGroups = Object.freeze([action]);
    const before = JSON.stringify([immutablePosts, immutableReplies, immutableGroups]);

    assert.deepEqual(
      countCommunityMentorWhatsappClicks(immutablePosts, immutableReplies, immutableGroups),
      new Map([["mentor-a", 2]]),
    );
    assert.equal(JSON.stringify([immutablePosts, immutableReplies, immutableGroups]), before);
  });
});
