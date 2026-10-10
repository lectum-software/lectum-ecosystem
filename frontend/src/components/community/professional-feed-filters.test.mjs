import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
test("feed profissional reutiliza chips e inicia em oportunidades; paciente mantem destaque", () => {
  const source = read("../../app/app/community/[slug]/views/community-feed.tsx");
  assert.match(source, /useState<CommunityPostSort>\("opportunities"\)/);
  assert.match(source, /isPsychologistUser \? professionalSort : "featured"/);
  assert.match(
    source,
    /isPsychologistUser && firstFeedPage\?\.professional_filters_available !== false/,
  );
  assert.match(source, /<CommunityPostSortChips/);
  assert.match(source, /sortPeriods\[sort\]/);
  assert.match(source, /variationSeed, sort, period/);
  assert.match(source, /onShare=\{sharePost\}/);
});
test("cache separa perfil, identidade e query completa; API antiga tem fallback seguro", () => {
  const caller = read("../../api/callers/community/index.tsx");
  assert.match(caller, /viewer: user\?\.id \?\? null/);
  assert.match(caller, /role: user\?\.role \?\? null/);
  assert.match(caller, /\.\.\.query/);
  const req = read("../../api/req/community/index.ts");
  assert.match(req, /professional_filters_available: false/);
  assert.match(req, /getApiErrorStatus\(error\) !== 400/);
});
