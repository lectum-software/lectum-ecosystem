import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { it } from "node:test";

const require = createRequire(import.meta.url);
// Resolve the installed dependency from Express, not a separate test-only qs installation.
const expressRequire = createRequire(require.resolve("express"));
const qs = expressRequire("qs");

it("Express resolve o patch transitivo qs 6.16.1 fixado no manifesto", () => {
  assert.equal(require("../package.json").pnpm.overrides.qs, "6.16.1");
  assert.equal(expressRequire("qs/package.json").version, "6.16.1");
});

// Regression for https://github.com/advisories/GHSA-6pq8-jhm2-2vcw.
for (const encodeValuesOnly of [false, true]) {
  it(`serializa arrays comma com toString próprio não invocável (encodeValuesOnly=${encodeValuesOnly})`, () => {
    const fromJson = JSON.parse('{"a":[{"toString":"x"}]}');
    const fromQuery = qs.parse("a[0][toString]=x", { allowPrototypes: true });

    for (const input of [fromJson, fromQuery]) {
      assert.equal(Object.hasOwn(input.a[0], "toString"), true);
      assert.equal(input.a[0].toString, "x");
      assert.equal(
        qs.stringify(input, { arrayFormat: "comma", encodeValuesOnly }),
        "a=%5Bobject%20Object%5D",
      );
      assert.equal(input.a[0].toString, "x", "a serialização não deve alterar a entrada");
    }
  });
}

it("preserva parsing usual e formatos de serialização existentes", () => {
  assert.deepEqual(qs.parse("page=2&filter[status]=ready&tags[]=one&tags[]=two"), {
    page: "2",
    filter: { status: "ready" },
    tags: ["one", "two"],
  });
  assert.equal(qs.stringify({ a: ["one", "two"] }), "a%5B0%5D=one&a%5B1%5D=two");
  assert.equal(qs.stringify({ a: ["one", "two"] }, { arrayFormat: "comma" }), "a=one%2Ctwo");
  assert.equal(
    qs.stringify({ a: ["one", "two"] }, { arrayFormat: "comma", encodeValuesOnly: true }),
    "a=one,two",
  );
});
