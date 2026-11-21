import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { runInNewContext } from "node:vm";

const require = createRequire(import.meta.url);
const axiosRequire = createRequire(require.resolve("axios"));
const sentryRequire = createRequire(require.resolve("@sentry/nextjs"));
const coreRequire = createRequire(sentryRequire.resolve("@sentry/bundler-plugin-core"));
const webpackRequire = createRequire(sentryRequire.resolve("@sentry/webpack-plugin"));
const bundleRequire = createRequire(webpackRequire.resolve("@sentry/bundler-plugins/core"));
const globConsumers = [
  ["Sentry legacy plugin", coreRequire],
  ["Sentry current plugin", bundleRequire],
];

// Exercise the installed Next matcher without compiling user input as a glob.
test("Next remote-image matching keeps URL input separate from configured patterns", () => {
  const { hasRemoteMatch } = require("next/dist/shared/lib/match-remote-pattern.js");
  const patterns = [
    { protocol: "https", hostname: "assets.example.invalid", pathname: "/images/**" },
  ];
  const snapshot = JSON.stringify(patterns);
  assert.equal(
    hasRemoteMatch([], patterns, new URL("https://assets.example.invalid/images/photo.png")),
    true,
  );
  for (const url of [
    "https://other.example.invalid/images/photo.png",
    "https://assets.example.invalid.attacker.invalid/images/photo.png",
    "https://assets.example.invalid/+(*a)/photo.png",
    "http://assets.example.invalid/images/photo.png",
  ])
    assert.equal(hasRemoteMatch([], patterns, new URL(url)), false);
  assert.equal(JSON.stringify(patterns), snapshot);
});

test("Sentry Rollup filter uses fixed build patterns rather than candidate filenames", () => {
  const commonjsRequire = createRequire(sentryRequire.resolve("@rollup/plugin-commonjs"));
  const { createFilter } = commonjsRequire("@rollup/pluginutils");
  const filter = createFilter(["**/*.js"], ["**/ignored/**"], { resolve: false });
  assert.equal(filter("src/page.js"), true);
  assert.equal(filter("src/ignored/page.js"), false);
  assert.equal(filter("src/page.css"), false);
  assert.equal(filter("src/+(*a).js"), true);
});

// Actual installed transport and two real loopback servers; no gateway or credential is involved.
test("follow-redirects strips cross-realm custom credentials across origins", {
  timeout: 5000,
}, async (t) => {
  const redirects = axiosRequire("follow-redirects");
  assert.equal(axiosRequire("follow-redirects/package.json").version, "1.16.3");
  let receivedInitial = false;
  let receivedRedirect = false;
  const destination = createServer((request, response) => {
    receivedRedirect = true;
    assert.equal(request.headers["x-lectum-test-sensitive"], undefined);
    assert.equal(request.headers["x-lectum-test-public"], "public-marker");
    response.end("ok");
  });
  destination.listen(0, "127.0.0.1");
  await once(destination, "listening");
  const source = createServer((request, response) => {
    receivedInitial = request.headers["x-lectum-test-sensitive"] === "local-only-marker";
    response.writeHead(302, { location: `http://127.0.0.1:${destination.address().port}/target` });
    response.end();
  });
  source.listen(0, "127.0.0.1");
  await once(source, "listening");
  t.after(async () => {
    for (const server of [source, destination]) {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
  });
  const sensitiveHeaders = runInNewContext('["x-lectum-test-sensitive"]');
  assert.notEqual(Object.getPrototypeOf(sensitiveHeaders), Array.prototype);
  assert.equal(Array.isArray(sensitiveHeaders), true);
  await new Promise((resolve, reject) => {
    const request = redirects.http.get(
      `http://127.0.0.1:${source.address().port}/start`,
      {
        headers: {
          "x-lectum-test-sensitive": "local-only-marker",
          "x-lectum-test-public": "public-marker",
        },
        sensitiveHeaders,
        maxRedirects: 2,
      },
      (response) => {
        response.resume();
        response.once("end", resolve);
      },
    );
    request.setTimeout(2000, () => request.destroy(new Error("Loopback redirect timeout")));
    request.once("error", reject);
  });
  assert.equal(receivedInitial, true);
  assert.equal(receivedRedirect, true);
});

for (const [consumer, resolve] of globConsumers) {
  test(`${consumer}: patched Glob resolves real build patterns, ignores and cancellation`, {
    timeout: 5000,
  }, async (t) => {
    const glob = resolve("glob");
    const minimatchRequire = createRequire(resolve.resolve("glob"));
    const minimatch = minimatchRequire("minimatch");
    assert.equal(resolve("glob/package.json").version, "14.0.4");
    assert.equal(minimatchRequire("minimatch/package.json").version, "11.0.5");
    const directory = await mkdtemp(path.join(tmpdir(), "lectum-dependency-glob-"));
    t.after(() => rm(directory, { recursive: true, force: true }));
    const chunks = path.join(directory, ".next", "static", "chunks");
    await mkdir(chunks, { recursive: true });
    for (const name of ["page.js", "page.js.map", "ignored.js.map", "style.css", "ação.js"])
      await writeFile(path.join(chunks, name), "local regression fixture");
    // Glob syntax uses forward slashes independently of the filesystem platform.
    const patternDirectory = directory.split(path.sep).join("/");
    const maps = await glob.glob(`${patternDirectory}/.next/static/**/*.map`, {
      absolute: true,
      nodir: true,
      ignore: [`${patternDirectory}/**/ignored*`],
    });
    assert.deepEqual(
      maps.map((file) => path.normalize(file)),
      [path.join(chunks, "page.js.map")],
    );
    const rooted = await glob.glob("/.next/static/**/*.{js,map}", {
      root: directory,
      absolute: true,
      nodir: true,
      ignore: ["/.next/static/**/ignored*"],
    });
    assert.deepEqual(
      rooted.map((file) => path.normalize(file)).sort(),
      ["ação.js", "page.js", "page.js.map"].map((name) => path.join(chunks, name)).sort(),
    );
    assert.equal(
      minimatch.minimatch("chunks/page.js.map", "**/*.{js,map}", { optimizationLevel: 2 }),
      true,
    );
    assert.equal(
      minimatch.minimatch("chunks/style.css", "**/*.{js,map}", { optimizationLevel: 2 }),
      false,
    );
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(glob.glob("**/*", { cwd: directory, signal: controller.signal }), {
      name: "AbortError",
    });
  });
}
