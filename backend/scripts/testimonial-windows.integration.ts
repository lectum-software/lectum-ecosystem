import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import prisma from "../src/infra/database/prisma";
import {
  createPendingTestimonialInvitation,
  TESTIMONIAL_WINDOW_MS,
} from "../src/main/notification/pending-testimonial-invitation";
import {
  deliverTestimonialPushes,
  finalizeTestimonialBatch,
} from "../src/main/notification/testimonial-invitation-scheduler";
import type { IPendingReviewDTO } from "../src/modules/api/private/patient/reviews/DTOs/IPendingReviewDTO";
import { PendingReviewRepository } from "../src/modules/api/private/patient/reviews/repositories/PendingReviewRepository";
import { withSerializableTransaction } from "../src/utils/prisma-transaction";

const url = new URL(process.env.DATABASE_URL!);
assert.equal(url.hostname, "127.0.0.1");
assert.equal(url.port, "55432");
assert.equal(url.pathname, "/lectum_task295_visibility_dev_20261030");
assert.equal(
  process.env.VAPID_PRIVATE_KEY?.trim() || "",
  "",
  "No real push provider in integration tests",
);
process.env.TESTIMONIAL_INVITATIONS_ENABLED = "true";
const prefix = `testimonial-qa-${randomUUID()}`;
const patient = `${prefix}-patient`,
  other = `${prefix}-other`;
const pros = Array.from({ length: 7 }, (_, i) => `${prefix}-pro-${i}`);
const allUsers = [patient, other, ...pros];
const now = new Date();
const at = (offset: number) => new Date(now.getTime() + offset);
const enqueue = (index: number, time = now) =>
  withSerializableTransaction(
    (tx) =>
      createPendingTestimonialInvitation(
        tx,
        {
          patientId: patient,
          actorId: pros[index],
          replyId: `${prefix}-reply-${index}`,
        },
        time,
      ),
    5,
  );
const finish = (id: string, time: Date) =>
  withSerializableTransaction((tx) => finalizeTestimonialBatch(tx, id, time), 5);
const list = (batch: string, user = patient) =>
  new PendingReviewRepository().index({ auth: { id: user }, q: { batch } } as IPendingReviewDTO);

async function main() {
  try {
    await prisma.user.createMany({
      data: allUsers.map((id) => ({
        id,
        name: "Local QA",
        email: `${id}@example.invalid`,
        role: pros.includes(id) ? "psicologo" : "paciente",
      })),
    });
    await prisma.subscription_plan.create({ data: { id: prefix, slug: prefix, name: "Local QA" } });
    for (const id of pros) {
      const profile = await prisma.psychologist_profile.create({
        data: { user_id: id, published: true, video_url: "/local-qa.mp4", crp_status: "aprovado" },
      });
      await prisma.professional_subscription.create({
        data: { psychologist_id: profile.id, plan_id: prefix, status: "ativa" },
      });
    }
    await prisma.community.create({ data: { id: prefix, name: "Local QA", slug: prefix } });
    await prisma.community_post.create({
      data: {
        id: prefix,
        community_id: prefix,
        author_id: patient,
        title: "Local QA",
        content: "Integration only",
      },
    });
    await prisma.post_reply.createMany({
      data: pros.map((author_id, i) => ({
        id: `${prefix}-reply-${i}`,
        post_id: prefix,
        author_id,
        content: "Integration only",
        media_type: "video",
        media_url: "/local-qa.mp4",
      })),
    });

    for (const media_type of [null, "image"]) {
      await prisma.post_reply.update({ where: { id: `${prefix}-reply-0` }, data: { media_type } });
      assert.equal(await enqueue(0), false);
    }
    await prisma.post_reply.update({
      where: { id: `${prefix}-reply-0` },
      data: { media_type: "video" },
    });
    const results = await Promise.all([enqueue(0), enqueue(1), enqueue(0), enqueue(1)]);
    assert.equal(results.filter(Boolean).length, 2);
    assert.equal(
      await prisma.testimonial_invitation_batch.count({ where: { patient_id: patient } }),
      1,
    );
    const first = await prisma.testimonial_invitation_batch.findFirstOrThrow({
      where: { patient_id: patient },
    });
    assert.equal(first.window_end.getTime(), at(TESTIMONIAL_WINDOW_MS).getTime());
    assert.equal(await finish(first.id, at(TESTIMONIAL_WINDOW_MS - 1)), null);
    assert.equal(await prisma.notification.count({ where: { user_id: patient } }), 0);
    assert.equal(await enqueue(2, at(TESTIMONIAL_WINDOW_MS - 1)), true);
    assert.equal(await enqueue(3, at(TESTIMONIAL_WINDOW_MS)), true);
    assert.equal(
      await prisma.testimonial_invitation_batch.count({ where: { patient_id: patient } }),
      2,
    );
    // A review written while waiting, even hidden, excludes that professional from the batch.
    await prisma.professional_review.create({
      data: {
        psychologist_id: pros[1],
        author_id: patient,
        rating: 5,
        comment: "Local QA",
        status: "oculta",
      },
    });
    await Promise.all([
      finish(first.id, at(TESTIMONIAL_WINDOW_MS)),
      finish(first.id, at(TESTIMONIAL_WINDOW_MS)),
    ]);
    assert.equal(await prisma.notification.count({ where: { user_id: patient } }), 1);
    assert.equal((await list(first.id)).count, 2);
    assert.equal((await list(first.id, other)).count, 0);
    assert.equal((await list("unknown")).count, 0);
    await prisma.post_reply.update({ where: { id: `${prefix}-reply-2` }, data: { deleted: true } });
    assert.equal((await list(first.id)).count, 1);
    assert.equal(await enqueue(0, at(TESTIMONIAL_WINDOW_MS * 3)), false);
    // Missing VAPID is safely audited once, without retrying on each scheduler tick.
    await Promise.all([
      deliverTestimonialPushes(at(TESTIMONIAL_WINDOW_MS)),
      deliverTestimonialPushes(at(TESTIMONIAL_WINDOW_MS)),
    ]);
    const sent = await prisma.testimonial_invitation_batch.findUniqueOrThrow({
      where: { id: first.id },
    });
    assert.equal(sent.push_status, "skipped");
    assert.equal(
      await prisma.notification_delivery.count({
        where: { notification_id: sent.notification_id, channel: "push" },
      }),
      1,
    );
    // Opt-out before deadline closes the second batch with no notification.
    await prisma.notification_preference.create({
      data: { user_id: patient, prefs: { nova_resposta: { enabled: false } } },
    });
    const second = await prisma.testimonial_invitation_batch.findFirstOrThrow({
      where: { patient_id: patient, status: "pending" },
    });
    assert.equal(await finish(second.id, at(TESTIMONIAL_WINDOW_MS * 2)), null);
    assert.equal(
      (await prisma.testimonial_invitation_batch.findUniqueOrThrow({ where: { id: second.id } }))
        .status,
      "skipped",
    );
    assert.equal(await enqueue(4, at(TESTIMONIAL_WINDOW_MS * 2)), false);
    await prisma.notification_preference.update({
      where: { user_id: patient },
      data: { prefs: { nova_resposta: { in_app: false, push: true } } },
    });
    assert.equal(await enqueue(4, at(TESTIMONIAL_WINDOW_MS * 2)), true);
    const third = await prisma.testimonial_invitation_batch.findFirstOrThrow({
      where: { patient_id: patient, status: "pending" },
    });
    assert.equal(await finish(third.id, at(TESTIMONIAL_WINDOW_MS * 3)), null);
    assert.equal(
      (
        await prisma.notification.findFirstOrThrow({
          where: { id: `testimonial-batch-${third.id}` },
        })
      ).deleted,
      true,
    );
    // Silenced discussions and indirect replies cannot create new members.
    await prisma.post_notification_mute.create({ data: { user_id: patient, post_id: prefix } });
    assert.equal(await enqueue(5), false);
    await prisma.post_notification_mute.deleteMany({
      where: { user_id: patient, post_id: prefix },
    });
    await prisma.post_reply.update({
      where: { id: `${prefix}-reply-5` },
      data: { parent_reply_id: `${prefix}-reply-0` },
    });
    assert.equal(await enqueue(5), false);
    console.log(
      "PASS: real PostgreSQL video-only, concurrency, fixed deadline, late window, dedup, hidden review, deletion, opt-out, channel isolation, ownership and push claim",
    );
  } finally {
    // Delete only identifiers created by this run, never reset or seed shared data.
    await prisma.notification_delivery.deleteMany({ where: { user_id: { in: allUsers } } });
    await prisma.notification.deleteMany({ where: { user_id: { in: allUsers } } });
    await prisma.community.deleteMany({ where: { id: prefix } });
    await prisma.user.deleteMany({ where: { id: { in: allUsers } } });
    await prisma.subscription_plan.deleteMany({ where: { id: prefix } });
    await prisma.$disconnect();
  }
}
void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
