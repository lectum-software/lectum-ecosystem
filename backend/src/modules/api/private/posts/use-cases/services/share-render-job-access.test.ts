import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createShareRenderJobHandle, resolveShareRenderJobId } from "./share-render-job-access";

const key = "isolated-test-key-not-used-by-any-environment";
const jobId = `a${"1".repeat(23)}`;
const scope = { ownerId: "owner-one", postId: "post-one", replyId: "reply-one" };

describe("share render job object authorization", () => {
  it("vincula o job ao usuário e ao conteúdo sem expor os IDs no handle", () => {
    const handle = createShareRenderJobHandle(jobId, scope, key);
    assert.ok(handle);
    assert.ok(handle.length <= 120);
    assert.equal(resolveShareRenderJobId(handle, scope, key), jobId);
    assert.equal(handle.includes(scope.ownerId), false);
    assert.equal(handle.includes(scope.postId), false);
    assert.equal(handle.includes(scope.replyId), false);
  });

  it("recusa reutilização por outro usuário, post ou reply", () => {
    const handle = createShareRenderJobHandle(jobId, scope, key)!;
    for (const other of [
      { ...scope, ownerId: "owner-two" },
      { ...scope, postId: "post-two" },
      { ...scope, replyId: "reply-two" },
      { ...scope, replyId: null },
    ])
      assert.equal(resolveShareRenderJobId(handle, other, key), null);
  });

  it("recusa ID cru, troca do job, assinatura adulterada e chave diferente", () => {
    const handle = createShareRenderJobHandle(jobId, scope, key)!;
    for (const invalid of [
      jobId,
      `${handle}.extra`,
      `${handle}.`,
      handle.replace(jobId, `b${"2".repeat(23)}`),
      `${jobId}.${"A".repeat(43)}`,
      "x".repeat(121),
      "",
    ]) {
      assert.equal(resolveShareRenderJobId(invalid, scope, key), null);
    }
    assert.equal(resolveShareRenderJobId(handle, scope, `${key}-rotated`), null);
    assert.equal(resolveShareRenderJobId(handle, scope, ""), null);
  });

  it("preserva posts sem reply e falha fechada para contexto incompleto", () => {
    const postScope = { ownerId: scope.ownerId, postId: scope.postId };
    const handle = createShareRenderJobHandle(jobId, postScope, key)!;
    assert.equal(resolveShareRenderJobId(handle, { ...postScope, replyId: null }, key), jobId);
    assert.equal(createShareRenderJobHandle(jobId, { ...scope, ownerId: "" }, key), null);
    assert.equal(createShareRenderJobHandle(jobId, { ...scope, postId: "" }, key), null);
    assert.equal(createShareRenderJobHandle("../another-job", scope, key), null);
  });
});
