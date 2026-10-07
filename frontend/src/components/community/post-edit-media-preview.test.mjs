import "../../../scripts/register-source-modules.mjs";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import { Children, createElement, isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { useForm } from "react-hook-form";

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
const { PostEditModalView } = await import("./post-edit-modal-view.tsx");
const { PostEditMediaButton } = await import("./post-edit-modal-controls.tsx");
const { buildFields, postEditSchema, resolveEditableMediaPreviewUrls } = await import(
  "./post-edit-modal-support.ts"
);
const { ContenteditableController } = await import("../controllers/contenteditable/index.tsx");

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

test("video persistido usa miniatura salva sem carregar o arquivo de video no SSR", () => {
  const item = media("stored", { type: "video", src: "/video.mp4", thumbnailUrl: "/poster.jpg" });
  const urls = resolveEditableMediaPreviewUrls(item);
  assert.ok(urls.imagePreviewSrc.endsWith("/poster.jpg"));
  const html = renderToStaticMarkup(
    createElement(PostEditMediaPreview, previewProps({ items: [item] })),
  );
  assert.match(html, /alt="Miniatura do vídeo anexado"/);
  assert.match(html, /src="[^"]*\/poster.jpg"/);
  assert.doesNotMatch(html, /<video/);
});

test("video novo sem poster mantém preview mudo sem autoplay e sem controles de reprodução", () => {
  const html = renderToStaticMarkup(
    createElement(
      PostEditMediaPreview,
      previewProps({ items: [media("selected", { type: "video", src: "blob:local-video" })] }),
    ),
  );
  assert.match(html, /<video/);
  assert.match(html, /muted=""/);
  assert.match(html, /playsInline=""/i);
  assert.match(html, /src="blob:local-video"/);
  assert.doesNotMatch(html, /autoPlay|controls=/i);
});

const editFields = buildFields({
  communityName: "Comunidade",
  communitySlug: "comunidade",
  isPsychologist: true,
});
function EditFields() {
  const { control } = useForm({
    defaultValues: { title: "Titulo existente", content: "Conteudo existente para editar." },
  });
  return editFields
    .filter((field) => ["title", "content"].includes(field.name))
    .map((field) =>
      createElement(ContenteditableController, { ...field, control, key: field.name }),
    );
}

test("edicao usa controllers da criacao com rotulos acessiveis e visualmente ocultos", () => {
  for (const field of editFields.filter((field) => ["title", "content"].includes(field.name))) {
    assert.equal(field.field, "contenteditable");
    assert.match(field.className, /\[&>span:first-child\]:sr-only/);
  }
  const html = renderToStaticMarkup(createElement(EditFields));
  assert.equal((html.match(/role="textbox"/g) ?? []).length, 2);
  assert.match(html, /aria-label="Título do post"/);
  assert.match(html, /aria-label="Conteúdo do post"/);
  assert.doesNotMatch(html, /<textarea|<label/);
  assert.equal(editFields.find((field) => field.name === "community_slug").disabled, true);
  assert.equal(
    postEditSchema.safeParse({ community_slug: "comunidade", title: "ok", content: "curto" })
      .success,
    false,
  );
});

const viewProps = (overrides = {}) => ({
  communityFields: null,
  contentFields: null,
  footerControls: null,
  hasMedia: false,
  isGuidanceOpen: false,
  isSubmitting: false,
  mediaPreview: null,
  onClose() {},
  onFocusCapture() {},
  onPointerDown() {},
  onSubmit() {},
  onToggleGuidance() {},
  titleFields: null,
  uploadStatus: null,
  ...overrides,
});

test("edicao usa dialog nativo, scroll interno e footer no fluxo com Salvar", () => {
  const html = renderToStaticMarkup(createElement(PostEditModalView, viewProps()));
  assert.match(html, /^<dialog/);
  assert.match(html, /aria-labelledby="edit-post-title-heading"/);
  assert.match(html, /Editar Post/);
  assert.match(html, /data-edit-post-editor-scroll="content"/);
  assert.match(html, /<footer class="relative shrink-0/);
  assert.match(html, /type="submit">Salvar/);
  assert.doesNotMatch(html, /z-\[70\]|Adicionar comentário/);
  const overlay = renderToStaticMarkup(
    createElement(
      PostEditModalView,
      viewProps({ hasMedia: true, overlay: createElement("aside", null, "Aviso") }),
    ),
  );
  assert.match(overlay, /<section[^>]*inert=""/);
  assert.match(overlay, /<aside>Aviso<\/aside><\/dialog>/);
});

test("botao de midia da edicao conserva camera circular, permissoes e input multiplo", () => {
  const props = {
    canManageMedia: true,
    fileInputRef: { current: null },
    isSubmitting: false,
    isUploading: false,
    onFocusEditor() {},
    onMediaChange() {},
  };
  const html = renderToStaticMarkup(createElement(PostEditMediaButton, props));
  assert.match(html, /h-11 w-11/);
  assert.match(html, /border-primary bg-primary text-primary-foreground/);
  assert.match(html, /lucide-camera/);
  assert.match(html, /multiple=""/);
  const disabled = renderToStaticMarkup(
    createElement(PostEditMediaButton, { ...props, isSubmitting: true }),
  );
  assert.match(disabled, /<button[^>]*disabled=""/);
});
