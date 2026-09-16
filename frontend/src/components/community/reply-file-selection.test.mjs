import "../../../scripts/register-source-modules.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  isVideoSourceReadFailure,
  VideoUploadFailure,
} from "../../utils/video-upload-diagnostics.ts";

const { VideoFileReadRecovery } = await import("./video-file-read-recovery.tsx");
const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const composer = read("../../app/app/community/[slug]/post/[id]/components/reply-composer.tsx");
const editor = read("./reply-edit-modal.tsx");

test("somente falha tipada de leitura oferece troca de seletor, não HTTP/rede/processamento", () => {
  assert.equal(
    isVideoSourceReadFailure(
      new VideoUploadFailure(0, "transport", {
        request: "PATCH",
        source: "failed",
        sourceFailure: "unreadable",
      }),
    ),
    true,
  );
  for (const error of [
    null,
    new Error("unreadable"),
    new VideoUploadFailure(403),
    new VideoUploadFailure(0, "processing"),
    new VideoUploadFailure(0, "transport", {
      request: "HEAD",
      source: "not_read",
      sourceFailure: "none",
    }),
  ]) {
    assert.equal(isVideoSourceReadFailure(error), false);
  }
});

test("controle real é botão não submit, PT-BR, altura mobile e desabilitado sem permissão", () => {
  const html = renderToStaticMarkup(
    createElement(VideoFileReadRecovery, { disabled: true, fileInputRef: { current: null } }),
  );
  assert.match(html, /type="button"/);
  assert.match(html, /disabled=""/);
  assert.match(html, /Escolher vídeo pelos arquivos/);
  assert.match(html, /Seu texto será mantido/);
  assert.match(html, /min-h-11/);
  assert.doesNotMatch(html, /<input/);
});

test("composer tem um seletor persistente, fora dos ramos de trigger e preview", () => {
  assert.equal((composer.match(/type="file"/g) ?? []).length, 1);
  assert.equal((composer.match(/renderInput=\{false\}/g) ?? []).length, 2);
  const inputAt = composer.indexOf('type="file"');
  assert.ok(inputAt > composer.indexOf("style={composerStyle}"));
  assert.ok(inputAt < composer.indexOf("{shouldShowGuidance ?"));
  assert.doesNotMatch(composer, /event\.(?:currentTarget|target)\.value\s*=\s*""/);
  assert.doesNotMatch(editor, /event\.(?:currentTarget|target)\.value\s*=\s*""/);
  for (const source of [composer, editor]) {
    assert.match(source, /if \(fileInputRef\.current\) fileInputRef\.current\.value = ""/);
    assert.match(source, /if \(needsReadableFile\) return/);
    assert.match(source, /isVideoSourceReadFailure\(error\)/);
  }
});

test("seletor alternativo é acionado explicitamente e não enfraquece validação de mídia", () => {
  const recovery = read("./video-file-read-recovery.tsx");
  assert.match(recovery, /input.accept = "\*\/\*"/);
  assert.match(recovery, /input\.value = "";\s*input\.click\(\)/);
  assert.doesNotMatch(recovery, /fetch\(|localStorage|createObjectURL|new File|arrayBuffer/);
  for (const source of [composer, editor]) {
    assert.match(source, /const type = mediaTypeFromFile\(file\)/);
    assert.match(source, /getCommunityMediaSelectionSizeError\(file, type\)/);
  }
});

test("erro de seleção é atualizado sem cache e recuperação do editor pode rolar no mobile", () => {
  assert.match(composer, /const visibleError = firstError \|\| apiError \|\| null/);
  assert.doesNotMatch(composer, /const visibleError = useMemo/);
  assert.match(editor, /min-h-0 flex-1 overflow-x-hidden overflow-y-auto/);
});
