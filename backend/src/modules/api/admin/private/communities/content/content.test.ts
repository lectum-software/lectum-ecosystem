import assert from "node:assert/strict";
import { once } from "node:events";
import { readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import express from "express";
import { globalContentSql } from "./repositories/content-query";
import { listValidator } from "./validator";

const range = { start: null, end: null };

test("global content restricts both union arms to psychologists and existing communities", () => {
  const query = globalContentSql({}, range);
  assert.equal(query.text.match(/u.role = 'psicologo'/g)?.length, 2);
  assert.equal(query.text.match(/c.deleted = false/g)?.length, 2);
  assert.match(query.text, /UNION ALL/);
  assert.match(query.text, /FROM community_posts x/);
  assert.match(query.text, /FROM post_replies x/);
});

test("type filtering excludes the other source before pagination", () => {
  assert.doesNotMatch(globalContentSql({ type: "posts" }, range).text, /post_replies/);
  assert.doesNotMatch(globalContentSql({ type: "replies" }, range).text, /UNION ALL/);
  assert.match(globalContentSql({ type: "replies" }, range).text, /post_replies/);
});

test("search, community, professional name and dates stay bound SQL parameters", () => {
  const start = new Date("2026-10-01T00:00:00Z");
  const end = new Date("2026-10-02T00:00:00Z");
  const query = globalContentSql(
    { q: "' OR 1=1 --%_", psychologist: "Nome Profissional", community: "community-test" },
    { start, end },
  );
  assert.doesNotMatch(query.text, /OR 1=1|Nome Profissional|community-test/);
  assert.ok(query.values.includes("community-test"));
  assert.ok(query.values.includes("%Nome Profissional%"));
  assert.ok(query.values.includes("%' OR 1=1 --\\%\\_%"));
  assert.ok(query.values.includes(start));
  assert.ok(query.values.includes(end));
  assert.match(query.text, /pp.professional_first_name/);
  assert.match(query.text, /p.title ILIKE/);
});

test("global route retains admin authentication and is mounted before community identifiers", () => {
  const routes = readFileSync("src/main/server/imports/write.ts", "utf8");
  assert.match(routes, /adminProtected \? \[adminAuth, \.\.\.handlers\]/);
  assert.ok(
    routes.indexOf('mountRoute("/api/admin/private/communities/content"') <
      routes.indexOf('mountRoute("/api/admin/private/communities",'),
  );
  const repository = readFileSync(
    "src/modules/api/admin/private/communities/content/repositories/AdminGlobalContentRepository.ts",
    "utf8",
  );
  assert.match(repository, /ORDER BY created_at .*id ASC, type ASC/);
  assert.match(repository, /LIMIT .* OFFSET/);
  assert.match(repository, /RepeatableRead/);
});

test("HTTP validator accepts supported filters and rejects invalid or unbounded requests", async () => {
  const app = express();
  app.get("/", listValidator, (req, res) => res.json(req.q));
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    const valid = await fetch(
      `${url}/?type=replies&sort=oldest&period=30d&page=2&limit=8&psychologist=Nome`,
    );
    assert.equal(valid.status, 200);
    assert.deepEqual(await valid.json(), {
      type: "replies",
      sort: "oldest",
      period: "30d",
      page: 2,
      limit: 8,
      psychologist: "Nome",
    });
    for (const query of [
      "type=patients",
      "sort=unsafe",
      "period=forever",
      "page=0",
      "page=1.5",
      "limit=51",
      "limit=-1",
      `q=${"a".repeat(121)}`,
    ]) {
      assert.equal((await fetch(`${url}/?${query}`)).status, 400, query);
    }
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
