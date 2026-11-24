import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import {
  canCaptureExperience,
  createExperienceChoice,
  EXPERIENCE_MAX_AGE_MS,
  experienceStorageKey,
  isSamePageReelTransition,
  parseExperienceChoice,
} from "./experience-policy.ts";
import { createPrivacyChoice } from "./policy.ts";

test("release enables production but never silently enables local capture", () => {
  const code = ts.transpileModule(
    readFileSync(new URL("./use-experience-choice.ts", import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  ).outputText;
  for (const [environment, override, preview, enabled, local] of [
    ["production", undefined, undefined, true, false],
    ["production", "false", "true", false, false],
    ["production", "true", "true", true, false],
    ["development", undefined, undefined, false, false],
    ["development", undefined, "true", true, true],
    ["development", "false", "true", false, true],
    ["test", undefined, "true", false, false],
  ]) {
    const exports = {};
    vm.runInNewContext(code, {
      exports,
      require: () => ({}),
      process: {
        env: {
          NODE_ENV: environment,
          NEXT_PUBLIC_EXPERIENCE_ENABLED: override,
          NEXT_PUBLIC_EXPERIENCE_PREVIEW: preview,
        },
      },
    });
    assert.equal(exports.EXPERIENCE_ENABLED, enabled);
    assert.equal(exports.EXPERIENCE_PREVIEW, local);
  }
});

test("native reel transitions only resume within the same public page", () => {
  const base = "https://lectum.com.br/comunidades/geral/publicacao/post";
  const from = `${base}?reel=first&reelPost=post`;
  assert.equal(isSamePageReelTransition(from, `${base}?reel=second&reelPost=post`), true);
  for (const to of [
    `${base}?reel=second&token=secret`,
    `${base}?reel=second#private`,
    `${base}?reel=second&reel=third`,
    `${base}/resposta/reply?reel=second`,
    "https://other.example/?reel=second",
    "https://lectum.com.br/app?reel=second",
    "invalid",
  ])
    assert.equal(isSamePageReelTransition(from, to), false, to);
  assert.equal(isSamePageReelTransition(`${base}?search=private`, from), false);
  assert.equal(isSamePageReelTransition("https://lectum.com.br/app?reel=first", from), false);
});

test("experience consent is independent of Meta and account scope", () => {
  assert.equal(parseExperienceChoice(JSON.stringify(createPrivacyChoice(true))), null);
  assert.notEqual(experienceStorageKey(null), experienceStorageKey("account-a"));
  assert.notEqual(experienceStorageKey("account-a"), experienceStorageKey("account-b"));
  assert.equal(
    parseExperienceChoice(JSON.stringify(createExperienceChoice(false, 100)), 101).allowed,
    false,
  );
  assert.equal(
    parseExperienceChoice(JSON.stringify(createExperienceChoice(true, 100)), 101).allowed,
    true,
  );
});

test("missing, malformed, obsolete, future and expired choices fail closed", () => {
  const valid = createExperienceChoice(true, 100);
  for (const raw of [
    null,
    "",
    "{",
    "{}",
    JSON.stringify({ ...valid, version: "old" }),
    JSON.stringify({ ...valid, allowed: "true" }),
    JSON.stringify({ ...valid, savedAt: 300 }),
    JSON.stringify({ ...valid, expiresAt: 200 }),
    JSON.stringify({ ...valid, expiresAt: 101 + EXPERIENCE_MAX_AGE_MS }),
  ]) {
    assert.equal(parseExperienceChoice(raw, 200), null);
  }
});

test("private and filtered routes stay excluded even with consent", () => {
  for (const path of [
    "/politica-de-privacidade",
    "/termos-de-servico",
    "/auth/login",
    "/app",
    "/app/profissional/assinatura/pagamento",
    "/psicologos/person/contato",
    "/comunidades/ansiedade/publicacao/post/whatsapp",
    "/psicologos?search=private",
    "/#private",
  ]) {
    assert.equal(
      canCaptureExperience({
        enabled: true,
        choice: createExperienceChoice(true),
        url: `https://lectum.com.br${path}`,
        referrer: "",
      }),
      false,
    );
  }
  assert.equal(
    canCaptureExperience({
      enabled: true,
      choice: createExperienceChoice(true),
      url: "invalid",
      referrer: "",
    }),
    false,
  );
  assert.equal(
    canCaptureExperience({
      enabled: false,
      choice: createExperienceChoice(true),
      url: "https://lectum.com.br/",
      referrer: "",
    }),
    false,
  );
});

test("public pages require explicit consent and reject sensitive query values", () => {
  const input = { enabled: true, choice: createExperienceChoice(true), referrer: "" };
  for (const path of [
    "/",
    "/psicologos",
    "/comunidades",
    "/psicologos/person",
    "/comunidades/ansiedade",
    "/comunidades/ansiedade/publicacao/post",
    "/comunidades/ansiedade/publicacao/post/resposta/reply",
  ]) {
    const url = `https://lectum.com.br${path}`;
    assert.equal(canCaptureExperience({ ...input, url }), true);
    assert.equal(canCaptureExperience({ ...input, url, choice: null }), false);
    assert.equal(
      canCaptureExperience({ ...input, url, choice: createExperienceChoice(false) }),
      false,
    );
    assert.equal(canCaptureExperience({ ...input, url, enabled: false }), false);
    assert.equal(canCaptureExperience({ ...input, url: `${url}?search=health` }), false);
    assert.equal(canCaptureExperience({ ...input, url: `${url}#private` }), false);
    assert.equal(
      canCaptureExperience({ ...input, url, referrer: "https://lectum.com.br/comunidades" }),
      true,
    );
    for (const referrer of [
      "https://external.example/",
      "https://lectum.com.br/app",
      "https://lectum.com.br/psicologos?search=health",
    ]) {
      assert.equal(canCaptureExperience({ ...input, url, referrer }), false);
    }
  }
});

test("shared reels and focused replies accept only navigation identifiers", () => {
  const input = { enabled: true, choice: createExperienceChoice(true), referrer: "" };
  const post = "/comunidades/ansiedade/publicacao/post";
  for (const path of [
    "/?reel=video&reelPost=post&reelReply=reply",
    `${post}?reel=video&reelPost=post&reelReply=reply`,
    `${post}/resposta/reply?reel=video`,
    `${post}?focusReplyId=reply#reply-reply`,
    "/comunidades/top-mentores?community=ansiedade",
  ]) {
    const url = `https://lectum.com.br${path}`;
    assert.equal(canCaptureExperience({ ...input, url }), true, path);
    assert.equal(
      canCaptureExperience({
        ...input,
        url: "https://lectum.com.br/psicologos/person",
        referrer: url,
      }),
      true,
      path,
    );
  }
  for (const path of [
    "/?reel=video&token=secret",
    "/?reel=video&reel=other",
    "/?reel=free%20text",
    "/?reelPost=post",
    "/psicologos/person?reel=video",
    `${post}?focusReplyId=reply#reply-other`,
    `${post}?email=test`,
    "/app?reel=video",
    "/auth/login?reel=video",
    "/comunidades/ansiedade/publicacao/post/edit",
    "/psicologos/person/settings",
  ])
    assert.equal(
      canCaptureExperience({ ...input, url: `https://lectum.com.br${path}` }),
      false,
      path,
    );
});

test("preview origins require an explicit local flag", () => {
  const input = { enabled: true, choice: createExperienceChoice(true), referrer: "" };
  const url = "http://127.0.0.1:3146/psicologos";
  assert.equal(canCaptureExperience({ ...input, url }), false);
  assert.equal(canCaptureExperience({ ...input, url, localPreview: true }), true);
  for (const url of [
    "https://other.example/psicologos",
    "http://lectum.com.br/psicologos",
    "http://127.0.0.1.evil.example/psicologos",
    "https://user:pass@lectum.com.br/psicologos",
  ]) {
    assert.equal(canCaptureExperience({ ...input, url, localPreview: true }), false);
  }
});
