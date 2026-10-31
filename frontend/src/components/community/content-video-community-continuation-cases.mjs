import assert from "node:assert/strict";
import { test } from "node:test";

export const registerCommunityContinuationCases = ({ getPage, wait, snapshot }) => {
  test("finishes the source community before continuing through other communities", async () => {
    const page = getPage();
    await page.evaluate(() => {
      responses["p:1"] = response([{ ...video("p", "a"), community: { slug: "origin" } }]);
      responses["q:1"] = response([{ ...video("q", "b"), community: { slug: "origin" } }]);
      responses["r:1"] = response([video("r", "c")], 1, 2);
      responses["r:2"] = response([video("r", "c"), video("r", "d")], 2, 2);
      responses["s:1"] = response([video("s", "e")]);
      communityResponses["catalog:1"] = {
        data: [
          { id: "origin", slug: "origin" },
          { id: "next", slug: "next" },
        ],
        page: 1,
        pages: 2,
      };
      communityResponses["next:1"] = {
        data: [
          { id: "q", media_type: "video" },
          { id: "text" },
          { id: "r", has_psychologist_reply: true },
        ],
        page: 1,
        pages: 2,
      };
      communityResponses["next:2"] = { data: [], page: 2, pages: 2 };
      communityResponses["catalog:2"] = {
        data: [
          { id: "next", slug: "next" },
          { id: "third", slug: "third" },
        ],
        page: 2,
        pages: 2,
      };
      communityResponses["third:1"] = {
        data: [{ id: "s", media_items: [{ media_type: "video" }] }],
        page: 1,
        pages: 1,
      };
      mount({ postId: "p" }, { mode: "feed", entries: [{ postId: "p" }, { postId: "q" }] });
    });
    await wait(() => queue.items.length === 2);
    assert.equal(await page.evaluate(() => communityCalls.length), 0);
    await page.evaluate(() => action("next"));
    await wait(() => queue.items.length === 3);
    await page.evaluate(() => action("next"));
    await wait(() => queue.items.length === 4);
    await page.evaluate(() => action("next"));
    await wait(() => queue.items.length === 5);
    await page.evaluate(() => action("next"));
    await wait(() => queue.ended);
    assert.deepEqual(
      (await page.evaluate(snapshot)).items.map((item) => item.id),
      ["a", "b", "c", "d", "e"],
    );
    assert.deepEqual(await page.evaluate(() => calls.map((call) => call.id)), [
      "p",
      "q",
      "r",
      "r",
      "s",
    ]);
    assert.deepEqual(
      await page.evaluate(() =>
        communityCalls.filter((call) => call.kind === "posts").map((call) => call.slug),
      ),
      ["next", "next", "third"],
    );
  });

  test("retries a failed catalog without repeating the current video", async () => {
    const page = getPage();
    await page.evaluate(() => {
      responses["p:1"] = response([video("p", "a")]);
      window.catalogRequest = requestCommunities;
      window.requestCommunities = async () => {
        throw { response: { status: 403 } };
      };
      mount({ postId: "p" }, { mode: "feed", entries: [{ postId: "p" }] });
    });
    await wait(() => queue.error);
    assert.equal((await page.evaluate(snapshot)).ended, false);
    await page.evaluate(() => {
      window.requestCommunities = catalogRequest;
      action("retry");
    });
    await wait(() => queue.ended);
    assert.equal(await page.evaluate(() => calls.length), 1);
  });

  test("skips empty and removed communities and inaccessible candidate videos", async () => {
    const page = getPage();
    await page.evaluate(() => {
      responses["p:1"] = response([video("p", "a")]);
      responses["ready:1"] = response([video("ready", "b")]);
      communityResponses["catalog:1"] = {
        data: ["removed", "empty", "next"].map((slug) => ({ id: slug, slug })),
        page: 1,
        pages: 1,
      };
      communityResponses["empty:1"] = { data: [{ id: "text" }], page: 1, pages: 1 };
      communityResponses["next:1"] = {
        data: ["gone", "ready"].map((id) => ({ id, has_psychologist_reply: true })),
        page: 1,
        pages: 1,
      };
      const requestPosts = requestCommunityPosts;
      window.requestCommunityPosts = async (...args) => {
        if (args[0] === "removed") throw { response: { status: 404 } };
        return requestPosts(...args);
      };
      const request = requestVideos;
      window.requestVideos = async (...args) => {
        if (args[0] === "gone") throw { response: { status: 403 } };
        return request(...args);
      };
      mount({ postId: "p" }, { mode: "feed", entries: [{ postId: "p" }] });
    });
    await wait(() => queue.items.length === 2);
    assert.equal((await page.evaluate(snapshot)).error, false);
    assert.equal(await page.evaluate(() => queue.items[1].id), "b");
  });

  test("does not discover other communities from a professional profile", async () => {
    const page = getPage();
    await page.evaluate(() => {
      responses["p:1"] = response([video("p", "a")]);
      mount({ postId: "p" }, { mode: "profile", entries: [{ postId: "p" }] });
    });
    await wait(() => queue.ended);
    assert.equal(await page.evaluate(() => communityCalls.length), 0);
  });

  test("ignores discovery completed after the viewer unmounts", async () => {
    const page = getPage();
    await page.evaluate(() => {
      responses["p:1"] = response([video("p", "a")]);
      window.requestCommunities = () =>
        new Promise((resolve) => {
          window.resolveCatalog = resolve;
        });
      mount({ postId: "p" }, { mode: "feed", entries: [{ postId: "p" }] });
    });
    await wait(() => Boolean(window.resolveCatalog));
    await page.evaluate(() => {
      unmount();
      resolveCatalog({ data: [{ id: "next", slug: "next" }], page: 1, pages: 1 });
    });
    assert.equal(await page.evaluate(() => communityCalls.length), 0);
  });
};
