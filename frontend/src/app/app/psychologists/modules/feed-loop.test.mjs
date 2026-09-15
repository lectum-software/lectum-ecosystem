import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  normalizeProfessionalDisplayName,
  normalizeProfessionalNamePart,
} from "../../../../utils/professional-name.ts";
import {
  buildPsychologistsFeedSlides,
  clampPsychologistFeedSlideIndex,
  getPsychologistFeedRealIndex,
  getPsychologistsFeedCycleCountForIndex,
  getPsychologistsFeedLoopCycleCount,
  getPsychologistsFeedSlideCount,
} from "./feed-loop.ts";

const readSource = (...segments) =>
  readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), ...segments), "utf8");

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

test("perfil publico usa Bio curta sem cair na apresentacao", () => {
  const heroSource = readSource("../../psychologist/[id]/components/hero.tsx");
  const aboutSource = readSource("../../psychologist/[id]/components/about.tsx");

  assert.match(heroSource, /const shortBio = profile\.headline\?\.trim\(\) \?\? "";/);
  assert.doesNotMatch(heroSource, /profile\.headline\?\.trim\(\)\s*\|\|\s*profile\.bio/);
  assert.doesNotMatch(heroSource, /shortBio\s*=.*profile\.bio/);
  assert.match(aboutSource, /const bioText = profile\.bio\?\.trim\(\) \?\? "";/);
});

test("slide de psicologos exibe a Bio curta acima das chips comerciais", () => {
  const slideModelSource = readSource("../view/components/slide-model.ts");
  const slideDetailsSource = readSource("../view/components/slide-details.tsx");
  const slideBioIndex = slideDetailsSource.indexOf('data-psychologist-slide-bio="headline"');
  const benefitChipsIndex = slideDetailsSource.indexOf('aria-label="Benef');

  assert.match(slideModelSource, /const slideBio = psychologist\.headline\?\.trim\(\) \?\? "";/);
  assert.doesNotMatch(slideModelSource, /psychologist\.bio/);
  assert.ok(slideBioIndex >= 0, "a Bio curta precisa ser renderizada no slide");
  assert.ok(
    benefitChipsIndex > slideBioIndex,
    "as chips comerciais precisam ficar depois da Bio curta",
  );
});

test("slide de psicologos remove prefixo profissional do nome exibido", () => {
  const profileFormatSource = readSource("profile-format.ts");
  const slideModelSource = readSource("../view/components/slide-model.ts");

  assert.equal(
    normalizeProfessionalDisplayName("Psicóloga Rafaela Gomes Geraldo"),
    "Rafaela Gomes Geraldo",
  );
  assert.equal(normalizeProfessionalDisplayName("Dra. Ana Rúbia Cunha"), "Ana Rúbia Cunha");
  assert.equal(normalizeProfessionalNamePart("Psi - Camila"), "Camila");
  assert.match(profileFormatSource, /normalizeProfessionalDisplayName\(name\)/);
  assert.match(slideModelSource, /const slideNameParts = splitNameForBadge\(psychologist\.name\)/);
});
