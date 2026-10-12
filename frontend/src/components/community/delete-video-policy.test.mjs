import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

for (const name of ["post-owner-action-menu.tsx", "reply-owner-action-menu.tsx"]) {
  test(`${name}: servidor decide bloqueio de vídeo após confirmação`, () => {
    const source = readFileSync(new URL(name, import.meta.url), "utf8");
    const request = source
      .split("const handleDeleteRequest = () => {")[1]
      .split("const handleDeleteConfirm")[0];
    assert.match(request, /setDeleteModalOpen\(true\)/);
    assert.doesNotMatch(
      request,
      /has_psychologist_reply|has_verified_professional_reply|setBlockedModalOpen/,
    );
    assert.match(source, /getApiErrorStatus\(error\) === 409/);
    assert.match(source, /setBlockedModalOpen\(true\)/);
  });
}
