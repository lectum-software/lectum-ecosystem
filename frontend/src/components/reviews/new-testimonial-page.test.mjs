import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

const source = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("both creation routes use the new wrapper without importing legacy logic", () => {
  for (const path of [
    "../../app/app/reviews/new/page.tsx",
    "../../app/app/avaliacoes/nova/page.tsx",
  ]) {
    const page = source(path);
    assert.match(page, /NewTestimonialPage as ReviewsNewLogic/);
    assert.doesNotMatch(page, /from ["'][^"']*\/logic["']/);
  }
});

test("creation requires patient eligibility and preserves existing-testimonial management", () => {
  const page = source("./new-testimonial-page.tsx");
  assert.match(page, /user\?\.role === "paciente"/);
  assert.match(page, /useReviewEligibility\(psychologistId, hasToken && isPatient\)/);
  assert.match(page, /professional\?\.eligible \?/);
  assert.match(page, /TestimonialForm/);
  assert.match(page, /professional_plan_required/);
  assert.match(page, /already_reviewed" \? "\/app\/avaliacoes"/);
  assert.match(page, /eligibility\.refetch\(\)/);
  assert.doesNotMatch(page, /useCreatePatientReview|createPatientReview\(/);
});

test("video reply invitations remain outside media player markup", () => {
  for (const path of [
    "../../app/app/community/[slug]/post/[id]/components/reply-card.tsx",
    "../community/community-post-card-reply-preview.tsx",
  ]) {
    const content = source(path);
    const ast = ts.createSourceFile(path, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let invitations = 0;
    const visit = (node, insideMedia = false) => {
      const tag = ts.isJsxElement(node)
        ? node.openingElement.tagName.getText(ast)
        : ts.isJsxSelfClosingElement(node)
          ? node.tagName.getText(ast)
          : null;
      if (tag === "TestimonialInvitation") {
        invitations += 1;
        assert.equal(insideMedia, false);
      }
      ts.forEachChild(node, (child) => visit(child, insideMedia || tag === "CommunityMediaBlock"));
    };
    visit(ast);
    assert.equal(invitations, 1, "one invitation declaration per response surface");
    assert.match(content, /reply\.media_type === "video"/);
    assert.match(content, /psychologistId=\{reply\.author\.id\}/);
  }
});

test("active deletion and confirmation labels use depoimento", () => {
  const deletion = source("./delete-review-button.tsx");
  const success = source("../../app/app/reviews/success/logic.tsx");
  assert.match(deletion, /Excluir meu depoimento/);
  assert.match(success, /Depoimento publicado!/);
  assert.doesNotMatch(deletion, /Avalia|avalia/);
  assert.doesNotMatch(success, /AVALIAÇÃO|Avaliação|avaliado/);
});
