import assert from "node:assert/strict";
import { before, test } from "node:test";
import { createInstance } from "i18next";
import zodMessages from "../../../locales/pt/zod.json";
import { setI18n } from "./i18n";
import schema from "./schema";
import { buildValidationObjectMap } from "./schema/_internal/build-object-map";
import { z } from "./schema/_internal/validations/zod";

before(async () => {
  const i18n = createInstance();
  await i18n.init({ lng: "pt", resources: { pt: { zod: zodMessages } } });
  setI18n(i18n, "pt");
});

for (const bound of [0, "0"]) {
  test(`numeric respeita mínimo zero (${typeof bound}) inclusive após coerção`, () => {
    const numeric = schema.f.numeric({ key: "value", min: bound });
    for (const value of [-1, -0.5, "-1", "-0.5"]) {
      assert.equal(numeric.safeParse(value).success, false);
    }
    for (const value of [0, "0", -0, "-0", 1, "1"]) {
      assert.equal(numeric.parse(value), Number(value));
    }
  });

  test(`numeric respeita máximo zero (${typeof bound}) inclusive após coerção`, () => {
    const numeric = schema.f.numeric({ key: "value", max: bound });
    for (const value of [1, 0.5, "1", "0.5"]) {
      assert.equal(numeric.safeParse(value).success, false);
    }
    for (const value of [0, "0", -1, "-1"]) {
      assert.equal(numeric.parse(value), Number(value));
    }
  });

  test(`string respeita comprimento zero (${typeof bound}) sem coerção nova`, () => {
    const string = schema.f.string({ key: "value", min: bound, max: bound });
    assert.equal(string.parse(""), "");
    for (const value of ["a", "0", " ", 0, false]) {
      assert.equal(string.safeParse(value).success, false);
    }
  });
}

test("limites omitidos/vazios e conversões legadas permanecem iguais", () => {
  for (const bound of [undefined, ""]) {
    const numeric = schema.f.numeric({ key: "value", min: bound, max: bound });
    for (const value of [-10, 10, "-10", "10", "", " ", false, true]) {
      assert.equal(numeric.parse(value), Number(value));
    }
    assert.equal(numeric.safeParse(null).success, false);
    assert.equal(numeric.safeParse(undefined).success, false);
    const string = schema.f.string({ key: "value", min: bound, max: bound });
    assert.equal(string.parse(""), "");
    assert.equal(string.parse("abc"), "abc");
  }
  assert.equal(schema.f.string({ key: "value", format: "upper" }).parse("ação"), "AÇÃO");
  assert.equal(schema.f.string({ key: "value", format: "lower" }).parse("AÇÃO"), "ação");
});

test("limites positivos, negativos, int e positive continuam aplicados", () => {
  const numeric = schema.f.numeric({ key: "value", min: -2, max: 2, int: true });
  for (const value of [-3, 3, 0.5, "0.5", "inválido", NaN, Infinity, -Infinity]) {
    assert.equal(numeric.safeParse(value).success, false);
  }
  for (const value of [-2, 0, 2, "2"]) assert.equal(numeric.parse(value), Number(value));
  assert.equal(
    schema.f.numeric({ key: "value", min: 0, positive: true }).safeParse(0).success,
    false,
  );
  assert.equal(schema.f.numeric({ key: "value", min: 0, max: 0 }).safeParse(-1).success, false);
  assert.equal(schema.f.numeric({ key: "value", min: 0, max: 0 }).parse(0), 0);
  assert.equal(schema.f.numeric({ key: "value", min: 0, max: 0 }).safeParse(1).success, false);
  const string = schema.f.string({ key: "value", min: 1, max: 2 });
  assert.equal(string.safeParse("").success, false);
  assert.equal(string.parse("ab"), "ab");
  assert.equal(string.safeParse("abc").success, false);
});

const relationSchema = (
  type: keyof typeof schema.conditions,
  method: "numeric" | "boolean" | "string" = "numeric",
  names = ["first", "second"],
) => {
  const keys = names.map((key) => ({ key, method, optional: true, nullable: true }));
  return z
    .object(buildValidationObjectMap(keys, schema.f))
    .superRefine((cont, ctx) => schema.refinesServer(cont, ctx, [{ keys, type }]));
};

for (const method of ["numeric", "boolean"] as const) {
  const value = method === "numeric" ? 0 : false;

  test(`oneOfRequired considera ${method} falsy preenchido`, () => {
    const relation = relationSchema("oneOfRequired", method);
    for (const body of [{ first: value }, { second: value }, { first: value, second: value }]) {
      assert.equal(relation.safeParse(body).success, true);
    }
    assert.equal(relation.safeParse({}).success, false);
    assert.equal(relation.safeParse({ first: null, second: null }).success, false);
  });

  test(`mutual considera ${method} falsy preenchido sem dispensar o par`, () => {
    const relation = relationSchema("mutual", method);
    assert.equal(relation.safeParse({ first: value, second: value }).success, true);
    for (const body of [{}, { first: value }, { second: value }, { first: value, second: null }]) {
      assert.equal(relation.safeParse(body).success, false);
    }
  });

  test(`reverse recusa dois ${method} falsy mas aceita apenas um`, () => {
    const relation = relationSchema("reverse", method);
    assert.equal(relation.safeParse({ first: value, second: value }).success, false);
    for (const body of [{}, { first: value }, { second: value }, { first: value, second: null }]) {
      assert.equal(relation.safeParse(body).success, true);
    }
  });
}

for (const type of ["major", "majorOrEqual"] as const) {
  test(`${type} compara zero nas duas posições e preserva ausência`, () => {
    const relation = relationSchema(type);
    for (const body of [
      { first: -1, second: 0 },
      { first: 0, second: 1 },
    ]) {
      const result = relation.safeParse(body);
      assert.equal(result.success, false);
      if (!result.success)
        assert.deepEqual(
          result.error.issues.map((issue) => issue.path),
          [["second"]],
        );
    }
    for (const body of [
      { first: 0, second: -1 },
      { first: 1, second: 0 },
      { first: 2, second: 1 },
      {},
      { first: 0 },
      { second: 0 },
      { first: null, second: 0 },
      { first: 0, second: null },
    ]) {
      assert.equal(relation.safeParse(body).success, true);
    }
    assert.equal(relation.safeParse({ first: 0, second: 0 }).success, type === "majorOrEqual");
    const threeFields = relationSchema(type, "numeric", ["first", "second", "third"]);
    assert.equal(threeFields.safeParse({ second: -1, third: 0 }).success, true);
    assert.equal(threeFields.safeParse({ first: 0, second: null, third: -1 }).success, true);
    assert.equal(threeFields.safeParse({ first: 0, second: null, third: 1 }).success, false);
  });

  test(`${type} mantém comparação de booleanos incluindo false`, () => {
    const relation = relationSchema(type, "boolean");
    assert.equal(relation.safeParse({ first: false, second: true }).success, false);
    assert.equal(relation.safeParse({ first: true, second: false }).success, true);
    assert.equal(
      relation.safeParse({ first: false, second: false }).success,
      type === "majorOrEqual",
    );
  });
}

test("relações preservam strings vazias ausentes e entradas truthy legadas", () => {
  assert.equal(relationSchema("oneOfRequired", "string").safeParse({ first: "" }).success, false);
  assert.equal(relationSchema("oneOfRequired", "string").safeParse({ first: " " }).success, true);
  assert.equal(
    relationSchema("mutual", "string").safeParse({ first: "", second: "" }).success,
    false,
  );
  assert.equal(
    relationSchema("mutual", "string").safeParse({ first: "a", second: "b" }).success,
    true,
  );
  assert.equal(
    relationSchema("reverse", "string").safeParse({ first: "", second: "b" }).success,
    true,
  );
  assert.equal(
    relationSchema("reverse", "string").safeParse({ first: "a", second: "b" }).success,
    false,
  );
  for (const type of ["major", "majorOrEqual"] as const) {
    assert.equal(
      relationSchema(type, "string").safeParse({ first: "", second: "a" }).success,
      true,
    );
    assert.equal(
      relationSchema(type, "string").safeParse({ first: "a", second: "" }).success,
      true,
    );
  }
  assert.equal(relationSchema("equal").safeParse({ first: 0, second: 0 }).success, true);
  assert.equal(relationSchema("equal").safeParse({ first: 0 }).success, false);
  assert.equal(
    relationSchema("equal", "boolean").safeParse({ first: false, second: false }).success,
    true,
  );
  assert.equal(
    relationSchema("equal", "boolean").safeParse({ first: false, second: true }).success,
    false,
  );
});

test("coerção precede condições e mapa mantém optional/nullable", () => {
  assert.deepEqual(relationSchema("mutual").parse({ first: "0", second: "0" }), {
    first: 0,
    second: 0,
  });
  assert.deepEqual(relationSchema("mutual", "boolean").parse({ first: "false", second: "0" }), {
    first: false,
    second: false,
  });
  const object = z.object(
    buildValidationObjectMap(
      [{ key: "value", method: "numeric", min: 0, max: 0, optional: true, nullable: true }],
      schema.f,
    ),
  );
  assert.deepEqual(object.parse({}), {});
  assert.deepEqual(object.parse({ value: null }), { value: null });
  assert.deepEqual(object.parse({ value: "0" }), { value: 0 });
  assert.equal(object.safeParse({ value: -1 }).success, false);
  assert.equal(object.safeParse({ value: 1 }).success, false);
  const customObject = z.object(
    buildValidationObjectMap(
      [
        {
          key: "value",
          method: "string",
          max: 0,
          optional: true,
          nullable: true,
          custom: z
            .string()
            .max(2)
            .transform((value) => value.toUpperCase()),
        },
      ],
      schema.f,
    ),
  );
  assert.deepEqual(customObject.parse({}), {});
  assert.deepEqual(customObject.parse({ value: null }), { value: null });
  assert.deepEqual(customObject.parse({ value: "ab" }), { value: "AB" });
  assert.equal(customObject.safeParse({ value: "abc" }).success, false);
});
