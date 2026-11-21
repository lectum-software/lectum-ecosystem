import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import express from "express";

test("HTTP/PostgreSQL: persisted sessions cannot bypass WhatsApp consent", {
  skip: process.env.WHATSAPP_CONSENT_DB_TEST !== "true",
}, async (t) => {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.port, "55443");
  assert.equal(url.pathname, "/lectum_stripe_test");
  assert.equal(process.env.JWT_SECRET_KEY, "test-only-whatsapp-consent-secret");

  let base = "";
  let externalAttempts = 0;
  const nativeFetch = globalThis.fetch;
  t.mock.method(globalThis, "fetch", async (...[input, init]: Parameters<typeof fetch>) => {
    const target = new URL(input instanceof Request ? input.url : String(input));
    if (!base || target.origin !== base) {
      externalAttempts += 1;
      throw new Error("external_request_forbidden");
    }
    return nativeFetch(input, init);
  });
  const { default: db } = await import("@/infra/database/prisma");
  const { default: routes } = await import("@/modules/api/public/analytics/action");
  const { default: directoryRoutes } = await import(
    "@/modules/api/private/directory/psychologists"
  );
  const { notifyWhatsappClick } = await import("@/main/notification/domain-events");
  const { soc } = await import("@/main/socket/state");
  assert.ok(!soc, "test must not initialize a socket server");
  const { generateToken } = await import("@/modules/api/middlewares/_auth/utils/generateToken");
  const { MarketingConsentRepository } = await import("./consent-repository");
  const { MARKETING_CONSENT_POLICY } = await import("./consent-policy");
  const { default: i18n } = await import("@/main/server/i18n");
  if (!i18n.isInitialized)
    await new Promise<void>((resolve) => i18n.on("initialized", () => resolve()));
  const ids = [randomUUID(), randomUUID(), randomUUID()];
  const devices = ids.map(() => randomUUID());
  const visitor = randomUUID();
  const session = randomUUID();
  const tokens = ids.map((id, index) =>
    generateToken({ id, email: `${id}@example.invalid` }, "user", devices[index]),
  );
  const consent = new MarketingConsentRepository();
  const app = express();
  app.use(express.json());
  app.use("/actions", routes);
  app.use("/psychologists", directoryRoutes);
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const grant = async (index: number) =>
    consent.grant(ids[index], {
      accepted: true,
      document_version: MARKETING_CONSENT_POLICY.documentVersion!,
      expected_revision: (await consent.status(ids[index])).revision,
    });
  const headers = (index: number, cookie = false): Record<string, string> => ({
    "x-device": devices[index],
    ...(cookie
      ? {
          cookie: `lectum_user_session=${tokens[index]}`,
          "x-requested-with": "Lectum-User-Cookie-Auth",
        }
      : { authorization: `Bearer ${tokens[index]}` }),
  });
  const action = async (
    credentials: Record<string, string>,
    allowed: boolean | undefined = true,
    event = randomUUID(),
    actionType = "whatsapp_click",
  ) => {
    const response = await fetch(`${base}/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...credentials },
      body: JSON.stringify({
        visitor_id: visitor,
        session_id: session,
        event_id: event,
        measurement_allowed: allowed,
        action_type: actionType,
      }),
      signal: AbortSignal.timeout(5000),
    });
    assert.equal(response.status, 200);
    const result = (await response.json()) as { data: { tracked: boolean } };
    return result.data.tracked;
  };
  const count = () => db.important_action_event.count({ where: { visitor_id: visitor } });
  const click = async (
    credentials: Record<string, string>,
    allowed?: boolean,
    expectedStatus = 200,
  ) => {
    const response = await fetch(`${base}/psychologists/${ids[2]}/contact-click`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...credentials },
      body: JSON.stringify({ visitor_id: visitor, measurement_allowed: allowed }),
      signal: AbortSignal.timeout(5000),
    });
    assert.equal(response.status, expectedStatus);
    const result = (await response.json()) as {
      data?: { tracked: boolean; whatsapp_url: string; contact_request_id: string | null };
    };
    if (expectedStatus === 200) {
      assert.ok(result.data?.whatsapp_url, "contact remains accessible");
      return result.data!;
    }
    return null;
  };
  const contactCount = () => db.contact_request.count({ where: { psychologist_id: ids[2] } });
  const notificationCount = () => db.notification.count({ where: { user_id: ids[2] } });
  try {
    for (const [index, id] of ids.entries()) {
      await db.user.create({
        data: {
          id,
          name: "Disposable HTTP QA",
          email: `${id}@example.invalid`,
          role: index === 2 ? "psicologo" : "paciente",
          active: true,
          confirmed: true,
        },
      });
      await db.user_token.create({
        data: { user_id: id, device_id: devices[index], token: tokens[index] },
      });
    }
    await db.psychologist_profile.create({
      data: {
        user_id: ids[2],
        published: true,
        whatsapp: "+5511999999999",
        video_url: "https://example.invalid/test.mp4",
      },
    });
    assert.equal(await db.notification_subscription.count({ where: { user_id: ids[2] } }), 0);
    for (const allowed of [undefined, false, true]) {
      assert.equal((await click(headers(0), allowed))?.tracked, false);
    }
    assert.equal(await contactCount(), 0);
    assert.equal(await notificationCount(), 0);
    assert.equal(await action(headers(0)), false);
    await grant(0);
    assert.equal((await click(headers(0), false))?.tracked, false);
    const acceptedContact = await click(headers(0, true), true);
    assert.equal(acceptedContact?.tracked, true);
    assert.ok(acceptedContact?.contact_request_id);
    const storedContact = await db.contact_request.findUniqueOrThrow({
      where: { id: acceptedContact.contact_request_id },
    });
    assert.equal(storedContact.user_id, ids[0]);
    assert.equal(storedContact.psychologist_id, ids[2]);
    const notification = await db.notification.findFirstOrThrow({ where: { user_id: ids[2] } });
    assert.equal(notification.message_key, "clique_whatsapp");
    assert.equal((notification.message_props as { source_id: string }).source_id, storedContact.id);
    assert.equal(
      await db.notification_delivery.count({
        where: { user_id: ids[2], channel: "in_app", status: "delivered" },
      }),
      1,
    );
    assert.equal(
      await db.notification_delivery.count({
        where: { user_id: ids[2], channel: "push", status: "skipped" },
      }),
      1,
    );
    await notifyWhatsappClick({
      actorId: ids[0],
      psychologistId: ids[2],
      contactRequestId: storedContact.id,
    });
    assert.equal(await notificationCount(), 1);
    await grant(2);
    assert.equal((await click(headers(2), true))?.tracked, false);
    assert.equal((await click({ ...headers(0), "x-device": devices[1] }, true))?.tracked, false);
    assert.equal(await contactCount(), 1);
    assert.equal(await action(headers(0), false), false);
    const event = randomUUID();
    assert.equal(await action(headers(0), true, event), true);
    await action(headers(0), true, event);
    assert.equal(await count(), 1);
    const row = await db.important_action_event.findFirstOrThrow({
      where: { visitor_id: visitor },
    });
    assert.equal(row.user_id, ids[0]);
    assert.equal(
      await action(headers(0, true), true, randomUUID(), "psychologist_video_whatsapp_click"),
      true,
    );
    assert.equal(await count(), 2);

    assert.equal(await action(headers(1)), false);
    await grant(1);
    assert.equal(await action(headers(1)), false);
    assert.equal(
      (await db.visitor_session.findFirstOrThrow({ where: { visitor_id: visitor } })).user_id,
      ids[0],
    );
    assert.equal(await action({ ...headers(0), "x-device": devices[1] }), false);
    const missingDevice = headers(0);
    delete missingDevice["x-device"];
    assert.equal(await action(missingDevice), false);

    await consent.revoke(ids[0]);
    assert.equal((await click(headers(0), true))?.tracked, false);
    assert.equal(await contactCount(), 1);
    assert.equal(await notificationCount(), 1);
    assert.equal(await action(headers(0)), false);
    assert.equal(await action(headers(0, true)), false);
    await grant(0);
    await db.marketing_consent.update({
      where: { user_id: ids[0] },
      data: { expires_at: new Date(Date.now() - 1000) },
    });
    assert.equal(await action(headers(0)), false);
    await grant(0);
    await db.notification_preference.create({
      data: { user_id: ids[2], prefs: { clique_whatsapp: { enabled: false } } },
    });
    assert.equal((await click(headers(0), true))?.tracked, true);
    assert.equal(await contactCount(), 2);
    assert.equal(await notificationCount(), 1);
    assert.equal(
      await db.notification_delivery.count({
        where: {
          user_id: ids[2],
          channel: "in_app",
          status: "skipped",
          failure_reason: "preference_disabled",
        },
      }),
      1,
    );
    await db.user_token.deleteMany({ where: { user_id: ids[0] } });
    assert.equal((await click(headers(0), true))?.tracked, false);
    await db.psychologist_profile.update({
      where: { user_id: ids[2] },
      data: { published: false },
    });
    await click(headers(1), true, 404);
    assert.equal(await contactCount(), 2);
    assert.equal(await notificationCount(), 1);
    assert.equal(await action(headers(0)), false);
    assert.equal(await action(headers(0, true)), false);
    assert.equal(await count(), 2);
    assert.equal(externalAttempts, 0);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    try {
      await db.important_action_event.deleteMany({ where: { visitor_id: visitor } });
      await db.visitor_session.deleteMany({ where: { visitor_id: visitor } });
      await db.notification_delivery.deleteMany({ where: { user_id: ids[2] } });
      await db.notification.deleteMany({ where: { user_id: ids[2] } });
      await db.contact_request.deleteMany({ where: { psychologist_id: ids[2] } });
      await db.user_token.deleteMany({ where: { user_id: { in: ids } } });
      await db.user.deleteMany({ where: { id: { in: ids } } });
      assert.equal(await db.user.count({ where: { id: { in: ids } } }), 0);
    } finally {
      await db.$disconnect();
    }
  }
});
