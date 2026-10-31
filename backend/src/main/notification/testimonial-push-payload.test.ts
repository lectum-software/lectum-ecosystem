import assert from "node:assert/strict";
import { mock, test } from "node:test";
import webPush from "web-push";

test("real push sender serializes the approved CTA without sending to any provider", async () => {
  const before = [
    process.env.VAPID_EMAIL,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  ];
  const keys = webPush.generateVAPIDKeys();
  process.env.VAPID_EMAIL = "mailto:qa@example.invalid";
  process.env.VAPID_PUBLIC_KEY = keys.publicKey;
  process.env.VAPID_PRIVATE_KEY = keys.privateKey;
  const payloads: string[] = [];
  const send = mock.method(
    webPush,
    "sendNotification",
    async (_subscription: unknown, payload: unknown) => {
      payloads.push(String(payload));
      return { statusCode: 201, body: "", headers: {} };
    },
  );
  try {
    const { sendWebPushToSubscriptions } = await import("./push");
    const result = await sendWebPushToSubscriptions({
      title: "Recebeu acolhimento? Retribua com um relato",
      body: "Compartilhe sua experiência.",
      action: "leave_testimonial",
      redirect: "/app/depoimentos/pendentes?batch=owned",
      subscriptions: [
        {
          id: "synthetic",
          subscription: {
            endpoint: "https://fcm.googleapis.com/qa-no-network",
            keys: { auth: "synthetic", p256dh: "synthetic" },
          },
        },
      ],
    });
    assert.equal(result.status, "sent");
    assert.equal(payloads.length, 1);
    assert.deepEqual(JSON.parse(payloads[0]).notification.actions, [
      { action: "leave_testimonial", title: "Deixar depoimento" },
    ]);
    assert.equal(JSON.parse(payloads[0]).data.redirect, "/app/depoimentos/pendentes?batch=owned");
  } finally {
    send.mock.restore();
    for (const [i, key] of ["VAPID_EMAIL", "VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY"].entries()) {
      if (before[i] === undefined) delete process.env[key];
      else process.env[key] = before[i];
    }
  }
});
