import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { compareProfilePublicationOrder } from "./profile-response";

const publication = (id: string, upvotes: number, comments: number, date = 0) => ({
  id,
  upvotes,
  comments,
  createdAt: new Date(date),
});

describe("profile publication order", () => {
  it("prioriza votos positivos mesmo quando outra publicação tem mais comentários ou é recente", () => {
    const mostVoted = publication("older", 10, 0);
    const mostDiscussed = publication("newer", 9, 100, 1000);
    assert.ok(compareProfilePublicationOrder(mostVoted, mostDiscussed) < 0);
    assert.ok(compareProfilePublicationOrder(mostDiscussed, mostVoted) > 0);
  });

  it("desempata votos por comentários antes da data", () => {
    const discussed = publication("older", 10, 3);
    const recent = publication("newer", 10, 2, 1000);
    assert.ok(compareProfilePublicationOrder(discussed, recent) < 0);
  });

  it("desempata engajamento por data e depois ID, incluindo itens sem engajamento", () => {
    assert.ok(
      compareProfilePublicationOrder(publication("a", 0, 0, 1), publication("z", 0, 0)) < 0,
    );
    assert.ok(compareProfilePublicationOrder(publication("z", 0, 0), publication("a", 0, 0)) < 0);
    const same = publication("same", 0, 0);
    assert.equal(compareProfilePublicationOrder(same, same), 0);
  });

  it("produz ordem global estável entre páginas sem mutar os itens", () => {
    const items = [
      publication("recent", 0, 0, 1000),
      publication("votes", 4, 0),
      publication("comments", 3, 8),
      publication("date", 3, 1, 100),
      publication("z", 3, 1),
      publication("a", 3, 1),
    ];
    const original = structuredClone(items);
    const sorted = [...items].sort(compareProfilePublicationOrder);
    const pages = [sorted.slice(0, 2), sorted.slice(2, 4), sorted.slice(4, 6)];
    assert.deepEqual(
      pages.flat().map((item) => item.id),
      ["votes", "comments", "date", "z", "a", "recent"],
    );
    assert.equal(new Set(pages.flat().map((item) => item.id)).size, items.length);
    assert.deepEqual(items, original);
    assert.deepEqual([...items].reverse().sort(compareProfilePublicationOrder), sorted);
  });

  it("repository usa métricas próprias de posts/respostas e ordena antes de paginar", () => {
    const source = readFileSync(join(__dirname, "..", "ProfileRepository.ts"), "utf8");
    const merge = source.slice(
      source.indexOf("const mergedItems ="),
      source.indexOf("const postIds =", source.indexOf("const mergedItems =")),
    );
    assert.match(merge, /upvotes: post\.upvotes_count/);
    assert.match(merge, /comments: post\.replies_count/);
    assert.match(merge, /upvotes: reply\.upvotes_count/);
    assert.match(merge, /comments: replyChildrenCountById\.get\(reply\.id\) \?\? 0/);
    assert.doesNotMatch(merge, /reply\.post\.(upvotes_count|replies_count)/);
    assert.match(
      merge,
      /\.sort\(compareProfilePublicationOrder\)\s*\.slice\(pagination\.skip, pagination\.skip \+ pagination\.limit\)/,
    );
    assert.match(source, /const highlightedPublication = selectHighlightedPublication\(/);
    assert.match(source, /deleted: false,\s*parent_reply_id:/);
  });
});
