import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { afterEach, mock, test } from "node:test";
import type prisma from "@/infra/database/prisma";
import { renderTemplate } from "@/modules/api/config/nodemailer/send";
import {
  isReplyEmailAllowed,
  replyEmailId,
  replyEmailMessage,
  sendReplyEmail,
} from "./reply-email";

const params = {
  actorId: "actor",
  recipientId: "recipient",
  replyId: "reply",
  postId: "post",
  communitySlug: "community",
};
const originalWebUrl = process.env.WEB_URL;
afterEach(() => {
  mock.restoreAll();
  if (originalWebUrl === undefined) delete process.env.WEB_URL;
  else process.env.WEB_URL = originalWebUrl;
});

const setup = (
  options: {
    prefs?: unknown;
    confirmed?: boolean;
    email?: string;
    absent?: boolean;
    configured?: boolean;
    sent?: boolean;
    throws?: boolean;
  } = {},
) => {
  process.env.WEB_URL = "https://lectum.example";
  const claimed = new Set<string>();
  const created: Array<Record<string, unknown>> = [];
  const updated: Array<Record<string, unknown>> = [];
  const sends: unknown[] = [];
  const find = mock.fn(async (_query: { where: unknown }) =>
    options.absent
      ? null
      : {
          email: options.email ?? "recipient@example.test",
          confirmed: options.confirmed ?? true,
          notification_preference: { prefs: options.prefs },
        },
  );
  const create = mock.fn(async ({ data }: { data: Record<string, unknown> }) => {
    const id = String(data.id);
    if (claimed.has(id)) throw Object.assign(new Error("duplicate"), { code: "P2002" });
    claimed.add(id);
    created.push(data);
    return data;
  });
  const update = mock.fn(async ({ data }: { data: Record<string, unknown> }) => {
    updated.push(data);
    return data;
  });
  const deps = {
    db: { user: { findFirst: find }, notification_delivery: { create, update } } as unknown as Pick<
      typeof prisma,
      "user" | "notification_delivery"
    >,
    configured: () => options.configured ?? true,
    send: async (message: unknown) => {
      sends.push(message);
      if (options.throws) throw new Error("provider failure");
      return options.sent ?? true;
    },
  };
  return { deps, created, updated, sends, find, create };
};

test("post and comment emails use the exact reply link and no conversation content", () => {
  process.env.WEB_URL = "https://lectum.example";
  for (const parentReplyId of [null, "parent"]) {
    const message = replyEmailMessage({ ...params, parentReplyId }, "recipient@example.test");
    assert.ok(message);
    assert.equal(
      message.messageProps.url,
      "https://lectum.example/comunidades/community/publicacao/post?focusReplyId=reply",
    );
    assert.match(
      message.messageProps.invited_description,
      parentReplyId ? /comentário/ : /publicação/,
    );
    assert.equal(message.messageProps.btn_accept_invite, "Ver resposta");
    assert.equal(message.transportTimeoutMs, 10_000);
    assert.equal("html" in message.messageProps, false);
  }
  delete process.env.WEB_URL;
  assert.equal(replyEmailMessage(params, "recipient@example.test"), null);
});

test("reply email respects global and legacy email opt-outs independently from push", () => {
  for (const prefs of [
    undefined,
    {},
    { nova_resposta: { enabled: true } },
    { nova_resposta: { push: false, in_app: false, email: true } },
  ]) {
    assert.equal(isReplyEmailAllowed(prefs), true);
  }
  for (const prefs of [
    { nova_resposta: { enabled: false } },
    { nova_resposta: { email: false } },
    { nova_resposta: { enabled: true, email: false } },
  ]) {
    assert.equal(isReplyEmailAllowed(prefs), false);
  }
});

test("reply layout spaces the CTA and renders the small notice after the sender", () => {
  process.env.WEB_URL = "https://lectum.example";
  const template = readFileSync("templates/transactional.hbs", "utf8");
  for (const parentReplyId of [null, "parent"]) {
    const message = replyEmailMessage({ ...params, parentReplyId }, "preview@example.test");
    assert.ok(message);
    assert.equal("valid_link" in message.messageProps, false);
    const html = renderTemplate(template, { ...message.messageProps, system: "Lectum" });
    assert.match(html, /margin: 38px 0 0/);
    assert.match(html, /background-color: #004df5/);
    assert.match(html, /font-size: 11px; line-height: 17px/);
    assert.ok(html.indexOf("Enviado por Lectum") < html.indexOf("Você pode desativar"));
    assert.doesNotMatch(html, /\{\{/);
  }
  const otherEmail = renderTemplate(template, {
    url: "https://lectum.example",
    valid_link: "Existing link notice",
  });
  assert.doesNotMatch(otherEmail, /margin: 38px 0 0/);
  assert.doesNotMatch(otherEmail, /background-color: #004df5/);
  assert.doesNotMatch(otherEmail, /font-size: 11px/);
  assert.match(otherEmail, /Existing link notice/);
});

test("atomic claim sends once under concurrent and repeated events", async () => {
  const state = setup();
  await Promise.all([sendReplyEmail(params, state.deps), sendReplyEmail(params, state.deps)]);
  await sendReplyEmail(params, state.deps);
  assert.equal(state.sends.length, 1);
  assert.equal(state.created.length, 1);
  assert.equal(state.created[0].status, "queued");
  assert.equal(state.updated[0].status, "sent");
  assert.ok(state.updated[0].sent_at instanceof Date);
  assert.notEqual(replyEmailId("recipient", "reply"), replyEmailId("recipient", "other"));
  assert.notEqual(replyEmailId("recipient", "reply"), replyEmailId("other", "reply"));
  assert.deepEqual(state.find.mock.calls[0].arguments[0].where, {
    id: "recipient",
    deleted: false,
    active: true,
    account_status: "active",
    role: { in: ["paciente", "psicologo"] },
  });
});

test("self replies do not query or send", async () => {
  const state = setup();
  await sendReplyEmail({ ...params, actorId: params.recipientId }, state.deps);
  assert.equal(state.find.mock.callCount(), 0);
  assert.equal(state.sends.length, 0);
});

test("email remains independent of disabled in-app and push channels", async () => {
  const state = setup({ prefs: { nova_resposta: { in_app: false, push: false, email: true } } });
  await sendReplyEmail(params, state.deps);
  assert.equal(state.sends.length, 1);
});

test("failed claim never sends email or propagates an error", async () => {
  const state = setup();
  state.create.mock.mockImplementation(async () => {
    throw new Error("database unavailable");
  });
  const log = mock.method(console, "error", () => {});
  await sendReplyEmail(params, state.deps);
  assert.equal(state.sends.length, 0);
  assert.equal(state.updated.length, 0);
  assert.equal(log.mock.callCount(), 1);
});

test("ineligible accounts do not receive emails", async () => {
  const state = setup({ absent: true });
  await sendReplyEmail(params, state.deps);
  assert.equal(state.sends.length, 0);
  assert.equal(state.created.length, 0);
});

for (const [options, reason] of [
  [{ prefs: { nova_resposta: { enabled: false } } }, "preference_disabled"],
  [{ confirmed: false }, "email_unconfirmed"],
  [{ email: " " }, "email_missing"],
  [{ configured: false }, "email_provider_unavailable"],
] as const) {
  test(`skips and audits ${reason}`, async () => {
    const state = setup(options);
    await sendReplyEmail(params, state.deps);
    assert.equal(state.sends.length, 0);
    assert.equal(state.created[0].status, "skipped");
    assert.equal(state.created[0].failure_reason, reason);
  });
}

test("invalid public origin skips instead of sending a broken link", async () => {
  const state = setup();
  delete process.env.WEB_URL;
  await sendReplyEmail(params, state.deps);
  assert.equal(state.sends.length, 0);
  assert.equal(state.created[0].failure_reason, "public_url_missing");
});

for (const options of [{ sent: false }, { throws: true }]) {
  test(`provider failure is audited and never propagated (${JSON.stringify(options)})`, async () => {
    const state = setup(options);
    await sendReplyEmail(params, state.deps);
    assert.equal(state.updated[0].status, "failed");
    assert.equal(state.updated[0].failure_reason, "email_send_failed");
    assert.equal(state.updated[0].sent_at, null);
    await sendReplyEmail(params, state.deps);
    assert.equal(state.sends.length, 1);
  });
}
