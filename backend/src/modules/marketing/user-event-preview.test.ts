import assert from "node:assert/strict";
import { test } from "node:test";
import { buildMetaCapiPayload } from "./meta-capi";
import { previewUserEvent } from "./user-event-preview";

test("user action previews describe actions, not treatment or conversation", () => {
  for (const [action, event_name] of Object.entries({
    registration_completed: "CompleteRegistration",
    whatsapp_clicked: "Contact",
    publication_created: "forum_post",
  })) {
    assert.deepEqual(previewUserEvent({ action }), {
      transmissionAllowed: false,
      status: "preview_only",
      event: { event_name },
    });
  }
});

test("previews reject context, content, destination and identity rather than laundering them", () => {
  for (const action of ["registration_completed", "whatsapp_clicked", "publication_created"]) {
    for (const key of [
      "community",
      "community_id",
      "topic",
      "text",
      "post_id",
      "profile",
      "professional_id",
      "specialty",
      "phone",
      "message",
      "whatsapp_url",
      "sourceUrl",
      "event_source_url",
      "referrer",
      "utm_source",
      "email",
      "user_id",
      "fbp",
      "fbc",
      "user_data",
      "custom_data",
    ]) {
      assert.equal(previewUserEvent({ action, [key]: "not-allowed" }), null, key);
    }
  }
  for (const input of [null, {}, [], { action: "appointment_completed" }]) {
    assert.equal(previewUserEvent(input), null);
  }
});

test("local previews cannot be serialized or unlock existing delivery gates", () => {
  const preview = previewUserEvent({ action: "whatsapp_clicked" });
  assert.equal(buildMetaCapiPayload(preview, [], 1795110000), null);
  assert.equal(preview?.transmissionAllowed, false);
});
