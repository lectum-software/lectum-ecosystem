import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@/external/generated/prisma/client";
import { pendingReviewProfessionalsWhere } from "@/modules/api/private/patient/reviews/repositories/pending-review-policy";
import { createPendingTestimonialInvitation } from "./pending-testimonial-invitation";
import { isChannelAllowed } from "./preferences";

const params = { patientId: "patient", actorId: "professional", replyId: "reply" };
const fixture = (
  options: { patient?: boolean; eligible?: boolean; prefs?: unknown; failDelivery?: boolean } = {},
) => {
  const rows = new Map<string, unknown>();
  const deliveries: unknown[] = [];
  const reads: unknown[] = [];
  const tx = {
    user: {
      findFirst: async ({ where }: { where: { role?: string; AND?: unknown } }) => {
        reads.push(where);
        if (where.role === "paciente")
          return options.patient === false
            ? null
            : { notification_preference: { prefs: options.prefs } };
        return options.eligible === false ? null : { id: "professional" };
      },
    },
    notification: {
      createMany: async ({
        data,
        skipDuplicates,
      }: {
        data: { id: string; user_id: string; message_props: unknown }[];
        skipDuplicates: boolean;
      }) => {
        assert.equal(skipDuplicates, true);
        assert.equal(data.length, 1);
        const row = data[0];
        if (rows.has(row.id)) return { count: 0 };
        rows.set(row.id, row);
        return { count: 1 };
      },
    },
    notification_delivery: {
      create: async ({ data }: { data: { channel: string } }) => {
        if (options.failDelivery) throw new Error("delivery failure");
        assert.equal(data.channel, "in_app");
        deliveries.push(data);
      },
    },
  } as unknown as Prisma.TransactionClient;
  return { tx, rows, deliveries, reads };
};

test("one group and one delivery for concurrent replies from multiple professionals", async () => {
  const f = fixture();
  const results = await Promise.all(
    Array.from({ length: 20 }, (_, i) =>
      createPendingTestimonialInvitation(f.tx, {
        ...params,
        actorId: `professional-${i}`,
        replyId: `reply-${i}`,
      }),
    ),
  );
  assert.equal(results.filter(Boolean).length, 1);
  assert.equal(f.rows.size, 1);
  assert.equal(f.deliveries.length, 1);
  assert.equal(await createPendingTestimonialInvitation(f.tx, params), false);
});

test("each patient's group has a different stable primary key and no original-post metadata", async () => {
  const f = fixture();
  await createPendingTestimonialInvitation(f.tx, params);
  await createPendingTestimonialInvitation(f.tx, { ...params, patientId: "other-patient" });
  assert.equal(f.rows.size, 2);
  for (const row of f.rows.values()) {
    assert.deepEqual((row as { message_props: unknown }).message_props, {
      source_type: "testimonial_invitation_group",
    });
  }
});

test("inactive/nonpatient recipients and ineligible professionals produce no invitation", async () => {
  for (const options of [{ patient: false }, { eligible: false }]) {
    const f = fixture(options);
    assert.equal(await createPendingTestimonialInvitation(f.tx, params), false);
    assert.equal(f.rows.size, 0);
    assert.equal(f.deliveries.length, 0);
  }
});

test("invitations inherit reply opt-outs, including legacy in-app preference", async () => {
  for (const entry of [{ enabled: false }, { in_app: false }]) {
    const f = fixture({ prefs: { nova_resposta: entry } });
    assert.equal(await createPendingTestimonialInvitation(f.tx, params), false);
    assert.equal(f.rows.size, 0);
  }
  for (const prefs of [undefined, {}, { nova_resposta: { enabled: true } }]) {
    assert.equal(isChannelAllowed(prefs, "depoimentos_pendentes", "push"), false);
    assert.equal(isChannelAllowed(prefs, "depoimentos_pendentes", "email"), false);
    assert.equal(isChannelAllowed(prefs, "depoimentos_pendentes", "in_app"), true);
  }
});

test("eligibility scopes by patient, active published paid professional and any existing testimonial", () => {
  const where = pendingReviewProfessionalsWhere("patient", "reply");
  assert.equal(where.active, true);
  assert.equal(where.deleted, false);
  assert.equal(where.role, "psicologo");
  assert.deepEqual(where.received_reviews, { none: { author_id: "patient", deleted: false } });
  const profile = (where.psychologist_profile as { is: Prisma.psychologist_profileWhereInput }).is;
  assert.equal(profile.published, true);
  assert.equal(profile.deleted, false);
  const entitlement = profile.subscriptions?.some;
  assert.deepEqual(entitlement?.plan, { active: true, deleted: false, slug: { not: "gratuito" } });
  const reply = where.post_replies?.some;
  assert.equal(reply?.id, "reply");
  assert.deepEqual(reply?.OR, [
    { parent_reply_id: null, post: { author_id: "patient" } },
    { parent_reply: { is: { author_id: "patient", deleted: false } } },
  ]);
  assert.deepEqual(reply?.post, {
    deleted: false,
    status: "publicado",
    community: { deleted: false },
  });
});

test("list predicate and notification predicate use the same eligibility rules", () => {
  const list = pendingReviewProfessionalsWhere("patient");
  assert.equal(list.post_replies?.some?.id, undefined);
  const notification = pendingReviewProfessionalsWhere("patient", "reply");
  assert.deepEqual(list.received_reviews, notification.received_reviews);
  assert.deepEqual(list.post_replies?.some?.OR, notification.post_replies?.some?.OR);
});

test("delivery failure is propagated so caller's transaction can roll back", async () => {
  const f = fixture({ failDelivery: true });
  await assert.rejects(createPendingTestimonialInvitation(f.tx, params), /delivery failure/);
});
