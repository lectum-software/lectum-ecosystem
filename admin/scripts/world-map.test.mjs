import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire, registerHooks } from "node:module";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const req = createRequire(`${root}/package.json`);
const ts = req("typescript");
const { createElement } = req("react");
const { renderToStaticMarkup } = req("react-dom/server");
const base = pathToFileURL(`${root}/src/`);
const hooks = registerHooks({
  resolve(spec, ctx, next) {
    let url;
    if (spec.startsWith("@/")) url = new URL(spec.slice(2), base);
    else if (spec.startsWith(".") && ctx.parentURL?.startsWith(base.href))
      url = new URL(spec, ctx.parentURL);
    if (url) {
      for (const suffix of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
        const p = fileURLToPath(url) + suffix;
        if (existsSync(p) && /\.(ts|tsx|json)$/.test(p)) return next(p, ctx);
      }
    }
    return next(spec, ctx);
  },
  load(url, ctx, next) {
    if (!url.startsWith(base.href) || !/\.tsx?$/.test(url)) return next(url, ctx);
    return {
      format: "commonjs",
      shortCircuit: true,
      source: ts.transpileModule(readFileSync(new URL(url), "utf8"), {
        fileName: fileURLToPath(url),
        compilerOptions: {
          esModuleInterop: true,
          jsx: ts.JsxEmit.ReactJSX,
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      }).outputText,
    };
  },
});
const world = req(`${root}/src/lib/world-country-map.ts`);
const modules = ["pacientes/components/location-map.tsx", "trafego/components/location.tsx"].map(
  (p) => [p, req(`${root}/src/app/(admin)/${p}`)],
);
hooks.deregister();
const raw = JSON.parse(readFileSync(`${root}/src/lib/world-country-map.json`, "utf8"));
test("cada geometria tem chave interna distinta e não vazia", () => {
  const keys = world.WORLD_COUNTRY_MAP_PATHS.map((p) => p.mapKey);
  assert.ok(keys.every((k) => typeof k === "string" && k.length > 0));
  assert.equal(new Set(keys).size, raw.length);
});
test("IDs cartográficos, nomes e geometria originais preservados", () => {
  assert.deepEqual(
    world.WORLD_COUNTRY_MAP_PATHS.map(({ d, id, name }) => ({ d, id, name })),
    raw,
  );
});
for (const [name, mod] of modules) {
  for (const country of ["N. Cyprus", "Somaliland", "Kosovo", "Brazil"])
    test(`${name}: realçar somente ${country}`, () => {
      const item = Object.freeze({
        id: `country:${country}`,
        label: country,
        count: 7,
        percentage: 100,
      });
      const path = mod.resolveWorldCountryMapPath(item);
      assert.equal(path.name, country);
      const html = renderToStaticMarkup(
        createElement(mod.WorldCountryMap, { countries: Object.freeze([item]) }),
      );
      const titles = [...html.matchAll(/<title>(.*?)<\/title>/g)].map((m) => m[1]);
      assert.equal(titles.length, raw.length);
      const highlighted = titles.filter(
        (t) => !t.endsWith(": sem pacientes") && !t.endsWith(": sem acesso"),
      );
      assert.equal(highlighted.length, 1);
      assert.ok(highlighted[0].startsWith(`${country}: 7`));
    });
  test(`${name}: origem desconhecida não colore geometrias`, () => {
    const html = renderToStaticMarkup(
      createElement(mod.WorldCountryMap, {
        countries: [{ id: "unknown", label: "Origem não identificada", count: 7, percentage: 100 }],
      }),
    );
    assert.ok(html.includes("Países não encontrados"));
    assert.equal((html.match(/stroke-width="0.85"/g) || []).length, 0);
  });
}
