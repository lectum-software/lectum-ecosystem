import "../../../../scripts/register-source-modules.mjs";
import assert from "node:assert/strict";
import test from "node:test";
import { QueryClient } from "@tanstack/react-query";
import keys from "../../cache/keys.ts";

const { updateDirectoryRelation } = await import("./directory-relation-cache.ts");

// Cache-contract inputs only: real QueryClient and production updater, no API replacement.
const author = (id) => ({ id, favorited: false, followed: false });
const page = (number, data) => ({ page: number, pages: 2, count: 3, filters: {}, data });

for (const field of ["favorited", "followed"]) {
  test(`${field}: updates ordinary and infinite queries, including later pages`, () => {
    const client = new QueryClient();
    const flatKey = keys.directory.psychologists({ search: "target" });
    const infiniteKey = keys.directory.psychologists({ mode: "infinite" });
    const filteredKey = keys.directory.psychologists({ mode: "infinite", search: "other" });
    const flat = page(1, [author("target")]);
    const infinite = {
      pages: [page(1, [author("other")]), page(2, [author("target"), author("third")])],
      pageParams: [1, 2],
    };
    client.setQueryData(flatKey, flat);
    client.setQueryData(infiniteKey, infinite);
    client.setQueryData(filteredKey, { pages: [page(1, [author("other")])], pageParams: [1] });
    try {
      for (const selected of [true, false]) {
        updateDirectoryRelation(client, "target", { [field]: selected });
        const result = client.getQueryData(infiniteKey);
        assert.equal(client.getQueryData(flatKey).data[0][field], selected);
        assert.equal(result.pages[1].data[0][field], selected);
        assert.equal(result.pages[0].data[0][field], false);
        assert.equal(result.pages[1].data[1][field], false);
        assert.deepEqual(result.pageParams, [1, 2]);
        assert.equal(result.pages[1].count, 3);
        assert.equal(result.pages[1].page, 2);
        assert.equal(result.pages[1].pages, 2);
        assert.deepEqual(result.pages[1].filters, {});
        assert.equal(client.getQueryData(filteredKey).pages[0].data[0][field], false);
      }
      assert.equal(flat.data[0][field], false);
      assert.equal(infinite.pages[1].data[0][field], false);
    } finally {
      client.clear();
    }
  });
}

test("empty and missing caches stay empty without manufacturing directory entries", () => {
  const client = new QueryClient();
  const key = keys.directory.psychologists({ mode: "infinite" });
  updateDirectoryRelation(client, "target", { favorited: true });
  assert.equal(client.getQueryCache().getAll().length, 0);
  client.setQueryData(key, { pages: [], pageParams: [] });
  updateDirectoryRelation(client, "target", { favorited: true });
  assert.deepEqual(client.getQueryData(key), { pages: [], pageParams: [] });
  client.clear();
});
