import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readSource = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("composer principal de comentarios permanece fixo no rodape mobile", () => {
  const composerSource = readSource(
    "../app/app/community/[slug]/post/[id]/components/reply-composer.tsx",
  );

  assert.match(composerSource, /"fixed inset-x-0 bottom-0 z-\[80\]/);
  assert.match(
    composerSource,
    /if \(!isInline && shouldUseKeyboardSafeArea\) {\s*style\.bottom = `\$\{keyboardOffset\}px`;\s*}/s,
  );
  assert.doesNotMatch(
    composerSource,
    /env\(keyboard-inset-height/u,
    "o offset nativo do teclado nao pode mover a barra quando o teclado ja fechou",
  );
});

test("detalhe e arvore reservam espaco inferior para o composer fixo", () => {
  const detailSource = readSource("../app/app/community/[slug]/post/[id]/views/post-detail.tsx");
  const threadSource = readSource("../app/app/community/[slug]/post/[id]/views/reply-thread.tsx");

  assert.match(detailSource, /pb-36 sm:px-0 sm:pb-6/);
  assert.match(threadSource, /pb-36 sm:px-0 sm:pb-6/);
});
