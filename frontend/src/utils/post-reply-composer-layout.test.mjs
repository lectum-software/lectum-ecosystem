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

test("erro de upload de midia em resposta nao acusa conexao do usuario", () => {
  const supportSource = readSource(
    "../app/app/community/[slug]/post/[id]/modules/reply-support.ts",
  );

  assert.match(
    supportSource,
    /REPLY_MEDIA_UPLOAD_ERROR_MESSAGE\s*=\n\s*"Não foi possível enviar a mídia agora\. Tente novamente em instantes\.";/u,
  );
  assert.doesNotMatch(
    supportSource,
    /REPLY_MEDIA_UPLOAD_ERROR_MESSAGE\s*=\n\s*"[^"]*conex/u,
    "o erro generico de upload de midia nao deve atribuir a falha a internet do usuario",
  );
});

test("topo do detalhe do post mantem botao de seguir na mesma linha", () => {
  const postContentSource = readSource(
    "../app/app/community/[slug]/post/[id]/components/post-content.tsx",
  );

  assert.match(
    postContentSource,
    /<div className="flex min-w-0 items-center gap-1 text-\[11px\] font-semibold text-muted">/,
  );
  assert.match(
    postContentSource,
    /<div className="flex min-w-0 flex-1 items-center gap-1\.5">\s*<Link\s*className="block min-w-0 flex-1 cursor-pointer truncate/s,
  );
  assert.match(postContentSource, /<CommunityFollowToggle\s*className="shrink-0"/);
  assert.doesNotMatch(postContentSource, /flex-wrap items-center gap-x-1 gap-y-2/);
});
