import assert from "node:assert/strict";
import { before, type TestContext, test } from "node:test";
import type { Prisma } from "@/external/generated/prisma/client";
import { visibleTestimonialsWhere } from "./testimonial-summary";

process.env.DATABASE_URL ??= "postgresql://lectum:lectum@localhost:5432/lectum_test";
process.env.JWT_SECRET_KEY ??= "lectum-test-jwt-secret-key-32-bytes";

let prisma: typeof import("@/infra/database/prisma").default;
let PatientRepository: typeof import("@/modules/api/private/patient/reviews/repositories/ReviewRepository").ReviewRepository;
let ProfessionalRepository: typeof import("@/modules/api/private/psychologist/reviews/repositories/ReviewRepository").PsychologistReviewRepository;
let payload: typeof import("@/modules/api/private/patient/reviews/validator").testimonialPayload;

before(async () => {
  prisma = (await import("@/infra/database/prisma")).default;
  PatientRepository = (
    await import("@/modules/api/private/patient/reviews/repositories/ReviewRepository")
  ).ReviewRepository;
  ProfessionalRepository = (
    await import("@/modules/api/private/psychologist/reviews/repositories/ReviewRepository")
  ).PsychologistReviewRepository;
  payload = (await import("@/modules/api/private/patient/reviews/validator")).testimonialPayload;
});

// Prisma delegates are proxies; restore replacements after every isolated unit test.
const stub = (
  t: TestContext,
  target: object,
  key: string,
  implementation: (...args: never[]) => unknown,
) => {
  const original = Reflect.get(target, key);
  const replacement = t.mock.fn(implementation);
  Reflect.set(target, key, replacement);
  t.after(() => Reflect.set(target, key, original));
  return replacement;
};

const transaction = (t: TestContext, tx: object) =>
  stub(t, prisma, "$transaction", async (callback: (client: Prisma.TransactionClient) => unknown) =>
    callback(tx as Prisma.TransactionClient),
  );

const psychologist = (paid = true) => ({
  id: "professional",
  name: "Professional",
  avatar: null,
  psychologist_profile: { subscriptions: paid ? [{ id: "subscription", source: "paid" }] : [] },
});

for (const visibility of [undefined, "visible", "hidden", "all"] as const) {
  for (const empty of [false, true]) {
    test(`visibility totals preserve owner scope and filters across pages (${visibility}, empty=${empty})`, async (t) => {
      const now = new Date("2026-10-30T12:00:00.000Z");
      t.mock.timers.enable({ apis: ["Date"], now });
      const periodStart = new Date(now);
      periodStart.setDate(periodStart.getDate() - 7);
      const baseWhere = {
        psychologist_id: "professional",
        deleted: false,
        author: { active: true, deleted: false },
        status: undefined,
        rating: 5,
        createdAt: { gte: periodStart },
      };
      const status =
        visibility === "all"
          ? undefined
          : visibility === "hidden"
            ? { in: ["oculta_profissional", "oculta"] }
            : "publicada";
      const expected = empty
        ? { visible: 0, hidden: 0, all: 0 }
        : { visible: 23, hidden: 7, all: 30 };
      const selectedCount = expected[visibility ?? "visible"];
      stub(
        t,
        prisma.professional_review,
        "findMany",
        async (args: { where: unknown; take: number; skip: number }) => {
          assert.deepEqual(args.where, { ...baseWhere, status });
          assert.equal(args.take, 20);
          assert.equal(args.skip, 40);
          return [];
        },
      );
      stub(t, prisma.professional_review, "count", async ({ where }: { where: unknown }) => {
        assert.deepEqual(where, { ...baseWhere, status });
        return selectedCount;
      });
      stub(t, prisma.professional_review, "aggregate", async ({ where }: { where: unknown }) => {
        assert.deepEqual(where, visibleTestimonialsWhere("professional"));
        return { _count: { _all: expected.visible } };
      });
      let visibilityQueries = 0;
      stub(
        t,
        prisma.professional_review,
        "groupBy",
        async (args: { by: string[]; where: unknown; _count: unknown }) => {
          if (args.by[0] === "rating") {
            assert.deepEqual(args.where, visibleTestimonialsWhere("professional"));
            return [];
          }
          visibilityQueries++;
          assert.deepEqual(args, {
            by: ["status"],
            where: baseWhere,
            _count: { _all: true },
          });
          return empty
            ? []
            : [
                { status: "publicada", _count: { _all: 23 } },
                { status: "oculta_profissional", _count: { _all: 5 } },
                { status: "oculta", _count: { _all: 2 } },
              ];
        },
      );
      const result = await new ProfessionalRepository().index(
        {
          auth: { id: "professional", role: "psicologo" },
          q: { visibility, page: 3, limit: 20, rating: 5, period: "7d" },
        },
        { canReceiveReviews: false },
      );
      assert.deepEqual(result.visibility_counts, expected);
      assert.deepEqual(result.data, []);
      assert.equal(result.count, selectedCount);
      assert.equal(result.pages, Math.ceil(selectedCount / 20));
      assert.equal(result.summary.rating_count, expected.visible);
      assert.deepEqual(result.access, { can_receive_reviews: false, mode: "full" });
      assert.equal(visibilityQueries, 1);
    });
  }
}

test("testimonial payload accepts every individual star and trims required text", () => {
  for (const rating of [1, 2, 3, 4, 5]) {
    assert.deepEqual(payload.parse({ rating, comment: "  Acolhedor.  " }), {
      rating,
      comment: "Acolhedor.",
    });
  }
  assert.equal(payload.safeParse({ rating: 5, comment: "a".repeat(1000) }).success, true);
});

test("testimonial payload rejects missing/blank text and out-of-range or fractional stars", () => {
  for (const rating of [0, 6, -1, 1.5, NaN, Infinity, "5", null, undefined]) {
    assert.equal(payload.safeParse({ rating, comment: "Relato" }).success, false);
  }
  for (const comment of ["", " \n\t ", "a".repeat(1001), null, undefined, 7]) {
    assert.equal(payload.safeParse({ rating: 5, comment }).success, false);
  }
});

test("public filter excludes hidden, deleted and inactive-author testimonials, independent of plan", () => {
  assert.deepEqual(visibleTestimonialsWhere("professional"), {
    psychologist_id: "professional",
    deleted: false,
    status: "publicada",
    author: { active: true, deleted: false },
  });
});

for (const paid of [false, true]) {
  test(`new testimonial eligibility requires paid target (${paid}) without requiring a direct reply`, async (t) => {
    stub(t, prisma.user, "findFirst", async ({ where }: { where: { id: string } }) =>
      where.id === "professional" ? psychologist(paid) : { id: "patient" },
    );
    stub(t, prisma.professional_review, "findUnique", async () => null);
    stub(t, prisma.post_reply, "findFirst", () => {
      throw new Error("Direct reply must not gate eligibility");
    });
    const result = await new PatientRepository().eligibility("patient", "professional");
    assert.equal(result.eligible, paid);
    assert.equal(result.reason, paid ? "eligible" : "professional_plan_required");
  });
}

test("existing hidden testimonial suppresses another invitation even after downgrade", async (t) => {
  stub(t, prisma.user, "findFirst", async () => psychologist(false));
  stub(t, prisma.professional_review, "findUnique", async () => ({ id: "review", deleted: false }));
  const result = await new PatientRepository().eligibility("patient", "professional");
  assert.equal(result.reason, "already_reviewed");
  assert.equal(result.existing_review_id, "review");
});

test("self-review and non-patient authors cannot become eligible", async (t) => {
  stub(t, prisma.user, "findFirst", async ({ where }: { where: { id: string; role?: string } }) =>
    where.id === "professional" ? psychologist() : null,
  );
  stub(t, prisma.professional_review, "findUnique", async () => null);
  const repository = new PatientRepository();
  assert.equal(
    (await repository.eligibility("professional", "professional")).reason,
    "own_profile",
  );
  assert.equal(
    (await repository.eligibility("other-professional", "professional")).reason,
    "patient_required",
  );
});

test("create rechecks paid entitlement inside the transaction before writing", async (t) => {
  t.mock.method(
    PatientRepository.prototype,
    "eligibility",
    async () => ({ eligible: true, reason: "eligible" }) as never,
  );
  let writes = 0;
  transaction(t, {
    psychologist_profile: {
      findFirst: async ({ where }: { where: { subscriptions: unknown } }) => {
        assert.ok(where.subscriptions);
        return null;
      },
    },
    professional_review: {
      create: async () => {
        writes++;
      },
    },
  });
  const result = await new PatientRepository().create({
    auth: { id: "patient", role: "paciente" },
    b: { psychologist_id: "professional", rating: 5, comment: "Relato" },
  });
  assert.ok("reason" in result);
  assert.equal(result.reason, "professional_plan_required");
  assert.equal(writes, 0);
});

test("create detects an existing testimonial again inside the transaction", async (t) => {
  t.mock.method(
    PatientRepository.prototype,
    "eligibility",
    async () => ({ eligible: true, reason: "eligible" }) as never,
  );
  transaction(t, {
    psychologist_profile: { findFirst: async () => ({ id: "profile" }) },
    professional_review: {
      findUnique: async ({ where }: { where: unknown }) => {
        assert.deepEqual(where, {
          psychologist_id_author_id: {
            author_id: "patient",
            psychologist_id: "professional",
          },
        });
        return { id: "review", deleted: false };
      },
      create: async () => {
        throw new Error("Duplicate must never be created");
      },
      update: async () => {
        throw new Error("Existing testimonial must not be overwritten");
      },
    },
  });
  const result = await new PatientRepository().create({
    auth: { id: "patient", role: "paciente" },
    b: { psychologist_id: "professional", rating: 5, comment: "Relato" },
  });
  assert.ok("reason" in result);
  assert.equal(result.reason, "already_reviewed");
});

for (const owner of [true, false]) {
  test(`author edit is owner-scoped and preserves response and moderation (owner=${owner})`, async (t) => {
    let writes = 0;
    transaction(t, {
      professional_review: {
        findFirst: async ({ where }: { where: unknown }) => {
          assert.deepEqual(where, { id: "review", author_id: "patient", deleted: false });
          return owner ? { psychologist_id: "professional" } : null;
        },
        updateMany: async ({ data }: { data: unknown }) => {
          assert.deepEqual(data, { rating: 4, comment: "Edited" });
          writes++;
          return { count: 1 };
        },
        count: async () => 1,
      },
      psychologist_profile: { update: async () => undefined },
    });
    const result = await new PatientRepository().update({
      auth: { id: "patient", role: "paciente" },
      p: { id: "review" },
      b: { rating: 4, comment: " Edited " },
    });
    assert.equal(Boolean(result), owner);
    assert.equal(writes, owner ? 1 : 0);
  });
}

for (const status of ["publicada", "oculta_profissional", "oculta"]) {
  for (const owner of [true, false]) {
    test(`professional visibility requires ownership and preserves admin moderation (${status}, owner=${owner})`, async (t) => {
      let currentStatus = status;
      let countUpdates = 0;
      transaction(t, {
        professional_review: {
          updateMany: async ({
            where,
            data,
          }: {
            where: {
              id: string;
              psychologist_id: string;
              deleted: boolean;
              status: { in: string[] };
            };
            data: { status: string };
          }) => {
            assert.equal(where.id, "review");
            assert.equal(where.psychologist_id, "professional");
            assert.equal(where.deleted, false);
            if (!owner || !where.status.in.includes(currentStatus)) return { count: 0 };
            currentStatus = data.status;
            return { count: 1 };
          },
          count: async ({ where }: { where: unknown }) => {
            assert.deepEqual(where, visibleTestimonialsWhere("professional"));
            return currentStatus === "publicada" ? 1 : 0;
          },
        },
        psychologist_profile: {
          update: async () => {
            countUpdates++;
          },
        },
      });
      const allowed = owner && status !== "oculta";
      const repository = new ProfessionalRepository();
      assert.equal(
        Boolean(await repository.setVisibility("professional", "review", false)),
        allowed,
      );
      if (allowed) {
        assert.equal(currentStatus, "publicada");
        await repository.setVisibility("professional", "review", true);
        assert.equal(currentStatus, "oculta_profissional");
      } else {
        assert.equal(currentStatus, status);
        assert.equal(countUpdates, 0);
      }
    });
  }
}

test("response deletion uses the professional owner and clears only the single response", async (t) => {
  stub(t, prisma.professional_review, "updateMany", async (args: unknown) => {
    assert.deepEqual(args, {
      where: { id: "review", psychologist_id: "professional", deleted: false },
      data: { response: null, responded_at: null },
    });
    return { count: 0 };
  });
  assert.equal(await new ProfessionalRepository().removeResponse("professional", "review"), null);
});

for (const owner of [true, false]) {
  test(`response is owner-scoped and remains available after downgrade (owner=${owner})`, async (t) => {
    let writes = 0;
    transaction(t, {
      professional_review: {
        findFirst: async ({ where }: { where: unknown }) => {
          assert.deepEqual(where, {
            id: "review",
            psychologist_id: "professional",
            deleted: false,
          });
          return owner ? { id: "review" } : null;
        },
        update: async ({ data }: { data: { response: string; responded_at: Date } }) => {
          writes++;
          assert.equal(data.response, "Obrigado pelo relato");
          assert.ok(data.responded_at instanceof Date);
          assert.deepEqual(Object.keys(data).sort(), ["responded_at", "response"]);
          return {
            id: "review",
            status: "oculta_profissional",
            rating: 5,
            comment: "Relato",
            response: data.response,
            responded_at: data.responded_at,
            createdAt: new Date(),
            author: { name: "Patient Name", avatar: "/public/files/avatar/patient.jpg" },
          };
        },
        aggregate: async () => ({ _count: { _all: 0 } }),
        groupBy: async () => [],
      },
      psychologist_profile: {
        findFirst: async () => {
          throw new Error("Responding must not require a paid plan");
        },
        update: async () => undefined,
      },
    });
    const result = await new ProfessionalRepository().respond({
      auth: { id: "professional", role: "psicologo" },
      p: { id: "review" },
      b: { response: " Obrigado pelo relato " },
    });
    assert.equal(Boolean(result), owner);
    if (result) {
      assert.deepEqual(result.review.author, {
        name: "Patient Name",
        initials: "PN",
        avatar: "/public/files/avatar/patient.jpg",
      });
    }
    assert.equal(writes, owner ? 1 : 0);
  });
}
