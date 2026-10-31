import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import type { Prisma } from "@/external/generated/prisma/client";
import { messages } from "./constants";
import {
  createPendingTestimonialInvitation,
  eligibleVideoProfessionalWhere,
  isTestimonialInvitationsEnabled,
  TESTIMONIAL_WINDOW_MS,
} from "./pending-testimonial-invitation";
import { isChannelAllowed } from "./preferences";

let original: string | undefined;
beforeEach(() => {
  original = process.env.TESTIMONIAL_INVITATIONS_ENABLED;
});
afterEach(() => {
  if (original === undefined) delete process.env.TESTIMONIAL_INVITATIONS_ENABLED;
  else process.env.TESTIMONIAL_INVITATIONS_ENABLED = original;
});

test("invitations default off without any database access", async () => {
  const tx = new Proxy({} as Prisma.TransactionClient, {
    get() {
      throw Error("Database must not be touched");
    },
  });
  for (const value of [undefined, "", "false", "TRUE", "1", " true "]) {
    if (value === undefined) delete process.env.TESTIMONIAL_INVITATIONS_ENABLED;
    else process.env.TESTIMONIAL_INVITATIONS_ENABLED = value;
    assert.equal(isTestimonialInvitationsEnabled(), false);
    assert.equal(
      await createPendingTestimonialInvitation(tx, { patientId: "p", actorId: "a", replyId: "r" }),
      false,
    );
  }
});

test("video predicate excludes text/image, missing media, other recipients and existing hidden reviews", () => {
  const where = eligibleVideoProfessionalWhere("patient", "reply");
  assert.equal(where.role, "psicologo");
  assert.equal(where.active, true);
  assert.equal(where.deleted, false);
  assert.deepEqual(where.received_reviews, { none: { author_id: "patient", deleted: false } });
  const reply = where.post_replies?.some;
  assert.equal(reply?.id, "reply");
  assert.equal(reply?.media_type, "video");
  assert.deepEqual(reply?.media_url, { not: null });
  assert.deepEqual(reply?.NOT, { media_url: "" });
  assert.deepEqual(reply?.OR, [
    { parent_reply_id: null, post: { author_id: "patient" } },
    { parent_reply: { is: { author_id: "patient", deleted: false } } },
  ]);
});

test("fixed window uses elapsed hours, independent of calendar date or DST", () => {
  assert.equal(TESTIMONIAL_WINDOW_MS, 86_400_000);
});

test("each channel inherits reply preferences, without email", () => {
  for (const prefs of [undefined, {}, { nova_resposta: { enabled: true } }]) {
    assert.equal(isChannelAllowed(prefs, "depoimentos_pendentes", "push"), true);
    assert.equal(isChannelAllowed(prefs, "depoimentos_pendentes", "in_app"), true);
    assert.equal(isChannelAllowed(prefs, "depoimentos_pendentes", "email"), false);
  }
  assert.equal(
    isChannelAllowed({ nova_resposta: { enabled: false } }, "depoimentos_pendentes", "push"),
    false,
  );
  assert.equal(
    isChannelAllowed({ nova_resposta: { push: false } }, "depoimentos_pendentes", "push"),
    false,
  );
  assert.equal(
    isChannelAllowed({ nova_resposta: { in_app: false } }, "depoimentos_pendentes", "in_app"),
    false,
  );
  assert.equal(
    isChannelAllowed({ nova_resposta: { in_app: false } }, "depoimentos_pendentes", "push"),
    true,
  );
});

test("approved invitation copy carries no identity or private reply content", () => {
  assert.deepEqual(messages.depoimentos_pendentes({}), {
    title: "Recebeu acolhimento? Retribua com um relato",
    body: "Conte como foi sua experiência e ajude a valorizar o trabalho de quem respondeu você.",
  });
});
