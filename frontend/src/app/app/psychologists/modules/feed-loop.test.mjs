import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPsychologistsFeedSlides,
  clampPsychologistFeedSlideIndex,
  getPsychologistFeedRealIndex,
  getPsychologistsFeedCycleCountForIndex,
  getPsychologistsFeedLoopCycleCount,
  getPsychologistsFeedSlideCount,
} from "./feed-loop.ts";

const psychologists = [
  { id: "psi-a", name: "Psicologa A" },
  { id: "psi-b", name: "Psicologa B" },
  { id: "psi-c", name: "Psicologa C" },
];

test("monta tres ciclos para a listagem circular de psicologos", () => {
  const slides = buildPsychologistsFeedSlides(psychologists);

  assert.equal(getPsychologistsFeedLoopCycleCount(psychologists.length, 1), 3);
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

test("mantem o inicio no primeiro slide real sem normalizar para ciclo central", () => {
  const slides = buildPsychologistsFeedSlides(psychologists);

  assert.equal(slides[0].index, 0);
  assert.equal(slides[0].psychologist.id, "psi-a");
  assert.equal(getPsychologistFeedRealIndex(0, psychologists.length), 0);
  assert.equal(getPsychologistFeedRealIndex(3, psychologists.length), 0);
  assert.equal(clampPsychologistFeedSlideIndex(0, psychologists.length), 0);
  assert.equal(clampPsychologistFeedSlideIndex(6, psychologists.length), 6);
});

test("resolve o proximo video do ultimo psicologo como o primeiro abaixo dele", () => {
  const lastFirstCycleSlideIndex = 2;
  const nextVirtualSlideIndex = lastFirstCycleSlideIndex + 1;

  assert.equal(getPsychologistFeedRealIndex(lastFirstCycleSlideIndex, psychologists.length), 2);
  assert.equal(getPsychologistFeedRealIndex(nextVirtualSlideIndex, psychologists.length), 0);
  assert.equal(
    buildPsychologistsFeedSlides(psychologists)[nextVirtualSlideIndex].psychologist.id,
    "psi-a",
  );
});

test("expande ciclos para manter uma nova volta abaixo do indice alvo", () => {
  assert.equal(
    getPsychologistsFeedCycleCountForIndex({
      currentCycleCount: 3,
      index: 8,
      psychologistsCount: psychologists.length,
    }),
    4,
  );
  assert.equal(
    getPsychologistsFeedCycleCountForIndex({
      currentCycleCount: 3,
      index: 9,
      psychologistsCount: psychologists.length,
    }),
    5,
  );
  assert.equal(getPsychologistsFeedSlideCount(psychologists.length, 4), 12);
  assert.equal(buildPsychologistsFeedSlides(psychologists, 4).at(-1)?.psychologist.id, "psi-c");
});

test("preserva listagens vazias ou com um unico psicologo sem duplicar DOM", () => {
  assert.equal(getPsychologistsFeedSlideCount(0), 0);
  assert.equal(getPsychologistsFeedSlideCount(1), 1);
  assert.equal(clampPsychologistFeedSlideIndex(10, 1), 0);
  assert.equal(buildPsychologistsFeedSlides([psychologists[0]]).length, 1);
});
