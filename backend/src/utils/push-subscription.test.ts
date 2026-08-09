import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isWebPushSubscriptionPayload, webPushSubscriptionSchema } from "./push-subscription";

const validSubscription = {
  endpoint: "https://fcm.googleapis.com/fcm/send/abc",
  expirationTime: null,
  keys: {
    auth: "auth-key",
    p256dh: "public-key",
  },
};

describe("web push subscription", () => {
  it("aceita somente a estrutura necessária para o envio", () => {
    assert.equal(isWebPushSubscriptionPayload(validSubscription), true);
    assert.equal(webPushSubscriptionSchema.safeParse(validSubscription).success, true);
  });

  it("aceita endpoints conhecidos de Google, Mozilla, Apple e Microsoft", () => {
    const endpoints = [
      "https://fcm.googleapis.com/fcm/send/abc",
      "https://android.googleapis.com/gcm/send/abc",
      "https://updates.push.services.mozilla.com/wpush/v2/abc",
      "https://push.services.mozilla.com/wpush/v2/abc",
      "https://web.push.apple.com/Qabc",
      "https://wns2-bl2p.notify.windows.com/w/?token=abc",
    ];

    for (const endpoint of endpoints) {
      assert.equal(isWebPushSubscriptionPayload({ ...validSubscription, endpoint }), true);
    }
  });

  it("recusa endpoints inseguros, chaves ausentes e campos inesperados", () => {
    assert.equal(
      isWebPushSubscriptionPayload({ ...validSubscription, endpoint: "http://fcm.googleapis.com" }),
      false,
    );
    assert.equal(
      isWebPushSubscriptionPayload({
        ...validSubscription,
        endpoint: "https://127.0.0.1/internal",
      }),
      false,
    );
    assert.equal(
      isWebPushSubscriptionPayload({
        ...validSubscription,
        endpoint: "https://fcm.googleapis.com:8443/subscription",
      }),
      false,
    );
    assert.equal(
      isWebPushSubscriptionPayload({
        ...validSubscription,
        endpoint: "https://user:password@fcm.googleapis.com/subscription",
      }),
      false,
    );
    assert.equal(
      isWebPushSubscriptionPayload({
        ...validSubscription,
        endpoint: "https://fcm.googleapis.com/subscription#fragment",
      }),
      false,
    );
    assert.equal(
      isWebPushSubscriptionPayload({
        ...validSubscription,
        endpoint: "https://fcm.googleapis.com/subscription\n",
      }),
      false,
    );
    assert.equal(
      isWebPushSubscriptionPayload({
        ...validSubscription,
        endpoint: "https://push.example.com/subscription",
      }),
      false,
    );
    assert.equal(
      isWebPushSubscriptionPayload({
        ...validSubscription,
        endpoint: "https://fcm.googleapis.com.attacker.example/subscription",
      }),
      false,
    );
    assert.equal(
      isWebPushSubscriptionPayload({ ...validSubscription, keys: { auth: "key" } }),
      false,
    );
    assert.equal(isWebPushSubscriptionPayload({ ...validSubscription, extra: "value" }), false);
    assert.equal(
      isWebPushSubscriptionPayload({
        ...validSubscription,
        keys: { ...validSubscription.keys, auth: " " },
      }),
      false,
    );
  });
});
