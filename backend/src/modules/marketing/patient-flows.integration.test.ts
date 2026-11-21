import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import type { ICommunityCreatePostDTO } from "@/modules/api/private/community/DTOs/ICommunityDTO";

test("PostgreSQL: patient registration and posting preserve optional measurement boundaries", {
  skip: process.env.WHATSAPP_CONSENT_DB_TEST !== "true",
}, async (t) => {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.port, "55443");
  assert.equal(url.pathname, "/lectum_stripe_test");
  const external = t.mock.method(globalThis, "fetch", async () => {
    throw new Error("external_request_forbidden");
  });
  const { default: db } = await import("@/infra/database/prisma");
  const { StoreRepository } = await import(
    "@/modules/api/public/user/store/repositories/StoreRepository"
  );
  const { LoginRepository } = await import(
    "@/modules/api/public/auth/login/repositories/LoginRepository"
  );
  const { createPost } = await import("@/modules/api/private/community/use-cases/services");
  const { MarketingConsentRepository } = await import("./consent-repository");
  const { MARKETING_CONSENT_POLICY } = await import("./consent-policy");
  const { registrationCommitted, confirmedMarketingAction } = await import("./conversion-hooks");
  const { soc } = await import("@/main/socket/state");
  assert.ok(!soc);
  const run = randomUUID();
  const communityId = randomUUID();
  const slug = `qa-patient-${run}`;
  const users: string[] = [];
  const emails: string[] = [];
  const consent = new MarketingConsentRepository();
  try {
    await db.community.create({ data: { id: communityId, slug, name: "Disposable QA community" } });
    for (const provider of ["email", "google"] as const) {
      for (const choice of [undefined, false, true]) {
        const email = `${randomUUID()}@example.invalid`;
        emails.push(email);
        const body = {
          name: "Disposable patient QA",
          email,
          role: "paciente" as const,
          adult_confirmed: true,
          birthdate: "1990-01-01",
          terms_accepted: true,
          analytics_visitor_id: run,
          analytics_session_id: run,
          measurement_allowed: choice,
        };
        // Exercise persistence without sending verification email or contacting OAuth.
        const created =
          provider === "email"
            ? await new StoreRepository().store({
                p: {},
                q: {},
                b: {
                  ...body,
                  password: "unused-test-hash",
                  password_confirm: "unused-test-hash",
                },
              })
            : await new LoginRepository().store({ b: { ...body, provider: "google" } });
        assert.ok(created?.id);
        users.push(created.id);
        assert.ok(await db.patient_profile.findUnique({ where: { user_id: created.id } }));
        assert.equal(
          await db.user_background.count({
            where: {
              user_id: created.id,
              type: "patient_signup_analytics_identity",
            },
          }),
          provider === "email" && choice === true ? 1 : 0,
        );
        assert.equal(
          await db.user_background.count({
            where: {
              user_id: created.id,
              type: "adult_declaration",
            },
          }),
          1,
        );
        assert.equal((await registrationCommitted("paciente")).status, "blocked");
      }
    }

    // Posting is a requested product operation, independent of optional cookies.
    const author = await db.user.findUniqueOrThrow({ where: { id: users[0] } });
    const recipientEmail = `${randomUUID()}@example.invalid`;
    emails.push(recipientEmail);
    const recipient = await db.user.create({
      data: {
        name: "Disposable professional QA",
        email: recipientEmail,
        role: "psicologo",
      },
    });
    users.push(recipient.id);
    await db.community_member.create({ data: { community_id: communityId, user_id: author.id } });
    await db.community_member.create({
      data: { community_id: communityId, user_id: recipient.id },
    });
    assert.equal(
      await db.notification_subscription.count({ where: { user_id: { in: users } } }),
      0,
    );
    for (const state of ["absent", "accepted", "revoked"] as const) {
      if (state === "accepted")
        await consent.grant(author.id, {
          accepted: true,
          document_version: MARKETING_CONSENT_POLICY.documentVersion!,
          expected_revision: (await consent.status(author.id)).revision,
        });
      if (state === "revoked") await consent.revoke(author.id);
      const result = await createPost({
        auth: author,
        p: { slug },
        b: {
          title: "Uma leitura interessante",
          content: "Hoje terminei um livro e gostei de compartilhar esta leitura.",
          anonymous: true,
        },
      } as ICommunityCreatePostDTO);
      assert.equal(result.status, 201, state);
    }
    const posts = await db.community_post.findMany({ where: { community_id: communityId } });
    assert.equal(posts.length, 3);
    assert.ok(
      posts.every(
        (post) => post.status === "publicado" && post.anonymous && post.author_id === author.id,
      ),
    );
    assert.equal(
      await db.notification.count({ where: { user_id: recipient.id, message_key: "novo_post" } }),
      3,
    );
    const blocked = await createPost({
      auth: author,
      p: { slug },
      b: {
        title: "Teste de moderacao",
        content: "Visite https://example.invalid/test",
        anonymous: true,
      },
    } as ICommunityCreatePostDTO);
    assert.equal(blocked.status, 422);
    assert.equal(
      await db.community_post.count({ where: { community_id: communityId, status: "bloqueado" } }),
      1,
    );
    assert.equal(
      await db.content_moderation_event.count({ where: { community_id: communityId } }),
      1,
    );
    assert.equal(
      await db.notification.count({ where: { user_id: recipient.id, message_key: "novo_post" } }),
      3,
    );
    assert.equal(await db.important_action_event.count({ where: { user_id: { in: users } } }), 0);
    assert.equal(await db.visitor_session.count({ where: { user_id: { in: users } } }), 0);
    assert.equal((await confirmedMarketingAction("patient_community_post")).status, "blocked");
    assert.equal(external.mock.callCount(), 0);
  } finally {
    try {
      // Include generated emails so cleanup still works if a post-create assertion fails.
      await db.content_moderation_event.deleteMany({ where: { community_id: communityId } });
      await db.notification_delivery.deleteMany({ where: { user_id: { in: users } } });
      await db.notification.deleteMany({ where: { user_id: { in: users } } });
      await db.community_post.deleteMany({ where: { community_id: communityId } });
      await db.community_member.deleteMany({ where: { community_id: communityId } });
      await db.community.deleteMany({ where: { id: communityId } });
      await db.user.deleteMany({ where: { email: { in: emails } } });
      assert.equal(await db.user.count({ where: { email: { in: emails } } }), 0);
    } finally {
      await db.$disconnect();
    }
  }
});
