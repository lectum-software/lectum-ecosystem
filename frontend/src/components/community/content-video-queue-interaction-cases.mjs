import assert from "node:assert/strict";
import { test } from "node:test";

export const registerQueueInteractionCases = ({ getPage, wait, snapshot }) => {
  test("updateItem persists vote/save after next/previous and only patches the matching media", async () => {
    const page = getPage();
    await page.evaluate(() => {
      responses["p:1"] = response([video("p", "a"), video("p", "b")]);
      mount({ postId: "p" });
    });
    await wait(() => queue.items.length === 2);
    await page.evaluate(() => {
      action("updateItem", key(queue.items[0]), {
        saved: true,
        current_user_vote: 1,
        upvotes_count: 8,
      });
      action("next");
      action("previous");
    });
    const state = await page.evaluate(snapshot);
    assert.equal(state.index, 0);
    assert.equal(state.items[0].saved, true);
    assert.equal(state.items[0].current_user_vote, 1);
    assert.equal(state.items[0].upvotes_count, 8);
    assert.equal(state.items[1].saved, false);
    assert.equal(state.items[1].upvotes_count, 0);
  });

  test("nested comment changes retain queue position and cursor while marking the same discussion", async () => {
    const page = getPage();
    await page.evaluate(() => {
      responses["p:1"] = response(
        [
          video("p", "a", "a"),
          video("p", "b", "b"),
          video("p", "original"),
          video("other-post", "unrelated", "unrelated"),
        ],
        1,
        2,
      );
      responses["p:2"] = response([video("p", "tail", "tail")], 2, 2);
      mount({ postId: "p" });
    });
    await wait(() => queue.items.length === 4);
    const before = await page.evaluate(snapshot);
    await page.evaluate(() => {
      action("select", 1);
      action("updateItem", key(queue.items[1]), { replies_count: 1, descendants_count: 1 });
    });
    const changed = await page.evaluate(snapshot);
    assert.equal(changed.index, 1);
    assert.deepEqual(
      changed.items.map((item) => item.id),
      before.items.map((item) => item.id),
    );
    assert.deepEqual(Object.keys(changed.staleInteractions).sort(), [
      "p:post:original",
      "p:reply:a",
    ]);
    assert.equal(
      await page.evaluate(() => calls.length),
      1,
      "marking never refetches or rebuilds the queue",
    );
    await page.evaluate(() => {
      const token = queue.staleInteractions[key(queue.items[0])];
      action("select", 0);
      action("updateItem", key(queue.items[0]), { descendants_count: 2 }, token);
    });
    assert.equal((await page.evaluate(snapshot)).index, 0);
    assert.deepEqual(Object.keys((await page.evaluate(snapshot)).staleInteractions), [
      "p:post:original",
    ]);
    await page.evaluate(() => action("select", 3));
    await wait(() => queue.items.length === 5);
    assert.deepEqual(await page.evaluate(() => calls.map((call) => call.cursor)), [undefined, "2"]);
  });

  test("a pending pagination response inherits mutations committed before it resolves", async () => {
    const page = getPage();
    await page.evaluate(() => {
      const request = requestVideos;
      requestVideos = async (id, query) => {
        if (!query.cursor) return request(id, query);
        calls.push({ id, ...query });
        return new Promise((resolve) => {
          window.finishPendingPage = resolve;
        });
      };
      responses["p:1"] = response([video("p", "a", "a"), video("p", "b", "b")], 1, 2);
      mount({ postId: "p" });
    });
    await wait(() => queue.items.length === 2);
    await page.evaluate(() => action("select", 1));
    await wait(() => Boolean(window.finishPendingPage));
    await page.evaluate(() => {
      action("invalidateDiscussion", "p");
      finishPendingPage(response([video("p", "c", "c")], 2, 2));
    });
    await wait(() => queue.items.length === 3);
    const state = await page.evaluate(snapshot);
    assert.equal(state.index, 1);
    assert.deepEqual(
      state.items.map((item) => item.id),
      ["a", "b", "c"],
    );
    assert.ok(state.staleInteractions["p:reply:c"]);
    assert.equal(state.staleInteractions["p:reply:c"], state.staleInteractions["p:reply:a"]);
    assert.deepEqual(await page.evaluate(() => calls.map((call) => call.cursor)), [undefined, "2"]);
  });
};
