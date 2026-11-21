import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import type { Request } from "express";

test("PostgreSQL: WhatsApp consent and account isolation", {
  skip: process.env.WHATSAPP_CONSENT_DB_TEST !== "true",
}, async (t) => {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.port, "55443");
  assert.equal(url.pathname, "/lectum_stripe_test");
  const network = t.mock.method(globalThis, "fetch", async () => {
    throw new Error("external_request_forbidden");
  });
  const { default: db } = await import("@/infra/database/prisma");
  const { MarketingConsentRepository } = await import("./consent-repository");
  const { MARKETING_CONSENT_POLICY } = await import("./consent-policy");
  const { ContactRepository } = await import(
    "@/modules/api/private/directory/psychologists/repositories/ContactRepository"
  );
  const { store } = await import("@/modules/api/public/analytics/action/use-cases/services");
  const ids = [randomUUID(), randomUUID(), randomUUID()];
  const visitor = randomUUID(),
    session = randomUUID(),
    oldSession = randomUUID();
  const contact = new ContactRepository(),
    consent = new MarketingConsentRepository();
  try {
    for (const [index, id] of ids.entries())
      await db.user.create({
        data: {
          id,
          name: "Disposable WhatsApp QA",
          email: `${id}@example.invalid`,
          role: index === 2 ? "psicologo" : "paciente",
        },
      });
    await db.psychologist_profile.create({
      data: {
        user_id: ids[2],
        published: true,
        whatsapp: "+5511999999999",
        video_url: "https://example.invalid/test.mp4",
      },
    });
    const users = await Promise.all(
      ids.slice(0, 2).map((id) => db.user.findUniqueOrThrow({ where: { id } })),
    );
    const click = (index: number, allowed?: boolean) =>
      contact.registerClick({
        p: { id: ids[2] },
        auth: users[index],
        b: { measurement_allowed: allowed, visitor_id: visitor },
      });
    const action = (
      index: number,
      allowed?: boolean,
      eventId = randomUUID(),
      currentSession = session,
    ) =>
      store({
        auth: users[index],
        b: {
          action_type: "whatsapp_click",
          measurement_allowed: allowed,
          event_id: eventId,
          visitor_id: visitor,
          session_id: currentSession,
          path: "/psicologos/test",
        },
      } as unknown as Request);
    const count = () => db.contact_request.count({ where: { psychologist_id: ids[2] } });
    const grant = async (index: number) =>
      consent.grant(ids[index], {
        accepted: true,
        document_version: MARKETING_CONSENT_POLICY.documentVersion!,
        expected_revision: (await consent.status(ids[index])).revision,
      });

    for (const allowed of [undefined, false, true]) {
      const result = await click(0, allowed);
      assert.equal(result.ok && result.data.tracked, false);
      assert.ok(result.ok && result.data.whatsapp_url);
      assert.equal((await action(0, allowed)).data.tracked, false);
    }
    assert.equal(await count(), 0);
    assert.equal(await db.visitor_session.count({ where: { visitor_id: visitor } }), 0);

    await grant(0);
    assert.equal((await action(0, false)).data.tracked, false);
    const accepted = await click(0, true);
    assert.equal(accepted.ok && accepted.data.tracked, true);
    assert.equal(await count(), 1);
    const event = randomUUID();
    assert.equal((await action(0, true, event)).data.tracked, true);
    await action(0, true, event);
    assert.equal(await db.important_action_event.count({ where: { visitor_id: visitor } }), 1);

    // A different account cannot borrow the first account's consent or session.
    assert.equal((await action(1, true)).data.tracked, false);
    await grant(1);
    assert.equal((await action(1, true)).data.tracked, false);
    const owned = await db.visitor_session.findFirstOrThrow({
      where: { visitor_id: visitor, session_id: session },
    });
    assert.equal(owned.user_id, ids[0]);

    await db.visitor_session.create({ data: { visitor_id: visitor, session_id: oldSession } });
    await db.important_action_event.create({
      data: {
        visitor_id: visitor,
        session_id: oldSession,
        action_type: "whatsapp_click",
        page_kind: "psychologist_profile",
      },
    });
    await action(0, true);
    assert.equal(
      (
        await db.visitor_session.findFirstOrThrow({
          where: { visitor_id: visitor, session_id: oldSession },
        })
      ).user_id,
      null,
    );
    assert.equal(
      (
        await db.important_action_event.findFirstOrThrow({
          where: { visitor_id: visitor, session_id: oldSession },
        })
      ).user_id,
      null,
    );

    await consent.revoke(ids[0]);
    assert.equal((await action(0, true)).data.tracked, false);
    const revoked = await click(0, true);
    assert.equal(revoked.ok && revoked.data.tracked, false);
    assert.equal(await count(), 1);

    await grant(0);
    await db.marketing_consent.update({
      where: { user_id: ids[0] },
      data: { expires_at: new Date(Date.now() - 1000) },
    });
    assert.equal((await action(0, true)).data.tracked, false);
    assert.equal((await click(0, true)).ok, true);
    assert.equal(await count(), 1);
    await grant(0);
    await db.marketing_consent.update({
      where: { user_id: ids[0] },
      data: { document_version: "obsolete-test-version" },
    });
    assert.equal((await action(0, true)).data.tracked, false);
    await grant(0);
    await db.psychologist_profile.update({
      where: { user_id: ids[2] },
      data: { published: false },
    });
    assert.equal((await click(0, true)).ok, false);
    assert.equal(await count(), 1);
    assert.equal(network.mock.callCount(), 0);
  } finally {
    // Only fixtures owned by this invocation; no reset or shared-table cleanup.
    await db.important_action_event.deleteMany({ where: { visitor_id: visitor } });
    await db.visitor_session.deleteMany({ where: { visitor_id: visitor } });
    await db.contact_request.deleteMany({ where: { psychologist_id: ids[2] } });
    await db.user.deleteMany({ where: { id: { in: ids } } });
    assert.equal(await db.user.count({ where: { id: { in: ids } } }), 0);
    await db.$disconnect();
  }
});
