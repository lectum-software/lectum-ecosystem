import assert from "node:assert/strict";
import { test } from "node:test";
import { buildCommunityTrafficPlatformMetrics } from "../traffic/community";
import { buildCommunitiesBehaviorCell } from "./community-favorite-cells";
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

const activityRange = input(dataset()).params.range;
const beforeActivityRange = new Date(activityRange.start.getTime() - 1);
const afterActivityRange = new Date(activityRange.end.getTime() + 1);
type BehaviorContext = ReturnType<typeof buildProfileConversionBehaviorRowContext>;

const cellMetric = (result: BehaviorContext, id: string) => {
  const metric = buildCommunitiesBehaviorCell(result).metrics.find((item) => item.id === id);
  assert.ok(metric, id);
  return metric;
};

const activityValues = (result: BehaviorContext) =>
  [
    "activity_posts",
    "activity_replies",
    "activity_actions",
    "activity_active_psychologists",
    "activity_actions_per_psychologist",
  ].map((id) => cellMetric(result, id).value);

for (const [label, createdAt] of [
  ["antes do início", beforeActivityRange],
  ["após o fim", afterActivityRange],
] as const) {
  test(`atividade exclui post e resposta ${label} sem excluir a base de conteúdo`, () => {
    const result = context(
      dataset({ posts: [{ ...post(), createdAt }], replies: [{ ...reply(), createdAt }] }),
    );

    assert.equal(result.communityContentCount, 2);
    assert.deepEqual(activityValues(result), [0, 0, 0, 0, 0]);
    assert.equal(result.rowActivityActions, 0);
    assert.equal(result.rowActivityAuthorIds.size, 0);
    assert.notEqual(result.activityUnavailableReason, null);
  });
}

for (const [label, createdAt] of [
  ["início", activityRange.start],
  ["fim", activityRange.end],
] as const) {
  test(`atividade inclui post e resposta exatamente no ${label} do intervalo`, () => {
    const result = context(
      dataset({ posts: [{ ...post(), createdAt }], replies: [{ ...reply(), createdAt }] }),
    );

    assert.deepEqual(activityValues(result), [1, 1, 2, 1, 2]);
    assert.equal(result.rowActivityActions, 2);
    assert.deepEqual([...result.rowActivityAuthorIds], [AUTHOR_ID]);
    assert.equal(result.activityUnavailableReason, null);
  });
}

test("resposta nova em post antigo conta pela criação própria, não pela criação do post", () => {
  const oldPost = { ...post(), createdAt: beforeActivityRange };
  const newReply = reply();
  newReply.post.createdAt = beforeActivityRange;
  const result = context(dataset({ posts: [oldPost], replies: [newReply] }));

  assert.equal(result.communityContentCount, 2);
  assert.deepEqual(activityValues(result), [0, 1, 1, 1, 1]);
  assert.equal(result.rowActivityActions, 1);
});

test("subtotais de atividade da célula e total do contexto usam o mesmo recorte", () => {
  const result = context(
    dataset({
      posts: [post(), { ...post("post-old"), createdAt: beforeActivityRange }],
      replies: [
        reply(),
        reply("reply-second"),
        { ...reply("reply-old"), createdAt: beforeActivityRange },
        { ...reply("reply-future"), createdAt: afterActivityRange },
      ],
    }),
  );

  assert.equal(result.communityContentCount, 6);
  assert.deepEqual(activityValues(result), [1, 2, 3, 1, 3]);
  assert.equal(result.rowActivityActions, 3);
  const posts = cellMetric(result, "activity_posts").value;
  const replies = cellMetric(result, "activity_replies").value;
  assert.equal(typeof posts, "number");
  assert.equal(typeof replies, "number");
  assert.equal(Number(posts) + Number(replies), result.rowActivityActions);
});

test("autores ativos são únicos, da coorte e com autoria dentro do período", () => {
  const result = context(
    dataset({
      posts: [
        post(),
        post("post-second", "second-author"),
        { ...post("post-old", "inactive-author"), createdAt: beforeActivityRange },
        post("post-outside", "outside-cohort"),
      ],
      replies: [reply(), reply("reply-second", "second-author")],
    }),
    [profile(), profile("second-author"), profile("inactive-author")],
  );

  assert.equal(result.communityContentCount, 5);
  assert.deepEqual([...result.rowActivityAuthorIds].sort(), [AUTHOR_ID, "second-author"].sort());
  assert.deepEqual(activityValues(result), [2, 2, 4, 2, 1.3]);
});

test("média da atividade inclui todos os três profissionais e arredonda um terço para 0.3", () => {
  const result = context(dataset({ posts: [post()] }), [
    profile(),
    profile("inactive-second"),
    profile("inactive-third"),
  ]);

  assert.deepEqual(activityValues(result), [1, 0, 1, 1, 0.3]);
  assert.equal(result.activityPerPsychologist, 0.3);
  const level = cellMetric(result, "community_activity_level");
  assert.equal(level.value, 0.3);
  assert.equal(level.display_value, "Baixa atividade");
  assert.equal(level.tone, "below");
});

test("coorte sem autoria mantém atividade zero, não média desconhecida", () => {
  const result = context(dataset());

  assert.deepEqual(activityValues(result), [0, 0, 0, 0, 0]);
  assert.equal(result.activityPerPsychologist, 0);
  assert.notEqual(result.activityUnavailableReason, null);
  assert.equal(cellMetric(result, "activity_actions_per_psychologist").unavailable_reason, null);
  assert.equal(cellMetric(result, "community_activity_level").display_value, "Sem atividade");
  assert.equal(cellMetric(result, "community_activity_level").tone, "zero");
});

test("ausência de coorte mantém média null e disponibilidade vazia", () => {
  const result = context(dataset({ posts: [post()], replies: [reply()] }), []);

  assert.deepEqual(activityValues(result), [0, 0, 0, 0, null]);
  assert.equal(result.activityPerPsychologist, null);
  assert.equal(result.activityUnavailableReason, result.emptyRowReason);
  assert.notEqual(cellMetric(result, "activity_actions_per_psychologist").unavailable_reason, null);
  assert.equal(
    cellMetric(result, "community_post_format").unavailable_reason,
    result.emptyRowReason,
  );
});

test("histórico conserva formatos e tráfego disponíveis mesmo sem atividade nova", () => {
  const source = input(
    dataset({
      posts: [{ ...post(), createdAt: beforeActivityRange, media_type: "video" }],
      replies: [{ ...reply(), createdAt: beforeActivityRange }],
      pageViews: [view("post", "post-unit"), view("psychologist", AUTHOR_ID, 1000)],
      attentionSessions: [{ attention_seconds: 20, target_id: "post-unit", target_type: "post" }],
    }),
  );
  const before = structuredClone(source);
  const result = buildProfileConversionBehaviorRowContext(source);

  assert.deepEqual(
    result.rowCommunityTrafficDataset,
    source.params.communityTrafficPlatformMetricDataset,
  );
  assert.equal(result.communityContentCount, 2);
  assert.equal(result.communityViewsPerContent, 0.5);
  assert.equal(result.communityAttentionPerContent, 10);
  for (const id of ["community_post_format", "community_reply_format"]) {
    const metric = cellMetric(result, id);
    assert.equal(metric.value, 1);
    assert.equal(metric.unavailable_reason, result.communityContentUnavailableReason);
    assert.equal(metric.unavailable_reason, null);
  }
  assert.equal(
    cellMetric(result, "community_post_format").display_value,
    result.communityPostFormatSignal.label,
  );
  assert.equal(
    cellMetric(result, "community_reply_format").display_value,
    result.communityReplyFormatSignal.label,
  );
  assert.equal(
    metricValue(result.rowCommunityTrafficDataset, "community_post_video", "profile_accesses"),
    1,
  );
  assert.deepEqual(source, before);
  assert.deepEqual(activityValues(result), [0, 0, 0, 0, 0]);
  assert.equal(cellMetric(result, "community_activity_level").display_value, "Sem atividade");
});

test("classificador vigente mantém limiares de atividade padrão e muito ativa", () => {
  for (const [count, label, tone] of [
    [3, "Atividade padrão", "standard"],
    [10, "Muito ativo", "above"],
  ] as const) {
    const result = context(
      dataset({ posts: Array.from({ length: count }, (_, i) => post(`p-${i}`)) }),
    );
    const level = cellMetric(result, "community_activity_level");
    assert.equal(level.value, count);
    assert.equal(level.display_value, label);
    assert.equal(level.tone, tone);
  }
});
