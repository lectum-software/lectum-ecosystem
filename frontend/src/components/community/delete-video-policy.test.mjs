import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("post checks fresh video status before confirmation and preserves transactional conflict", () => {
  const source = readFileSync(new URL("post-owner-action-menu.tsx", import.meta.url), "utf8");
  const request = source
    .split("const handleDeleteRequest = async () => {")[1]
    .split("const handleDeleteConfirm")[0];
  assert.match(request, /if \(!isPsychologistPost\)/);
  assert.match(request, /await deletePreflight.refetch\(\)/);
  assert.match(request, /if \(result.error \|\| !result.data\)/);
  assert.match(request, /has_psychologist_video_reply/);
  assert.ok(
    request.indexOf("setBlockedModalOpen(true)") < request.indexOf("setDeleteModalOpen(true)"),
  );
  assert.doesNotMatch(request, /deleteMutation|has_psychologist_reply/);
  assert.match(source, /getApiErrorStatus\(error\) === 409/);
});

test("reply checks entire fresh subtree before confirmation and preserves conflict modal", () => {
  const source = readFileSync(new URL("reply-owner-action-menu.tsx", import.meta.url), "utf8");
  const request = source
    .split("const handleDeleteRequest = async () => {")[1]
    .split("const handleDeleteConfirm")[0];
  assert.match(request, /if \(!isPsychologistReply\)/);
  assert.match(request, /await deletePreflight.refetch\(\)/);
  assert.match(request, /hasProfessionalVideoDescendant/);
  assert.ok(
    request.indexOf("setBlockedModalOpen(true)") < request.indexOf("setDeleteModalOpen(true)"),
  );
  assert.doesNotMatch(request, /deleteMutation/);
  assert.match(source, /getApiErrorStatus\(error\) === 409/);
  const detail = readFileSync(
    new URL(
      "../../app/app/community/[slug]/post/[id]/components/reply-overflow-menu.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(detail, /<ReplyOwnerActionMenu/);
  assert.doesNotMatch(detail, /CommunityDeleteConfirmationModal|onDelete\(\)/);
});
