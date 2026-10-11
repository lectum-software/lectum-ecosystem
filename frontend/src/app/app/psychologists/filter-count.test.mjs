import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file) => readFileSync(new URL(file, import.meta.url), "utf8");
test("count projection reuses the same complete filter mapping as apply", () => {
  const source = read("./hooks/use-psychologists-directory.tsx");
  assert.match(source, /toQuery\(normalizeFormValues\(filterDraft\), 1\)/);
  assert.match(source, /limit: 1/);
  const mapping = read("./modules/profile-format.ts");
  for (const field of [
    "search",
    "specialty",
    "service",
    "modality",
    "approach",
    "target_audience",
    "state",
    "city",
    "gender",
    "race_color",
    "religion",
    "language",
    "more_experienced",
    "discount_first_session",
    "accepts_insurance",
    "social_value",
    "available_today",
    "verified",
  ]) {
    assert.ok(mapping.includes(`${field}: values.${field}`));
  }
});
test("preview observes the form, is modal-only and hides stale/error counts", () => {
  const source = read("./hooks/use-psychologists-directory.tsx");
  assert.match(source, /useWatch\(\{ control: filters.hook.control \}\)/);
  assert.match(source, /isFiltersOpen && hasFilterCountCriteria && isFilterCountSettled/);
  assert.match(source, /setSettledFilterCountQueryKey\(filterCountQueryKey\),\s*300/);
  assert.match(source, /!isFilterCountLoading &&\s*!filterCountDirectory.isError/);
  assert.match(source, /filterCountDirectory.data\?\.count/);
  assert.match(source, /clearTimeout\(timer\)/);
});
test("button preserves zero, displays loading and uses a subtle parenthesized badge", () => {
  const source = read("./view/index.tsx");
  assert.match(source, /filterResultCount !== undefined/);
  assert.ok(source.includes("($" + "{filterResultCount})"));
  assert.match(source, /bg-primary-foreground\/20/);
  assert.match(source, /Atualizando quantidade/);
});

test("empty normalized criteria hide the badge and disable the preview query", () => {
  const hook = read("./hooks/use-psychologists-directory.tsx");
  const view = read("./view/index.tsx");
  assert.match(hook, /Object.values\(normalizeFormValues\(filterDraft\)\).some\(Boolean\)/);
  assert.match(hook, /isFiltersOpen && hasFilterCountCriteria && isFilterCountSettled/);
  assert.match(hook, /hasFilterCountCriteria &&\s*\(!isFilterCountSettled/);
  assert.match(view, /hasFilterCountCriteria &&/);
});
