import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const expressRequire = createRequire(require.resolve("express"));
const consumers = [
  ["express", expressRequire],
  ["body-parser", createRequire(expressRequire.resolve("body-parser"))],
  ["twilio", createRequire(require.resolve("twilio"))],
];

// Exercise the actual transitive dependency, not a replacement parser or HTTP mock.
for (const [consumer, resolve] of consumers) {
  const qs = resolve("qs");

  test(`${consumer}: qs neutralizes non-callable toString in comma arrays`, () => {
    const inputs = [
      JSON.parse('{"a":[{"toString":"x"}]}'),
      qs.parse("a[0][toString]=x", { allowPrototypes: true }),
      qs.parse("a[][b]=c", { plainObjects: true }),
    ];

    for (const input of inputs) {
      for (const encodeValuesOnly of [false, true]) {
        assert.equal(
          qs.stringify(input, { arrayFormat: "comma", encodeValuesOnly }),
          "a=%5Bobject%20Object%5D",
        );
      }
    }
  });

  test(`${consumer}: qs preserves ordinary parsing and repeat serialization`, () => {
    assert.deepEqual(qs.parse("filter[active]=true&tags=a&tags=b"), {
      filter: { active: "true" },
      tags: ["a", "b"],
    });
    assert.equal(qs.stringify({ tags: ["a", "b"] }, { arrayFormat: "repeat" }), "tags=a&tags=b");
    assert.equal(qs.stringify({ tags: ["a", "b"] }, { arrayFormat: "comma" }), "tags=a%2Cb");
  });
}
