import "../../scripts/register-source-modules.mjs";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";
import { InfiniteQueryObserver, QueryClient } from "@tanstack/react-query";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const { mapRelationPages } = await import("../api/callers/patient/relation-list-cache.ts");
const { InfiniteListLoader } = await import("../components/ui/infinite-list-loader.tsx");
const { flattenListPages, nextListPage } = await import("./infinite-list.ts");

const page = (number, ids, pages = 3) => ({
  page: number,
  pages,
  count: 5,
  data: ids.map((id) => ({ id, favorited: true })),
});

test("next page stops at exhaustion or an empty response", () => {
  assert.equal(nextListPage(page(1, ["a"])), 2);
  assert.equal(nextListPage(page(3, ["e"])), undefined);
  assert.equal(nextListPage(page(2, [])), undefined);
  assert.equal(nextListPage(page(1, [], 0)), undefined);
});

test("flatten preserves order and deduplicates page boundaries", () => {
  assert.deepEqual(flattenListPages(undefined), []);
  const first = page(1, ["a", "b"]);
  const second = page(2, ["b", "c"]);
  second.data[0].favorited = false;
  assert.deepEqual(
    flattenListPages([first, second]).map((item) => item.id),
    ["a", "b", "c"],
  );
  assert.equal(flattenListPages([first, second])[1].favorited, false);
});

test("real infinite query retains previous pages after failure and resumes to the last page", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const requests = [];
  let fail = true;
  const observer = new InfiniteQueryObserver(client, {
    queryKey: ["list-test"],
    initialPageParam: 1,
    getNextPageParam: nextListPage,
    queryFn: async ({ pageParam }) => {
      requests.push(pageParam);
      if (pageParam === 2 && fail) throw new Error("Unit test network failure");
      return page(pageParam, [String(pageParam)]);
    },
  });
  const unsubscribe = observer.subscribe(() => {});
  try {
    await observer.refetch();
    await observer.fetchNextPage();
    assert.equal(observer.getCurrentResult().isFetchNextPageError, true);
    assert.deepEqual(
      flattenListPages(observer.getCurrentResult().data.pages).map((item) => item.id),
      ["1"],
    );
    fail = false;
    await observer.fetchNextPage();
    await observer.fetchNextPage();
    assert.deepEqual(
      flattenListPages(observer.getCurrentResult().data.pages).map((item) => item.id),
      ["1", "2", "3"],
    );
    assert.equal(observer.getCurrentResult().hasNextPage, false);
    const before = requests.length;
    await observer.fetchNextPage();
    assert.equal(requests.length, before);
  } finally {
    unsubscribe();
    client.clear();
  }
});

test("refetch after removal fills page boundaries without skipping remaining items", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  let ids = ["a", "b", "c", "d", "e"];
  const observer = new InfiniteQueryObserver(client, {
    queryKey: ["removal-test"],
    initialPageParam: 1,
    getNextPageParam: nextListPage,
    queryFn: async ({ pageParam }) =>
      page(pageParam, ids.slice((pageParam - 1) * 2, pageParam * 2), Math.ceil(ids.length / 2)),
  });
  const unsubscribe = observer.subscribe(() => {});
  try {
    await observer.refetch();
    await observer.fetchNextPage();
    ids = ids.filter((id) => id !== "a");
    await client.invalidateQueries({ queryKey: ["removal-test"] });
    assert.deepEqual(
      flattenListPages(observer.getCurrentResult().data.pages).map((item) => item.id),
      ids,
    );
    assert.equal(observer.getCurrentResult().hasNextPage, false);
  } finally {
    unsubscribe();
    client.clear();
  }
});

test("filter keys isolate results and restart at the first page", async () => {
  const client = new QueryClient();
  const requests = [];
  const options = (filter) => ({
    queryKey: ["filter-test", { filter, mode: "infinite" }],
    initialPageParam: 1,
    getNextPageParam: nextListPage,
    queryFn: async ({ pageParam }) => {
      requests.push([filter, pageParam]);
      return page(pageParam, [`${filter}-${pageParam}`]);
    },
  });
  const observer = new InfiniteQueryObserver(client, options("all"));
  const unsubscribe = observer.subscribe(() => {});
  try {
    await observer.refetch();
    await observer.fetchNextPage();
    observer.setOptions(options("available"));
    await observer.refetch();
    assert.deepEqual(
      flattenListPages(observer.getCurrentResult().data.pages).map((item) => item.id),
      ["available-1"],
    );
    assert.deepEqual(requests.at(-1), ["available", 1]);
  } finally {
    unsubscribe();
    client.clear();
  }
});

test("favorite cache patches both flat count queries and infinite lists, preserving rollback snapshots", () => {
  const flat = page(1, ["a"]);
  const infinite = { pages: [flat, page(2, ["b"])], pageParams: [1, 2] };
  const update = (old) => ({ ...old, data: old.data.filter((item) => item.id !== "b") });
  assert.deepEqual(mapRelationPages(flat, update), flat);
  assert.equal(mapRelationPages(infinite, update).pages[1].data.length, 0);
  assert.deepEqual(mapRelationPages(infinite, update).pageParams, [1, 2]);
  assert.equal(infinite.pages[1].data.length, 1);
  assert.equal(mapRelationPages(undefined, update), undefined);
});

test("loader hides at the end and exposes retry instead of page navigation on error", () => {
  const props = {
    hasNextPage: false,
    isFetching: false,
    isError: false,
    label: "Carregando favoritos",
    onLoadMore() {},
    onRetry() {},
  };
  assert.equal(renderToStaticMarkup(createElement(InfiniteListLoader, props)), "");
  const retry = renderToStaticMarkup(
    createElement(InfiniteListLoader, { ...props, isError: true }),
  );
  assert.match(retry, /Tentar novamente/);
  const loading = renderToStaticMarkup(
    createElement(InfiniteListLoader, { ...props, isFetching: true }),
  );
  assert.match(loading, /Carregando favoritos/);
  assert.doesNotMatch(loading, /Tentar novamente/);
});

test("frontend lists do not reintroduce page navigation or manual load-more footers", () => {
  const roots = [new URL("../app/", import.meta.url), new URL("../components/", import.meta.url)];
  for (const root of roots) {
    for (const file of readdirSync(root, { recursive: true })) {
      if (!String(file).endsWith(".tsx")) continue;
      const source = readFileSync(new URL(String(file).replaceAll("\\", "/"), root), "utf8");
      assert.doesNotMatch(
        source,
        /<Pagination\b|onPageChange=|aria-label=["']Paginação|Carregar mais avaliações|Carregar avaliações anteriores|["']Carregar mais["']/,
        String(file),
      );
    }
  }
});
