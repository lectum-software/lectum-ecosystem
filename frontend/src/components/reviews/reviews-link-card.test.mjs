import "../../../scripts/register-source-modules.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve(specifier === "next/link" ? "next/link.js" : specifier, context);
  },
});
const { ReviewsLinkCard, PremiumReviewsState } = await import("./reviews-link-card.tsx");
const link = "https://lectum.test/app/avaliacoes/nova?psychologist_id=owner";

test("exclusao do autor exige confirmacao e invalida os dados relacionados", () => {
  const button = readFileSync(new URL("./delete-review-button.tsx", import.meta.url), "utf8");
  const callers = readFileSync(
    new URL("../../api/callers/reviews/index.tsx", import.meta.url),
    "utf8",
  );
  const req = readFileSync(new URL("../../api/req/reviews/index.ts", import.meta.url), "utf8");
  assert.ok(button.includes("<Modal"));
  assert.ok(button.includes("initialFocusRef={cancelRef}"));
  assert.ok(button.includes("returnFocusRef={triggerRef}"));
  assert.ok(button.includes("if (!deletion.isPending) deletion.mutate(reviewId)"));
  assert.ok(button.includes("deletion.isError"));
  assert.ok(req.includes('method: "DELETE"'));
  for (const key of [
    "patient.reviewsRoot",
    "patient.reviewEligibility",
    "directory.psychologistRoot",
    "directory.psychologistsRoot",
    "psychologistReviews.root",
  ]) {
    assert.ok(callers.slice(callers.indexOf("export const useDeletePatientReview")).includes(key));
  }
});

test("bloco preserva textos, link e copia para plano liberado", () => {
  const html = renderToStaticMarkup(createElement(ReviewsLinkCard, { link, locked: false }));
  assert.match(html, /Link da minha página de avaliações/);
  assert.match(html, /Compartilhe com pacientes e fortaleça sua autoridade com depoimentos reais/);
  assert.match(
    html,
    /Incentive os pacientes a te avaliarem para aparecer nos primeiros resultados de busca/,
  );
  assert.ok(html.includes(link));
  assert.doesNotMatch(html, /disabled=""|blur-\[5px\]/);
});

test("plano gratuito borra link e desabilita copia mantendo o convite existente", () => {
  const html = renderToStaticMarkup(createElement(ReviewsLinkCard, { link, locked: true }));
  assert.ok(html.includes("blur-[5px]"));
  assert.match(html, /disabled=""/);
  assert.match(html, /O link e a coleta de avaliações ficam totalmente liberados após o upgrade/);
  const upgrade = renderToStaticMarkup(createElement(PremiumReviewsState));
  assert.match(upgrade, /Desbloqueie avaliações de pacientes/);
  assert.match(upgrade, /href="\/app\/profissional\/assinatura"/);
});

test("perfil publico gratuito mostra avaliações vazias e nao busca depoimentos privados", () => {
  const profile = readFileSync(
    new URL("../../app/app/psychologist/[id]/psychologist-profile.tsx", import.meta.url),
    "utf8",
  );
  const tab = readFileSync(
    new URL("../../app/app/psychologist/[id]/components/reviews.tsx", import.meta.url),
    "utf8",
  );
  const owner = readFileSync(
    new URL("../../app/app/psychologist/[id]/components/own-reviews-link.tsx", import.meta.url),
    "utf8",
  );
  assert.ok(
    profile.includes("const shouldHidePublicReviews = profile?.reviews_publicly_visible === false"),
  );
  assert.ok(
    profile.includes('activeTab === "avaliacoes" && Boolean(profile) && !shouldHidePublicReviews'),
  );
  assert.ok(profile.includes("showPublicReviewsUnavailable={shouldHidePublicReviews}"));
  assert.ok(profile.includes("shouldHidePublicReviews\n                      ? 0"));
  const body = tab.slice(tab.indexOf("export const ReviewsTab"));
  assert.ok(body.includes("showOwnReviewsLink = false"));
  assert.ok(body.includes("showPublicReviewsUnavailable = false"));
  assert.ok(body.indexOf("<OwnReviewsLink") < body.indexOf("<ReviewSummaryCard"));
  assert.ok(body.includes("showPublicReviewsUnavailable ? ("));
  assert.ok(body.includes("rating_count: 0"));
  assert.ok(owner.includes('reviews.data?.access.mode !== "full"'));
  assert.ok(owner.includes("reviews.data?.access.can_receive_reviews !== true"));
  assert.ok(owner.includes("reviews.isError ||"));
});

test("minhas avaliações em preview mantém resumo e depoimentos com aviso de upgrade", () => {
  const ownerReviews = readFileSync(
    new URL("../../app/app/professional/reviews/logic.tsx", import.meta.url),
    "utf8",
  );
  assert.ok(ownerReviews.includes("const displayItems = items;"));
  assert.ok(
    ownerReviews.includes(
      "const hasReceivedReviews = summaryTotal(data?.summary) > 0 || displayItems.length > 0;",
    ),
  );
  assert.ok(ownerReviews.includes("<RatingSummary summary={data?.summary} />"));
  assert.ok(ownerReviews.includes('title="Avaliações ocultas no perfil público"'));
  assert.ok(ownerReviews.includes("não estão visíveis para pacientes"));
  assert.ok(ownerReviews.includes("canRespond={canReceiveReviews}"));
  assert.ok(ownerReviews.includes("if (!canRespond) return null;"));
});
