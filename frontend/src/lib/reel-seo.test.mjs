import "../../scripts/register-source-modules.mjs";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { createRequire, registerHooks } from "node:module";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

registerHooks({
  resolve(specifier, context, next) {
    return next(
      /^next\/(link|navigation)$/.test(specifier) ? `${specifier}.js` : specifier,
      context,
    );
  },
});
const { getPublicReel, reelMetadata, reelVideoObject, reelPlaybackUrl } = await import(
  "./reel-seo.ts"
);
const { PublicReelPage } = await import("../components/community/public-reel-page.tsx");
const { PublicTranscript } = await import("../components/video-captions/public-transcript.tsx");

test("both public reel entry routes mount the interactive host around the server fallback", () => {
  for (const suffix of ["page.tsx", "resposta/[replyId]/page.tsx"]) {
    const source = readFileSync(
      new URL(`../app/comunidades/[slug]/publicacao/[id]/${suffix}`, import.meta.url),
      "utf8",
    );
    assert.match(
      source,
      /<ContentVideoHost directLink>\s*<PublicReelPage[^>]+\/>\s*<\/ContentVideoHost>/,
    );
  }
});

test("post SSR includes every public transcript in JSON-LD without new visible text", async (t) => {
  const transcripts = Array.from({ length: 103 }, (_, index) => ({
    video_id: `v${index}`,
    url: `/comunidades/general/publicacao/post/resposta/r${index}`,
    title: `Video ${index}`,
    text: index === 102 ? "</script><script>unsafe</script>" : `Transcript ${index}`,
    language: "pt",
    reviewed: false,
  }));
  setup(t, { captions: null, transcripts });
  const html = renderToStaticMarkup(await PublicTranscript({ id: "post", slug: "general" }));
  const data = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  assert.equal(data["@graph"].length, 103);
  assert.equal(data["@graph"][102].transcript, transcripts[102].text);
  assert.match(data["@graph"][102].url, /resposta\/r102$/);
  assert.doesNotMatch(html, /<p|<section|<details|<script>unsafe/);
});
test("post SSR preserves existing first-video disclosure with an older backend", async (t) => {
  setup(t, { captions: { reviewed: false, cues: [{ text: "Existing transcript" }] } });
  const html = renderToStaticMarkup(await PublicTranscript({ id: "post", slug: "general" }));
  assert.match(html, /Ver transcrição/);
  assert.match(html, /Existing transcript/);
  assert.doesNotMatch(html, /application\/ld\+json/);
});
const fixture = {
  canonical_path: "/comunidades/geral/publicacao/post1?reel=video1&reelPost=post1&reelReply=reply1",
  post_path: "/comunidades/geral/publicacao/post1",
  video_id: "video1",
  reply_id: "reply1",
  post_title: "Titulo original",
  post_content: "Relato original sem identidade adicionada.",
  video_title: "Resposta em video",
  video_content: "Texto da resposta.",
  professional_name: "Profissional",
  published_at: "2026-11-23T12:00:00.000Z",
  hls_url: "https://api.lectum.com.br/public/files/video.mp4",
  content_url: "https://api.lectum.com.br/public/files/video.mp4",
  thumbnail_path: "/api/public/seo/community-post/geral/post1/videos/video1/thumbnail",
  thumbnail_url: "https://api.lectum.com.br/public/files/poster.jpg",
  captions: {
    reviewed: false,
    language: "pt",
    cues: [{ start: 0, end: 2, text: "Transcricao original." }],
  },
};
function setup(t, data = fixture, status = 200) {
  const before = process.env.NEXT_PUBLIC_API_URL;
  process.env.NEXT_PUBLIC_API_URL = "https://api.lectum.com.br";
  t.after(() => {
    if (before === undefined) delete process.env.NEXT_PUBLIC_API_URL;
    else process.env.NEXT_PUBLIC_API_URL = before;
  });
  t.mock.method(globalThis, "fetch", async (url) =>
    Response.json(
      String(url).endsWith("/metadata")
        ? { success: true, data: { settings: [] } }
        : { success: status === 200, data },
      { status },
    ),
  );
}
test("watch metadata uses exact video canonical and original context", async (t) => {
  setup(t);
  const data = await getPublicReel("geral", "post1", { reel: "video1", reelReply: "reply1" });
  const metadata = await reelMetadata(data);
  assert.equal(
    new URL(metadata.alternates.canonical).search,
    new URL(fixture.canonical_path, "https://example.test").search,
  );
  assert.equal(metadata.description, fixture.post_content);
  assert.equal(metadata.openGraph.type, "video.other");
  assert.equal(metadata.robots.index, true);
  assert.equal(
    metadata.openGraph.images[0].url,
    `https://api.lectum.com.br${fixture.thumbnail_path}`,
  );
  assert.equal(reelVideoObject(data).transcript, "Transcricao original.");
  assert.equal(reelVideoObject({ ...data, content_url: null }).contentUrl, undefined);
});
test("invalid selection never falls back to another video", async (t) => {
  setup(t);
  for (const query of [
    { reel: ["video1", "video2"] },
    { reel: "<script>" },
    { reel: "video1", reelPost: "other" },
    { reel: "video1", reelReply: "other" },
    { reel: "video2" },
  ])
    assert.equal(await getPublicReel("geral", "post1", query), null);
  assert.equal((await reelMetadata(null)).robots.index, false);
});
test("missing media is unavailable and upstream failure is not an indexable fallback", async (t) => {
  setup(t, null, 404);
  assert.equal(await getPublicReel("geral", "post1", { reel: "video1" }), null);
  globalThis.fetch = async () => Response.json({}, { status: 503 });
  await assert.rejects(getPublicReel("geral", "post1", { reel: "video1" }));
});
test("SSR includes video and escaped structured context without a second presentation", async (t) => {
  setup(t, {
    ...fixture,
    post_content: "<script>original</script>",
    captions: {
      ...fixture.captions,
      cues: [{ start: 0, end: 1, text: "</script><script>alert(1)</script>" }],
    },
  });
  const element = await PublicReelPage({
    slug: "geral",
    id: "post1",
    query: { reel: "video1", reelPost: "post1", reelReply: "reply1" },
  });
  const html = renderToStaticMarkup(element);
  assert.match(html, /<video[^>]+src="https:\/\/api.lectum.com.br\/public\/files\/video.mp4"/);
  assert.doesNotMatch(html, /<video[^>]*\bcontrols\b/);
  assert.match(html, /role="status"/);
  assert.doesNotMatch(html, /<h[12]|<section|<p[ >]|Abrir Reels|Transcrição automática/);
  assert.match(html, /Voltar à publicação/);
  assert.match(html, /application\/ld\+json/);
  const schema = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  assert.equal(schema.description, "<script>original</script>");
  assert.equal(schema.transcript, "</script><script>alert(1)</script>");
  assert.doesNotMatch(html, /<script>alert\(1\)/);
  assert.match(html, /\\u003c\/script>/);
});
test("schema requires real thumbnail and date, captions are optional", (t) => {
  setup(t);
  assert.equal(reelVideoObject({ ...fixture, thumbnail_path: null }), null);
  assert.equal(reelVideoObject({ ...fixture, published_at: "bad" }), null);
  assert.equal(reelVideoObject({ ...fixture, captions: null }).transcript, undefined);
  assert.equal(reelPlaybackUrl("javascript:alert(1)"), undefined);
  assert.equal(reelPlaybackUrl("https://evil.example/video.mp4"), undefined);
  assert.ok(
    reelPlaybackUrl("https://customer-test.cloudflarestream.com/token/manifest/video.m3u8"),
  );
});

test("server Reel fills the viewport without visible transcript on mobile and desktop", {
  skip: !process.env.PLAYWRIGHT_MODULE,
}, async (t) => {
  setup(t);
  const html = renderToStaticMarkup(
    await PublicReelPage({
      slug: "geral",
      id: "post1",
      query: { reel: "video1", reelPost: "post1", reelReply: "reply1" },
    }),
  );
  const cssFolder = new URL("../../.next/static/css/", import.meta.url);
  const css = readdirSync(cssFolder)
    .filter((file) => file.endsWith(".css"))
    .map((file) => readFileSync(new URL(file, cssFolder), "utf8"))
    .join("\n");
  const video = readFileSync(new URL("../../public/videos/verification-v1.mp4", import.meta.url));
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE);
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    for (const width of [390, 1440]) {
      const page = await browser.newPage({
        viewport: { width, height: 844 },
        javaScriptEnabled: false,
      });
      await page.route("https://api.lectum.com.br/**", (route) => {
        if (route.request().url().endsWith("video.mp4")) {
          const range = /^bytes=(\d+)-(\d*)$/.exec(route.request().headers().range ?? "");
          const start = range ? Number(range[1]) : 0;
          const end = range?.[2] ? Math.min(Number(range[2]), video.length - 1) : video.length - 1;
          return route.fulfill({
            status: range ? 206 : 200,
            contentType: "video/mp4",
            body: video.subarray(start, end + 1),
            headers: {
              "Accept-Ranges": "bytes",
              ...(range ? { "Content-Range": `bytes ${start}-${end}/${video.length}` } : {}),
            },
          });
        }
        return route.abort();
      });
      await page.setContent(
        `<html lang="pt-BR"><head><style>${css}</style></head><body>${html}</body></html>`,
      );
      await page.waitForFunction(() => document.querySelector("video").readyState >= 2);
      await page.locator("video").evaluate((el) => {
        el.currentTime = 2;
      });
      // Browser RAF polling is disabled with JavaScript; poll from the test process.
      let frameReady = false;
      for (let attempt = 0; attempt < 50 && !frameReady; attempt++) {
        frameReady = await page
          .locator("video")
          .evaluate((el) => el.readyState >= 2 && !el.seeking && el.currentTime >= 2);
        if (!frameReady) await new Promise((resolve) => setTimeout(resolve, 100));
      }
      assert.equal(frameReady, true);
      assert.equal(await page.locator("video").count(), 1);
      assert.equal(await page.locator("h1, h2, section, p").count(), 0);
      assert.equal(await page.getByText("Transcricao original.", { exact: true }).count(), 0);
      const schema = await page.locator('script[type="application/ld+json"]').textContent();
      assert.equal(JSON.parse(schema).transcript, "Transcricao original.");
      const bounds = await page.locator("video").boundingBox();
      assert.equal(bounds.width, width);
      assert.equal(bounds.height, 844);
      assert.equal(bounds.y, 0);
      assert.equal(
        await page.getByRole("link", { name: "Voltar à publicação" }).getAttribute("href"),
        fixture.post_path,
      );
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        true,
      );
      assert.ok(await page.locator("video").evaluate((el) => el.videoWidth > 0));
      if (process.env.LECTUM_QA_SCREENSHOTS)
        await page.screenshot({
          path: `${process.env.LECTUM_QA_SCREENSHOTS}/reel-watch-${width}.png`,
          fullPage: true,
        });
      await page.close();
    }
  } finally {
    await browser.close();
  }
});
