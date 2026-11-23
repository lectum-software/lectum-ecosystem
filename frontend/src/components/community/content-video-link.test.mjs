import assert from "node:assert/strict";
import { test } from "node:test";
import {
  contentVideoHref,
  readContentVideoLink,
  withoutContentVideoLink,
} from "./content-video-link.ts";

test("public watch navigation keeps the current video and its owning post together", () => {
  const href = contentVideoHref("/comunidades/old/publicacao/p", {
    postId: "new",
    videoId: "v",
    communitySlug: "geral",
  });
  assert.equal(new URL(href, "https://example.test").pathname, "/comunidades/geral/publicacao/new");
  assert.equal(readContentVideoLink(href).postId, "new");
});

test("shared link restores the exact post video without embedding a media URL", () => {
  const href = contentVideoHref("/comunidades/geral/publicacao/p", {
    postId: "p",
    videoId: "post:p:m2",
  });
  assert.deepEqual(readContentVideoLink(href), {
    postId: "p",
    videoId: "post:p:m2",
    replyId: null,
  });
  assert.notEqual(
    href,
    contentVideoHref("/comunidades/geral/publicacao/p", { postId: "p", videoId: "post:p:m1" }),
  );
});

test("reply link survives external opening and closes without losing other parameters", () => {
  const href = contentVideoHref("/comunidades/geral/publicacao/p?focusReplyId=r#reply-r", {
    postId: "p",
    videoId: "reply:r",
    replyId: "r",
  });
  assert.deepEqual(readContentVideoLink(`https://lectum.example${href}`), {
    postId: "p",
    videoId: "reply:r",
    replyId: "r",
  });
  assert.equal(withoutContentVideoLink(href), "/comunidades/geral/publicacao/p?focusReplyId=r");
});

test("changing the active Reel removes the previous reply and invalid links never open", () => {
  const href = contentVideoHref("/?reel=old&reelPost=p&reelReply=r&tab=videos", {
    postId: "q",
    videoId: "new",
  });
  assert.deepEqual(readContentVideoLink(href), { postId: "q", videoId: "new", replyId: null });
  assert.equal(withoutContentVideoLink(href), "/?tab=videos");
  for (const url of [
    "/",
    "/?reel=v",
    "/?reel=v&reelPost=p&reelReply=",
    "/?reel=%3Cscript%3E&reelPost=p",
  ])
    assert.equal(readContentVideoLink(url), null);
});
