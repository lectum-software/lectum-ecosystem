import "../../../scripts/register-source-modules.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const { buildAuthRouteWithRedirect, resolveAuthRedirect, resolveAuthReturnTo } = await import(
  "../../utils/auth-redirect.ts"
);

const source = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

for (const path of ["./testimonial-invitation-action.tsx", "./new-testimonial-page.tsx"]) {
  test(`${path} preserves the encoded testimonial destination through login and signup`, () => {
    const ast = ts.createSourceFile(
      path,
      source(path),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const links = [];
    const visit = (node) => {
      if (
        ts.isJsxAttribute(node) &&
        node.name.getText(ast) === "href" &&
        node.initializer &&
        ts.isJsxExpression(node.initializer) &&
        node.initializer.expression?.getText(ast).includes("/auth/login?")
      ) {
        links.push(node.initializer.expression.getText(ast));
      }
      ts.forEachChild(node, visit);
    };
    visit(ast);
    assert.equal(links.length, 1);
    for (const psychologistId of [
      "0fac59ed-4327-4e29-829b-b6d90da12dad",
      "profile with spaces & extra=value",
    ]) {
      const href = runInNewContext(links[0], { psychologistId, encodeURIComponent });
      const login = new URL(href, "https://lectum.local");
      assert.equal(login.pathname, "/auth/login");
      assert.deepEqual([...login.searchParams.keys()], ["redirectTo"]);
      const target = resolveAuthReturnTo(
        login.searchParams.get("redirectTo"),
        login.searchParams.get("callbackUrl"),
      );
      assert.equal(
        target,
        `/app/avaliacoes/nova?psychologist_id=${encodeURIComponent(psychologistId)}`,
      );
      const destination = new URL(target, login.origin);
      assert.equal(destination.searchParams.get("psychologist_id"), psychologistId);
      assert.deepEqual([...destination.searchParams.keys()], ["psychologist_id"]);
      assert.equal(
        resolveAuthRedirect({ role: "paciente", confirmed: true }, target, "/psicologos"),
        target,
      );
      const signup = new URL(
        buildAuthRouteWithRedirect("/auth/profile-selection", target),
        login.origin,
      );
      assert.equal(signup.searchParams.get("redirectTo"), target);
    }
  });
}

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

test("desktop invitations use the below-video slot, separate from mobile actions", () => {
  for (const path of ["../../app/app/community/[slug]/post/[id]/components/reply-card.tsx"]) {
    const content = source(path);
    const ast = ts.createSourceFile(path, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let invitations = 0;
    const visit = (node, insideMedia = false, insideAfterMedia = false) => {
      const tag = ts.isJsxElement(node)
        ? node.openingElement.tagName.getText(ast)
        : ts.isJsxSelfClosingElement(node)
          ? node.tagName.getText(ast)
          : null;
      if (tag === "TestimonialInvitation" || tag === "PostTestimonialInvitation") {
        invitations += 1;
        assert.ok(!insideMedia || insideAfterMedia, "never overlay the player");
      }
      ts.forEachChild(node, (child) =>
        visit(
          child,
          insideMedia || tag === "CommunityMediaBlock",
          insideAfterMedia || (ts.isJsxAttribute(node) && node.name.getText(ast) === "afterMedia"),
        ),
      );
    };
    visit(ast);
    assert.equal(invitations, 2, "separate responsive placements");
  }
  const invitation = source("../community/post-testimonial-invitation.tsx");
  assert.match(invitation, /hidden md:inline-flex md:justify-self-end/);
  assert.match(invitation, /: "md:hidden"/);
  const frame = source("../community/community-media-frame.tsx");
  assert.match(frame, /<\/div>\s*\{hasFooter \? footer : null\}\s*\{afterMedia\}/);
  assert.doesNotMatch(
    source("../community/community-post-card-reply-preview.tsx"),
    /TestimonialInvitation/,
  );
});

test("pending list truncates names beside the compact action and opens the shared modal", () => {
  const list = source("../../app/app/depoimentos/pendentes/logic.tsx");
  assert.match(list, /<span className="truncate">\{item.name\}/);
  assert.match(list, /h-8 min-h-8 shrink-0 rounded-lg/);
  assert.match(list, /setSelectedPsychologistId\(item.psychologist_id\)/);
  assert.match(list, /<TestimonialComposer/);
  assert.doesNotMatch(list, /\/app\/avaliacoes\/nova/);
  assert.doesNotMatch(list, /variant="outline"|ml-15|Deixar avaliação/);
  const notifications = source("../../app/app/notifications/logic.tsx");
  assert.match(notifications, /depoimentos_pendentes: \{[\s\S]*?icon: ReviewsIcon/);
  assert.match(notifications, /Recebeu acolhimento\? Retribua com uma avaliação\./);
});

test("active deletion and confirmation labels use depoimento", () => {
  const deletion = source("./delete-review-button.tsx");
  const success = source("../../app/app/reviews/success/logic.tsx");
  assert.match(deletion, /Excluir minha avaliação/);
  assert.match(success, /Avaliação publicada!/);
  assert.doesNotMatch(deletion, /Depoimento|depoimento/);
  assert.doesNotMatch(success, /DEPOIMENTO|Depoimento|depoimento/);
});
