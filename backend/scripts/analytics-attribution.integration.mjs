import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const db = new URL(process.env.DATABASE_URL);
assert.equal(db.hostname, "127.0.0.1");
assert.equal(db.port, "55432");
assert.ok(["/lectum_whatsapp_dev_20261017", "/lectum_privacy_dev"].includes(db.pathname));
const { default: prisma } = await import("../src/infra/database/prisma/index.ts");
const { FavoriteRepository } = await import(
  "../src/modules/api/private/patient/favorites/repositories/FavoriteRepository.ts"
);
const { PsychologistAnalyticsSummaryRepository } = await import(
  "../src/modules/api/private/psychologist/analytics/repositories/queries/PsychologistAnalyticsSummaryRepository.ts"
);
const { PsychologistAnalyticsCommunityRepository } = await import(
  "../src/modules/api/private/psychologist/analytics/repositories/queries/PsychologistAnalyticsCommunityRepository.ts"
);
const { IndexRepository } = await import(
  "../src/modules/api/private/notification/index/repositories/IndexRepository.ts"
);
const { ImportantActionRepository } = await import(
  "../src/modules/api/public/analytics/action/repositories/ImportantActionRepository.ts"
);

const prefix = `qa-origins-${randomUUID()}`;
const ids = Array.from({ length: 7 }, (_, i) => `${prefix}-${i}`);
const psychologistId = ids[0];
const communityId = `${prefix}-community`;
const postId = `${prefix}-post`;
const repo = new FavoriteRepository();
const sources = [
  "/psicologos?q=ansiedade",
  `/psicologos/${psychologistId}`,
  "/app/community/anxiety",
  "/app/favoritos",
  undefined,
];
const counts = (timeline) =>
  Object.fromEntries(timeline.series.map((s) => [s.id, s.points.reduce((n, p) => n + p.value, 0)]));
try {
  for (const [i, id] of ids.entries()) {
    await prisma.user.create({
      data: {
        id,
        email: `${id}@example.invalid`,
        name: "QA origem local",
        role: i ? "paciente" : "psicologo",
        confirmed: true,
        active: true,
        ...(i
          ? {}
          : { psychologist_profile: { create: { published: true, video_url: "/qa-video.mp4" } } }),
      },
    });
  }
  for (const [i, source] of sources.entries())
    await repo.favorite(ids[i + 1], psychologistId, source);
  const first = await prisma.psychologist_favorite.findFirstOrThrow({ where: { user_id: ids[1] } });
  await repo.favorite(ids[1], psychologistId, "/app/favoritos");
  const repeat = await prisma.psychologist_favorite.findUniqueOrThrow({ where: { id: first.id } });
  assert.equal(repeat.origin_path, first.origin_path);
  assert.equal(repeat.createdAt.getTime(), first.createdAt.getTime());
  await repo.unfavorite(ids[1], psychologistId);
  await repo.favorite(ids[1], psychologistId, `/psicologos/${psychologistId}`);
  const reactivated = await prisma.psychologist_favorite.findUniqueOrThrow({
    where: { id: first.id },
  });
  assert.equal(reactivated.origin_path, `/psicologos/${psychologistId}`);
  assert.ok(reactivated.createdAt > first.createdAt);
  await repo.favorite(ids[6], psychologistId, "/psicologos?specialty=ansiedade");

  for (const source of sources) {
    await prisma.profile_view_event.create({
      data: {
        psychologist_id: psychologistId,
        viewer_id: ids[1],
        source: "profile_page",
        search_context_path: source ?? null,
      },
    });
  }
  const actions = new ImportantActionRepository();
  for (const [i, path] of [
    ...sources,
    `/psicologos/${psychologistId}?returnTo=/favoritos`,
  ].entries()) {
    await actions.create({
      visitorId: prefix,
      sessionId: prefix,
      userId: ids[1],
      occurredAt: new Date(),
      actionType: i === 0 ? "psychologist_video_whatsapp_click" : "whatsapp_click",
      path,
      pageKind: i === 0 ? "psychologists" : "psychologist_profile",
      targetType: "psychologist",
      targetId: psychologistId,
      displayMode: "browser",
      eventId: String(i),
    });
  }
  // Stale optional video telemetry must not override the persisted favorite origin.
  await prisma.community.create({
    data: { id: communityId, name: "QA attribution", slug: communityId },
  });
  await prisma.community_post.create({
    data: {
      id: postId,
      community_id: communityId,
      author_id: psychologistId,
      title: "QA",
      content: "Temporary attribution test",
      anonymous: false,
    },
  });
  for (const [i, path] of [
    "/app/community/qa",
    `/psicologos/${psychologistId}`,
    `/psicologos/${psychologistId}?traffic_origin=community_top_mentors`,
  ].entries()) {
    await actions.create({
      visitorId: prefix,
      sessionId: prefix,
      userId: ids[1],
      occurredAt: new Date(),
      actionType: "whatsapp_click",
      path,
      pageKind: i === 2 ? "community_top_mentors" : "community_post",
      targetType: i === 2 ? "psychologist" : "post",
      targetId: i === 2 ? psychologistId : postId,
      displayMode: "browser",
      eventId: `content-${i}`,
    });
  }
  for (let i = 0; i < 10; i++)
    await actions.create({
      visitorId: prefix,
      sessionId: prefix,
      userId: ids[1],
      occurredAt: new Date(),
      actionType: "psychologist_video_favorite",
      path: "/psicologos",
      pageKind: "psychologists",
      targetType: "psychologist",
      targetId: psychologistId,
      displayMode: "browser",
    });
  const summary = await new PsychologistAnalyticsSummaryRepository(
    new PsychologistAnalyticsCommunityRepository(),
  ).index(
    { auth: { id: psychologistId } },
    {
      key: "all",
      label: "QA",
      start_at: new Date("2020-01-01"),
      end_at: new Date(Date.now() + 60000),
    },
    true,
  );
  assert.equal(summary.metrics.favorites_received, 6);
  assert.equal(summary.presentation_video.metrics.favorites_from_video, 1);
  const favoriteTimeline = counts(summary.chart_data.timelines.favorites_received);
  assert.deepEqual(favoriteTimeline, {
    presentation_video: 1,
    communities: 1,
    profile: 2,
    favorites: 1,
    unknown: 1,
  });
  const breakdown = summary.traffic_sources.sources.find((s) => s.id === "favorites").breakdown;
  assert.equal(
    breakdown.reduce((n, b) => n + b.value, 0),
    6,
  );
  assert.equal(breakdown.find((b) => b.id === "favorites_from_profile").value, 2);
  assert.equal(breakdown.find((b) => b.id === "favorites_from_unknown").value, 1);
  assert.equal(summary.metrics.profile_views, 5);
  assert.equal(summary.presentation_video.metrics.profile_accesses_from_video, 1);
  assert.equal(
    Object.values(counts(summary.chart_data.timelines.profile_views)).reduce((a, b) => a + b, 0),
    5,
  );
  assert.equal(summary.metrics.whatsapp_clicks, 9);
  assert.equal(summary.presentation_video.metrics.whatsapp_clicks_from_video, 1);
  const wa = counts(summary.chart_data.timelines.whatsapp_clicks);
  assert.deepEqual(wa, {
    presentation_video: 1,
    communities: 2,
    profile: 5,
    favorites: 1,
    unknown: 0,
  });
  const videoTraffic = summary.traffic_sources.sources.find((s) => s.id === "presentation_video");
  assert.equal(videoTraffic.breakdown.find((b) => b.id === "search_results").value, 0);
  assert.equal(videoTraffic.breakdown.find((b) => b.id === "explore").value, 1);
  assert.equal(
    summary.communities.content.whatsapp_clicks_by_content.reduce(
      (n, b) => n + b.whatsapp_clicks,
      0,
    ),
    1,
  );
  assert.equal(summary.communities.top_mentors.whatsapp_clicks, 0);

  await prisma.notification.create({
    data: {
      user_id: psychologistId,
      message_key: "novo_favorito",
      message_props: { favorite_id: first.id },
      redirect: `/psicologos/${psychologistId}`,
    },
  });
  const notifications = await new IndexRepository().index({
    auth: { id: psychologistId },
    q: { page: 1, limit: 20 },
  });
  assert.equal(notifications.data[0].redirect, "/app/profissional/estatisticas");
  console.log(
    "PASS real database: re-favorite, idempotence, source totals, legacy notifications, optional telemetry isolation and search attribution",
  );
} finally {
  await prisma.important_action_event.deleteMany({ where: { visitor_id: prefix } });
  await prisma.notification.deleteMany({ where: { user_id: { in: ids } } });
  await prisma.community.deleteMany({ where: { id: communityId } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  await prisma.$disconnect();
}
