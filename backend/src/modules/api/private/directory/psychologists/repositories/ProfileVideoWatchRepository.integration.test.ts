import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

test("concurrent profile watch events preserve one session and cumulative progress", {
  skip: process.env.PROFILE_WATCH_LOCAL_INTEGRATION !== "true",
}, async () => {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(url.hostname));
  assert.notEqual(process.env.NODE_ENV, "production");
  const prisma = (await import("@/infra/database/prisma")).default;
  const { ProfileVideoWatchRepository } = await import("./ProfileVideoWatchRepository");
  const id = `watch-test-${randomUUID()}`;
  try {
    await prisma.user.create({
      data: {
        id,
        email: `${id}@example.invalid`,
        name: "Teste temporario local",
        role: "psicologo",
        psychologist_profile: {
          create: {
            published: true,
            cpf: "TESTE-LOCAL",
            crp: "TESTE-LOCAL",
            gender: "masculino",
            modality: "online",
            professional_address_city: "Teste local",
            professional_address_state: "SP",
            target_audience: ["adultos"],
            video_url: "/videos/test-local.mp4",
          },
        },
      },
    });
    const specialty = await prisma.specialty.findFirstOrThrow({
      where: { active: true, deleted: false },
    });
    const service = await prisma.service.findFirstOrThrow({
      where: { active: true, deleted: false },
    });
    const approach = await prisma.approach.findFirstOrThrow({
      where: { active: true, deleted: false },
    });
    await prisma.psychologist_specialty.create({
      data: { psychologist_id: id, specialty_id: specialty.id },
    });
    await prisma.psychologist_service.create({
      data: { psychologist_id: id, service_id: service.id },
    });
    await prisma.psychologist_approach.create({
      data: { psychologist_id: id, approach_id: approach.id },
    });
    const repository = new ProfileVideoWatchRepository();
    const track = (seconds: number) =>
      repository.track({
        p: { id },
        b: {
          session_key: "concurrent",
          duration_seconds: 33,
          watched_seconds: seconds,
          max_position_seconds: seconds,
        },
      });
    const results = await Promise.all(Array.from({ length: 8 }, (_, i) => track(i + 1)));
    assert.ok(results.every((result) => result.tracked));
    assert.equal(
      await prisma.profile_video_watch_session.count({ where: { psychologist_id: id } }),
      1,
    );
    await Promise.all([track(2), track(20), track(1)]);
    const saved = await prisma.profile_video_watch_session.findFirstOrThrow({
      where: { psychologist_id: id },
    });
    assert.equal(saved.watched_seconds, 20);
    assert.equal(saved.max_position_seconds, 20);
    assert.equal(saved.milestone_50, true);
    assert.deepEqual(
      saved.retention_buckets,
      Array.from({ length: 12 }, (_, i) => (i + 1) * 5),
    );
  } finally {
    await prisma.user.deleteMany({ where: { id, email: `${id}@example.invalid` } });
    await prisma.$disconnect();
  }
});
