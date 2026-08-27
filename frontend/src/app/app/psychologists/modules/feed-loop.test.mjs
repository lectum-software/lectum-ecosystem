import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPsychologistsFeedSlides,
  clampPsychologistFeedSlideIndex,
  getAnchoredPsychologistFeedIndex,
  getPsychologistFeedRealIndex,
  getPsychologistsFeedSlideCount,
  normalizePsychologistFeedLoopIndex,
} from "./feed-loop.ts";

const psychologists = [
  { id: "psi-a", name: "Psicologa A" },
  { id: "psi-b", name: "Psicologa B" },
  { id: "psi-c", name: "Psicologa C" },
];

test("monta tres ciclos para a listagem circular de psicologos", () => {
  const slides = buildPsychologistsFeedSlides(psychologists);

  assert.equal(getPsychologistsFeedSlideCount(psychologists.length), 9);
  assert.deepEqual(
    slides.map((slide) => slide.psychologist.id),
    ["psi-a", "psi-b", "psi-c", "psi-a", "psi-b", "psi-c", "psi-a", "psi-b", "psi-c"],
  );
  assert.deepEqual(
    slides.map((slide) => slide.psychologistIndex),
    [0, 1, 2, 0, 1, 2, 0, 1, 2],
  );
});

test("ancora indices reais no ciclo central para evitar retorno visual ao topo", () => {
  assert.equal(getAnchoredPsychologistFeedIndex(0, psychologists.length), 3);
  assert.equal(getAnchoredPsychologistFeedIndex(2, psychologists.length), 5);
  assert.equal(getAnchoredPsychologistFeedIndex(6, psychologists.length), 3);

  assert.equal(normalizePsychologistFeedLoopIndex(0, psychologists.length), 3);
  assert.equal(normalizePsychologistFeedLoopIndex(5, psychologists.length), 5);
  assert.equal(normalizePsychologistFeedLoopIndex(6, psychologists.length), 3);
  assert.equal(normalizePsychologistFeedLoopIndex(9, psychologists.length), 3);
  assert.equal(normalizePsychologistFeedLoopIndex(-1, psychologists.length), 5);
});

test("resolve o proximo video do ultimo psicologo como o primeiro psicologo", () => {
  const lastMiddleSlideIndex = 5;
  const nextVirtualSlideIndex = lastMiddleSlideIndex + 1;

  assert.equal(getPsychologistFeedRealIndex(lastMiddleSlideIndex, psychologists.length), 2);
  assert.equal(getPsychologistFeedRealIndex(nextVirtualSlideIndex, psychologists.length), 0);
  assert.equal(normalizePsychologistFeedLoopIndex(nextVirtualSlideIndex, psychologists.length), 3);
});

test("preserva listagens vazias ou com um unico psicologo sem duplicar DOM", () => {
  assert.equal(getPsychologistsFeedSlideCount(0), 0);
  assert.equal(getPsychologistsFeedSlideCount(1), 1);
  assert.equal(clampPsychologistFeedSlideIndex(10, 1), 0);
  assert.equal(normalizePsychologistFeedLoopIndex(10, 1), 0);
  assert.equal(buildPsychologistsFeedSlides([psychologists[0]]).length, 1);
});
