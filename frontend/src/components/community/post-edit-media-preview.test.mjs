import "../../../scripts/register-source-modules.mjs";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import { Children, createElement, isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Native Node ESM needs Next's .js entry and CJS default interop, unlike the bundler.
// This bridge exports the installed next/image itself; it does not replace Image.
const nextImageUrl = import.meta.resolve("next/image.js");
const nextImageBridge = `data:text/javascript,${encodeURIComponent(
  `import Image from ${JSON.stringify(nextImageUrl)}; export default Image.default ?? Image;`,
)}`;
registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve(specifier === "next/image" ? nextImageBridge : specifier, context);
  },
});

const { PostEditMediaPreview } = await import("./post-edit-media-preview.tsx");

// Real component, React markup and handlers; no modules or APIs are replaced.
// SSR verifies native button semantics, not actual browser Tab/Enter/Space or uploads.
const media = (source, overrides = {}) => ({
  caption: "Mídia local",
  id: `${source}-local`,
  source,
  src: "/svg/public_24dp_64748B_FILL0_wght400_GRAD0_opsz24.svg",
  type: "image",
  ...overrides,
});

const previewProps = (overrides = {}) => ({
  canManageMedia: true,
  disabled: false,
  items: [media("selected", { selectedIndex: 3 }), media("stored")],
  onFocusEditor: () => {},
  onRemoveSelected: () => {},
  onRemoveStored: () => {},
  onUpdateSelectedOrientation: () => {},
  onUpdateStoredOrientation: () => {},
  ...overrides,
});

const removalButtons = (element) => {
  if (!isValidElement(element)) return [];
  if (element.type === "button") return [element];
  return Children.toArray(element.props.children).flatMap(removalButtons);
};

for (const source of ["selected", "stored"]) {
  test(`remoção ${source} usa button nativo alcançável por Tab, sem interceptar Enter/Space`, () => {
    const props = previewProps({ items: [media(source)] });
    const [button] = removalButtons(PostEditMediaPreview(props));
    assert.equal(button.type, "button");
    assert.equal(button.props.type, "button");
    assert.ok(button.props.tabIndex === undefined || button.props.tabIndex === 0);
    assert.equal(button.props.disabled, false);
    assert.equal(button.props.onKeyDown, undefined);
    assert.equal(button.props.onKeyUp, undefined);
    assert.equal(button.props["aria-label"], "Remover mídia anexada 1");
    const html = renderToStaticMarkup(createElement(PostEditMediaPreview, props));
    assert.match(html, /<button[^>]*aria-label="Remover mídia anexada 1"/);
    assert.match(html, /type="button"/);
    assert.doesNotMatch(html, /tabindex="-1"|disabled=""/);
    assert.match(html, /focus:ring-4 focus:ring-primary\/15/);
  });
}

test("click remove mídia nova pelo selectedIndex e persistida pelo id, antes de focar editor", () => {
  const calls = [];
  const props = previewProps({
    onFocusEditor: () => calls.push(["editor"]),
    onRemoveSelected: (index) => calls.push(["selected", index]),
    onRemoveStored: (id) => calls.push(["stored", id]),
  });
  const [selected, stored] = removalButtons(PostEditMediaPreview(props));
  selected.props.onClick();
  stored.props.onClick();
  assert.deepEqual(calls, [["selected", 3], ["editor"], ["stored", "stored-local"], ["editor"]]);
});

test("mídia nova sem selectedIndex mantém fallback zero, sem chamar remoção persistida", () => {
  const calls = [];
  const [button] = removalButtons(
    PostEditMediaPreview(
      previewProps({
        items: [media("selected")],
        onFocusEditor: () => calls.push(["editor"]),
        onRemoveSelected: (index) => calls.push(["selected", index]),
        onRemoveStored: (id) => calls.push(["stored", id]),
      }),
    ),
  );
  button.props.onClick();
  assert.deepEqual(calls, [["selected", 0], ["editor"]]);
});

test("mousedown preserva prevenção de blur sem remover; click subsequente remove uma vez", () => {
  const calls = [];
  const buttons = removalButtons(
    PostEditMediaPreview(
      previewProps({
        onFocusEditor: () => calls.push(["editor"]),
        onRemoveSelected: (index) => calls.push(["selected", index]),
        onRemoveStored: (id) => calls.push(["stored", id]),
      }),
    ),
  );
  for (const button of buttons) {
    const before = calls.length;
    const event = new Event("mousedown", { cancelable: true });
    button.props.onMouseDown(event);
    assert.equal(event.defaultPrevented, true);
    assert.equal(calls.length, before);
    button.props.onClick();
    assert.equal(calls.length, before + 2);
  }
  assert.deepEqual(calls, [["selected", 3], ["editor"], ["stored", "stored-local"], ["editor"]]);
});

test("disabled continua atributo nativo em todas as remoções", () => {
  const props = previewProps({ disabled: true });
  const buttons = removalButtons(PostEditMediaPreview(props));
  assert.equal(buttons.length, 2);
  for (const button of buttons) assert.equal(button.props.disabled, true);
  const html = renderToStaticMarkup(createElement(PostEditMediaPreview, props));
  assert.equal((html.match(/<button[^>]*disabled=""/g) ?? []).length, 2);
  // Do not invoke disabled handlers directly: native suppression needs the parent's browser check.
});

test("sem permissão de gerenciar não renderiza ação; sem itens mantém preview vazio", () => {
  const props = previewProps({ canManageMedia: false });
  assert.deepEqual(removalButtons(PostEditMediaPreview(props)), []);
  assert.doesNotMatch(renderToStaticMarkup(createElement(PostEditMediaPreview, props)), /<button/);
  const empty = previewProps({ items: [] });
  assert.equal(PostEditMediaPreview(empty), null);
  assert.equal(renderToStaticMarkup(createElement(PostEditMediaPreview, empty)), "");
});
