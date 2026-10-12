import "../../../scripts/register-source-modules.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve(specifier === "next/link" ? "next/link.js" : specifier, context);
  },
});
test("private WhatsApp metric renders real zero, has no action and hides absent or patient values", async () => {
  const { WhatsappMetric } = await import(
    "../../app/app/posts/mine/components/whatsapp-metric.tsx"
  );
  for (const count of [0, 12]) {
    const html = renderToStaticMarkup(
      createElement(WhatsappMetric, { count, isPsychologist: true }),
    );
    assert.match(html, /Cliques no WhatsApp/);
    assert.ok(html.includes(`>${count}</span>`));
    assert.doesNotMatch(html, /<a |<button|href=/);
  }
  for (const props of [
    { count: undefined, isPsychologist: true },
    { count: 12, isPsychologist: false },
    { count: -1, isPsychologist: true },
  ]) {
    assert.equal(renderToStaticMarkup(createElement(WhatsappMetric, props)), "");
  }
});
test("mine posts restore author header and both item types place the private metric before save", () => {
  const mine = readFileSync(new URL("../../app/app/posts/mine/logic.tsx", import.meta.url), "utf8");
  const reply = readFileSync(
    new URL("../../app/app/posts/mine/components/reply-item-card.tsx", import.meta.url),
    "utf8",
  );
  assert.match(mine, /showAuthorHeader\s/);
  assert.match(mine, /actionBarBeforeSaveSlot=\{/);
  assert.match(reply, /beforeSaveSlot=\{/);
  assert.match(mine, /item.whatsapp_clicks_count/);
  assert.match(reply, /item.whatsapp_clicks_count/);
});
