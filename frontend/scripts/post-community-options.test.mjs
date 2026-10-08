import assert from "node:assert/strict";
import test from "node:test";
import "./register-source-modules.mjs";

const { resolveCommunityOptions } = await import(
  "../src/app/app/community/[slug]/post/new/modules/create-post-support.ts"
);

const general = { name: "Saúde Mental em Geral", slug: "saude-mental-em-geral" };
const specific = [
  { name: "TDAH", slug: "tdah" },
  { name: "Ansiedade", slug: "ansiedade" },
  { name: "Depressão", slug: "depressao" },
];

test("comunidade geral fica por ultimo, sem alterar a lista original", () => {
  const communities = Object.freeze([general, ...specific]);
  const options = resolveCommunityOptions(communities);
  assert.deepEqual(
    options.map((option) => option.value),
    ["ansiedade", "depressao", "tdah", "saude-mental-em-geral"],
  );
  assert.equal(communities[0], general);
  assert.equal(
    options.at(-1).description,
    "Não encontrou uma comunidade específica? Publique aqui.",
  );
  assert.equal(options.at(-1).separatorBefore, true);
  assert.equal(options.at(-1).disabled, undefined);
  assert.ok(options.slice(0, -1).every((option) => !option.description && !option.separatorBefore));
});

test("identifica a comunidade pelo slug mesmo com nome alterado", () => {
  const options = resolveCommunityOptions([{ ...general, name: "Geral" }, ...specific]);
  assert.equal(options.at(-1).value, general.slug);
  assert.ok(options.at(-1).description);
});

test("nao inventa opcao geral ausente nem altera nomes ou valores", () => {
  assert.deepEqual(resolveCommunityOptions([]), []);
  assert.deepEqual(
    resolveCommunityOptions(specific),
    [specific[1], specific[2], specific[0]].map(({ name, slug }) => ({ label: name, value: slug })),
  );
  assert.equal(resolveCommunityOptions([general])[0].value, general.slug);
  assert.equal(
    resolveCommunityOptions([{ name: general.name, slug: "outra" }])[0].description,
    undefined,
  );
});
