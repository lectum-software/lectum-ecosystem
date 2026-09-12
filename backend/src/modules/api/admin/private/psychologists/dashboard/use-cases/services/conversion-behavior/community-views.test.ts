import assert from "node:assert/strict";
import { test } from "node:test";
import { buildCommunityTrafficPlatformMetrics } from "../traffic/community";
import { buildProfileConversionBehaviorRowContext } from "./context";

type ContextInput = Parameters<typeof buildProfileConversionBehaviorRowContext>[0];
type Dataset = ContextInput["params"]["communityTrafficPlatformMetricDataset"];
type Profile = ContextInput["rowProfiles"][number];
type CommunityMetrics = ReturnType<typeof buildCommunityTrafficPlatformMetrics>["metrics"];
type SourceId = Parameters<CommunityMetrics["get"]>[0];

const AUTHOR_ID = "psychologist-unit";
const instant = (offsetMs = 0) => new Date(Date.UTC(2026, 7, 15, 12) + offsetMs);

// Typed unit inputs only: no repository, API, application bootstrap or replaced dependency.
const profile = (id = AUTHOR_ID): Profile => ({
  accepts_insurance: false,
  academic_formations: null,
  academic_graduation_year: null,
  academic_institution: null,
  academic_title: null,
  available_days: null,
  bio: null,
  cfp_verified_at: null,
  cover_image_url: null,
  cpf: null,
  createdAt: instant(),
  crp: null,
  crp_registration_date: null,
  crp_status: "pendente",
  discount_first_session: false,
  gender: null,
  headline: null,
  id: `profile-${id}`,
  languages: null,
  modality: null,
  professional_address_city: null,
  professional_address_state: null,
  published: true,
  race_color: null,
  rating_avg: 0,
  rating_count: 0,
  religion: null,
  show_experience_tag: false,
  social_value: false,
  subscriptions: [],
  target_audience: null,
  updatedAt: instant(),
  user: {
    avatar: null,
    createdAt: instant(),
    email: "unit@example.invalid",
    id,
    name: "Unit",
    provider: null,
    psychologist_approaches: [],
    psychologist_services: [],
    psychologist_specialties: [],
  },
  user_id: id,
  video_url: null,
  whatsapp: null,
});

const post = (id = "post-unit", authorId = AUTHOR_ID): Dataset["posts"][number] => ({
  author_id: authorId,
  createdAt: instant(),
  id,
  media_items: [],
  media_type: null,
});

const reply = (id = "reply-unit", authorId = AUTHOR_ID): Dataset["replies"][number] => ({
  author_id: authorId,
  createdAt: instant(),
  id,
  media_type: null,
  parent_reply_id: null,
  post: {
    author: { role: "psychologist" },
    author_id: AUTHOR_ID,
    createdAt: instant(),
    id: "post-unit",
  },
  post_id: "post-unit",
});

const view = (
  targetType: string | null,
  targetId: string | null,
  offsetMs = 0,
  sessionId = "session-unit",
): Dataset["pageViews"][number] => ({
  occurred_at: instant(offsetMs),
  session_id: sessionId,
  target_id: targetId,
  target_type: targetType,
});

const dataset = (overrides: Partial<Dataset> = {}): Dataset => ({
  attentionSessions: [],
  comments: [],
  pageViews: [],
  posts: [],
  postSaves: [],
  replies: [],
  replySaves: [],
  shares: [],
  videoWatchSessions: [],
  votes: [],
  ...overrides,
});

const input = (communityDataset: Dataset, profiles = [profile()]): ContextInput => ({
  params: {
    communityTrafficPlatformMetricDataset: communityDataset,
    profileTrafficPlatformMetricDataset: {
      favorites: [],
      pageViews: [],
      profileViews: [],
      tabActions: [],
      videoActions: [],
      videoWatchSessions: [],
    },
    profiles,
    range: { start: new Date("2026-08-01T00:00:00Z"), end: new Date("2026-09-01T00:00:00Z") },
    rankingPositionsByPsychologistId: new Map<string, number>(),
    receivedEngagementEvents: [],
    trafficCommunityPosts: communityDataset.posts,
    trafficCommunityReplies: communityDataset.replies,
    whatsappContactRequests: [],
    whatsappTrafficActions: [],
  },
  row: {
    count: profiles.length,
    description: "Unit cohort",
    id: "no_conversion",
    label: "Sem conversão",
    percentage: 100,
    totals: { whatsapp_clicks: 0 },
  },
  rowProfiles: profiles,
});

const context = (communityDataset: Dataset, profiles = [profile()]) =>
  buildProfileConversionBehaviorRowContext(input(communityDataset, profiles));

const metricValue = (communityDataset: Dataset, sourceId: SourceId, metricId: string) => {
  const metric = buildCommunityTrafficPlatformMetrics(communityDataset)
    .metrics.get(sourceId)
    ?.find((candidate) => candidate.id === metricId);
  assert.ok(metric, `${sourceId}/${metricId}`);
  return metric.value;
};

test("visitar somente o perfil não conta como visualização do post existente", () => {
  const result = context(
    dataset({ posts: [post()], pageViews: [view("psychologist", AUTHOR_ID)] }),
  );

  assert.equal(result.communityContentCount, 1);
  assert.equal(result.rowCommunityTrafficDataset.pageViews.length, 1);
  assert.equal(result.communityViewsPerContent, 0);
});

test("conteúdo existente sem visitas tem média zero disponível", () => {
  const result = context(dataset({ posts: [post()], replies: [reply()] }));

  assert.equal(result.communityContentCount, 2);
  assert.equal(result.communityViewsPerContent, 0);
  assert.equal(result.communityContentUnavailableReason, null);
});

for (const targetType of ["post", "community_post", "reply", "post_reply"]) {
  test(`alias ${targetType} conta visitas reais ao conteúdo sem deduplicar a sessão`, () => {
    const isPost = targetType === "post" || targetType === "community_post";
    const targetId = isPost ? "post-unit" : "reply-unit";
    const result = context(
      dataset({
        posts: isPost ? [post()] : [],
        replies: isPost ? [] : [reply()],
        pageViews: [view(targetType, targetId), view(targetType, targetId, 1)],
      }),
    );

    assert.equal(result.communityContentCount, 1);
    assert.equal(result.communityViewsPerContent, 2);
    assert.equal(
      metricValue(
        result.rowCommunityTrafficDataset,
        isPost ? "community_post_text" : "community_reply_text",
        "views",
      ),
      2,
    );
  });
}

test("mistura de aliases e perfis mantém apenas post e resposta no numerador", () => {
  const result = context(
    dataset({
      posts: [post()],
      replies: [reply()],
      pageViews: [
        view("post", "post-unit"),
        view("community_post", "post-unit"),
        view("reply", "reply-unit"),
        view("post_reply", "reply-unit"),
        view("psychologist", AUTHOR_ID),
        view("psychologist", AUTHOR_ID, 1),
      ],
    }),
  );

  assert.equal(result.rowCommunityTrafficDataset.pageViews.length, 6);
  assert.equal(result.communityContentCount, 2);
  assert.equal(result.communityViewsPerContent, 2);
});

test("filtra autores, IDs ausentes e IDs do tipo oposto antes de calcular a média", () => {
  const result = context(
    dataset({
      posts: [post(), post("post-other", "other-author")],
      replies: [reply(), reply("reply-other", "other-author")],
      pageViews: [
        view("post", "post-unit"),
        view("reply", "reply-unit"),
        view("community_post", "post-other"),
        view("post_reply", "reply-other"),
        view("post", "missing-post"),
        view("reply", "missing-reply"),
        view("post", "reply-unit"),
        view("reply", "post-unit"),
        view("psychologist", "other-author"),
      ],
    }),
  );

  assert.deepEqual(
    result.rowCommunityTrafficDataset.posts.map((item) => item.id),
    ["post-unit"],
  );
  assert.deepEqual(
    result.rowCommunityTrafficDataset.replies.map((item) => item.id),
    ["reply-unit"],
  );
  assert.equal(result.rowCommunityTrafficDataset.pageViews.length, 2);
  assert.equal(result.communityContentCount, 2);
  assert.equal(result.communityViewsPerContent, 1);
});

test("tipo desconhecido, alvo ausente e tipo ausente não ampliam o numerador", () => {
  const result = context(
    dataset({
      posts: [post()],
      pageViews: [view("unknown", "post-unit"), view(null, "post-unit"), view("post", null)],
    }),
  );

  assert.equal(result.rowCommunityTrafficDataset.pageViews.length, 0);
  assert.equal(result.communityViewsPerContent, 0);
});

test("sem conteúdo da coorte mantém null mesmo com visitas ao perfil", () => {
  const result = context(
    dataset({
      posts: [post("post-other", "other-author")],
      replies: [reply("reply-other", "other-author")],
      pageViews: [view("psychologist", AUTHOR_ID), view("post", "post-other")],
    }),
  );

  assert.equal(result.communityContentCount, 0);
  assert.equal(result.rowCommunityTrafficDataset.pageViews.length, 1);
  assert.equal(result.communityViewsPerContent, null);
  assert.notEqual(result.communityContentUnavailableReason, null);
});

test("coorte vazia mantém null e não aproveita conteúdo de outros perfis", () => {
  const result = context(dataset({ posts: [post()], pageViews: [view("post", "post-unit")] }), []);

  assert.equal(result.communityContentCount, 0);
  assert.equal(result.communityViewsPerContent, null);
});

test("arredonda uma casa decimal usando todo o conteúdo, inclusive sem visitas", () => {
  const result = context(
    dataset({
      posts: [post(), post("post-unvisited")],
      replies: [reply()],
      pageViews: [view("post", "post-unit"), view("psychologist", AUTHOR_ID)],
    }),
  );

  assert.equal(result.communityContentCount, 3);
  assert.equal(result.communityViewsPerContent, 0.3);
});

for (const targetType of ["community_post", "post_reply"]) {
  test(`atribuição ${targetType} para perfil preserva a janela inclusiva de 30 minutos`, () => {
    const isPost = targetType === "community_post";
    const result = context(
      dataset({
        posts: isPost ? [post()] : [],
        replies: isPost ? [] : [reply()],
        // Deliberately unsorted: the real attribution builder orders without mutating input.
        pageViews: [
          view("psychologist", AUTHOR_ID, 30 * 60 * 1000),
          view(targetType, isPost ? "post-unit" : "reply-unit"),
        ],
      }),
    );
    const sourceId = isPost ? "community_post_text" : "community_reply_text";

    assert.equal(result.rowCommunityTrafficDataset.pageViews.length, 2);
    assert.equal(metricValue(result.rowCommunityTrafficDataset, sourceId, "profile_accesses"), 1);
    assert.equal(metricValue(result.rowCommunityTrafficDataset, sourceId, "views"), 1);
    assert.equal(result.communityViewsPerContent, 1);
  });
}

test("perfil após a janela continua no dataset sem virar acesso atribuído ou visita ao conteúdo", () => {
  const result = context(
    dataset({
      posts: [post()],
      pageViews: [view("post", "post-unit"), view("psychologist", AUTHOR_ID, 30 * 60 * 1000 + 1)],
    }),
  );

  assert.equal(result.rowCommunityTrafficDataset.pageViews.length, 2);
  assert.equal(
    metricValue(result.rowCommunityTrafficDataset, "community_post_text", "profile_accesses"),
    0,
  );
  assert.equal(result.communityViewsPerContent, 1);
});

test("atribuição exige a mesma sessão e o autor do conteúdo mesmo dentro da janela", () => {
  const result = context(
    dataset({
      posts: [post()],
      pageViews: [
        view("post", "post-unit"),
        view("psychologist", AUTHOR_ID, 1000, "other-session"),
        view("psychologist", "other-author", 2000),
      ],
    }),
    [profile(), profile("other-author")],
  );

  assert.equal(result.rowCommunityTrafficDataset.pageViews.length, 3);
  assert.equal(
    metricValue(result.rowCommunityTrafficDataset, "community_post_text", "profile_accesses"),
    0,
  );
  assert.equal(result.communityViewsPerContent, 1);
});

test("calcular contexto e atribuição não altera entradas nem outras métricas comunitárias", () => {
  const source = input(
    dataset({
      posts: [post()],
      pageViews: [view("psychologist", AUTHOR_ID, 1000), view("post", "post-unit")],
      attentionSessions: [{ attention_seconds: 12, target_id: "post-unit", target_type: "post" }],
      votes: [{ post_id: "post-unit", reply_id: null, value: 1 }],
      postSaves: [{ post_id: "post-unit" }],
    }),
  );
  const before = structuredClone(source);
  for (const records of Object.values(source.params.communityTrafficPlatformMetricDataset)) {
    for (const record of records) Object.freeze(record);
    Object.freeze(records);
  }
  Object.freeze(source.params.communityTrafficPlatformMetricDataset);

  const result = buildProfileConversionBehaviorRowContext(source);
  assert.equal(
    metricValue(result.rowCommunityTrafficDataset, "community_post_text", "profile_accesses"),
    1,
  );
  assert.deepEqual(source, before);
  assert.deepEqual(buildProfileConversionBehaviorRowContext(source), result);
  assert.equal(result.communityAttentionPerContent, 12);
  assert.equal(result.communityEngagementActions, 2);
  assert.equal(result.communityViewsPerContent, 1);
});
