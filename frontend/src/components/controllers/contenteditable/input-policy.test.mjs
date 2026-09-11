import "../../../../scripts/register-source-modules.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { useForm } from "react-hook-form";

const { getEditableIncomingLength, normalizeEditableText } = await import("./input-policy.ts");
const { ContenteditableController } = await import("./index.tsx");

// Event-shaped values are pure policy inputs, not replaced DOM/modules or browser proof.
for (const [event, length] of [
  [{ data: "x" }, 1],
  [{}, 0],
  [{ inputType: "insertText", data: "a\r\nb\rc" }, 5],
  [{ inputType: "deleteContentBackward", data: "x" }, 0],
  [{ inputType: "insertParagraph" }, 1],
  [{ inputType: "insertLineBreak" }, 1],
  [{ inputType: "insertCompositionText", data: "á" }, 1],
  [{ inputType: "insertFromPaste", data: null }, 0],
]) {
  test(`beforeinput tolera formato do evento ${JSON.stringify(event)}`, () => {
    assert.equal(getEditableIncomingLength(event), length);
  });
}

test("normalização conserva texto puro e quebras de linha", () => {
  assert.equal(normalizeEditableText("<b>texto</b>\r\nfim\r"), "<b>texto</b>\nfim\n");
});

function Editor(props) {
  const { control } = useForm({ defaultValues: { text: "Texto inicial" } });
  return createElement(ContenteditableController, {
    control,
    name: "text",
    label: "Texto",
    max: 200,
    ...props,
  });
}

for (const props of [{ disabled: true }, { readOnly: true }, { disabled: true, readOnly: true }]) {
  test(`SSR controller bloqueado usa semântica e CSS realmente não editáveis ${JSON.stringify(props)}`, () => {
    const html = renderToStaticMarkup(createElement(Editor, props));
    assert.match(html, /contentEditable="false"/i);
    assert.match(html, /\[-webkit-user-modify:read-only\]/);
    assert.doesNotMatch(html, /read-write-plaintext-only/);
    assert.match(html, /role="textbox"/);
    if (props.disabled) assert.match(html, /aria-disabled="true"/);
    if (props.readOnly) assert.match(html, /aria-readonly="true"/);
  });
}

test("SSR controller ativo mantém edição plaintext e estrutura acessível", () => {
  const html = renderToStaticMarkup(createElement(Editor));
  assert.match(html, /contentEditable="plaintext-only"/i);
  assert.match(html, /read-write-plaintext-only/);
  assert.match(html, /aria-label="Texto"/);
  assert.match(html, /aria-multiline="true"/);
  assert.match(html, /min-h-28 min-w-0 w-full whitespace-pre-wrap break-words/);
});

// Static wiring supplements, but does not replace, native browser input checks.
test("commit, beforeinput, Enter e paste conservam o gate de edição", () => {
  const source = readFileSync(new URL("./index.tsx", import.meta.url), "utf8");
  assert.match(
    source,
    /const commitElementValue[\s\S]*?if \(disabled \|\| readOnly\) \{\s*element.textContent = value;\s*return;/,
  );
  for (const handler of ["handleBeforeInput", "handleKeyDown", "handlePaste"]) {
    const start = source.indexOf(`const ${handler} =`);
    assert.ok(start >= 0);
    assert.match(source.slice(start, start + 180), /if \(disabled \|\| readOnly\)/);
  }
  assert.match(source, /getEditableIncomingLength\(nativeEvent\)/);
  assert.doesNotMatch(source, /nativeEvent.inputType.startsWith/);
});
