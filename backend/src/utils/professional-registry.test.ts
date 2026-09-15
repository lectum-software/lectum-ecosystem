import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCrpFromRegistryResult,
  normalizeCrpRegistrationNumber,
  normalizeStoredCrp,
  parseStoredCrp,
  resolveCrpFromRegistryChecks,
  resolveProfileCrp,
} from "./professional-registry";

test("normaliza numero publico do CRP sem zero artificial a esquerda", () => {
  assert.equal(normalizeCrpRegistrationNumber("03324"), "3324");
  assert.equal(normalizeCrpRegistrationNumber("029112"), "29112");
  assert.equal(normalizeCrpRegistrationNumber("29112"), "29112");
});

const confirmedChecks = [
  {
    raw: {
      confirmed_result_key: "historical-registration",
      normalized_results: [
        {
          key: "historical-registration",
          nome_regional: "21ª Região - PI",
          registro: "03324",
        },
      ],
    },
  },
];

test("CRP atual corrigido prevalece sobre o resultado histórico confirmado", () => {
  const currentCrp = resolveProfileCrp("7ª Região - RS/029112", confirmedChecks);

  assert.equal(currentCrp, "7ª Região - RS/29112");
  assert.deepEqual(parseStoredCrp(currentCrp), {
    crp_region: "7ª Região - RS",
    crp_number: "29112",
  });
});

test("preserva CRP atual completo ou sem correspondência no histórico", () => {
  assert.equal(
    resolveProfileCrp("  7ª Região - RS / 029112  ", confirmedChecks),
    "7ª Região - RS/29112",
  );
  assert.equal(resolveProfileCrp(" 029112 ", confirmedChecks), "29112");
  assert.equal(resolveProfileCrp("7ª Região - RS/", confirmedChecks), "7ª Região - RS");
});

for (const crp of ["3324", "03324", " 0003324 "]) {
  test(`CRP legado numérico ${JSON.stringify(crp)} recebe regional apenas do mesmo registro confirmado`, () => {
    const displayCrp = resolveProfileCrp(crp, confirmedChecks);

    assert.equal(displayCrp, "21ª Região - PI/3324");
    assert.deepEqual(parseStoredCrp(displayCrp), {
      crp_region: "21ª Região - PI",
      crp_number: "3324",
    });
  });
}

test("regional atual explícita prevalece mesmo quando o número coincide com o histórico", () => {
  assert.equal(resolveProfileCrp("7ª Região - RS/03324", confirmedChecks), "7ª Região - RS/3324");
});

test("CRP numérico sem evidência confirmada conserva apenas o número", () => {
  const unconfirmed = {
    raw: {
      normalized_results: confirmedChecks[0].raw.normalized_results,
    },
  };

  assert.equal(resolveProfileCrp("03324"), "3324");
  assert.equal(resolveProfileCrp("03324", [unconfirmed]), "3324");
});

test("não procura correspondência mais antiga para contornar número confirmado divergente", () => {
  const olderMatching = {
    raw: {
      confirmed_result_key: "older-registration",
      normalized_results: [
        { key: "older-registration", nome_regional: "7ª Região - RS", registro: "029112" },
      ],
    },
  };

  assert.equal(resolveProfileCrp("029112", [...confirmedChecks, olderMatching]), "29112");
});

test("registro confirmado sem regional não acrescenta informação ao CRP numérico", () => {
  const withoutRegion = {
    raw: {
      confirmed_result_key: "registration-without-region",
      normalized_results: [{ key: "registration-without-region", registro: "03324" }],
    },
  };

  assert.equal(resolveProfileCrp("03324", [withoutRegion, ...confirmedChecks]), "3324");
});

for (const crp of [undefined, null, "", "   "]) {
  test(`perfil legado com CRP ${JSON.stringify(crp)} usa o histórico confirmado`, () => {
    const displayCrp = resolveProfileCrp(crp, confirmedChecks);

    assert.equal(displayCrp, "21ª Região - PI/3324");
    assert.deepEqual(parseStoredCrp(displayCrp), {
      crp_region: "21ª Região - PI",
      crp_number: "3324",
    });
  });
}

test("preserva CRP atual mesmo sem histórico", () => {
  for (const checks of [undefined, null, []]) {
    assert.equal(resolveProfileCrp("7ª Região - RS/029112", checks), "7ª Região - RS/29112");
  }
});

test("perfil sem CRP e sem histórico mantém os campos de apresentação nulos", () => {
  for (const checks of [undefined, null, []]) {
    const displayCrp = resolveProfileCrp(null, checks);

    assert.equal(displayCrp, null);
    assert.deepEqual(parseStoredCrp(displayCrp), {
      crp_region: null,
      crp_number: null,
    });
  }
});

test("fallback legado ignora resultado não confirmado e preserva a ordem recebida", () => {
  const unconfirmed = {
    raw: {
      normalized_results: [
        { key: "unconfirmed-registration", nome_regional: "7ª Região - RS", registro: "029112" },
      ],
    },
  };
  const laterConfirmed = {
    raw: {
      confirmed_result_key: "later-registration",
      normalized_results: [
        { key: "later-registration", nome_regional: "7ª Região - RS", registro: "029112" },
      ],
    },
  };

  assert.equal(resolveProfileCrp(null, [unconfirmed]), null);
  assert.equal(
    resolveProfileCrp(null, [unconfirmed, ...confirmedChecks, laterConfirmed]),
    "21ª Região - PI/3324",
  );
});

test("apresentação atual não altera a evidência histórica nem o resolvedor do histórico", () => {
  const before = structuredClone(confirmedChecks);

  assert.equal(resolveProfileCrp("7ª Região - RS/029112", confirmedChecks), "7ª Região - RS/29112");
  assert.equal(resolveProfileCrp("03324", confirmedChecks), "21ª Região - PI/3324");
  assert.deepEqual(confirmedChecks, before);
  assert.equal(resolveCrpFromRegistryChecks(confirmedChecks), "21ª Região - PI/3324");
});

test("divide e recompõe CRP preservando regional e sem padding no numero", () => {
  assert.deepEqual(parseStoredCrp("21ª Região - PI/03324"), {
    crp_region: "21ª Região - PI",
    crp_number: "3324",
  });
  assert.equal(normalizeStoredCrp("21ª Região - PI/03324"), "21ª Região - PI/3324");
  assert.equal(
    buildCrpFromRegistryResult({ nome_regional: "7ª Região - RS", registro: "029112" }),
    "7ª Região - RS/29112",
  );
});
