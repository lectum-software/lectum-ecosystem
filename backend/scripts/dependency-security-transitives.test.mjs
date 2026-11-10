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
const twilioRequire = createRequire(require.resolve("twilio"));
const axiosRequire = createRequire(twilioRequire.resolve("axios"));
const mailRequire = createRequire(require.resolve("nodemailer-express-handlebars"));
const viewRequire = createRequire(mailRequire.resolve("express-handlebars"));
const globConsumers = [["mail templates", viewRequire]];

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
    const maps = await glob.glob(path.join(directory, ".next/static/**/*.map"), {
      absolute: true,
      nodir: true,
      ignore: [path.join(directory, "**/ignored*")],
    });
    assert.deepEqual(maps, [path.join(chunks, "page.js.map")]);
    const rooted = await glob.glob("/.next/static/**/*.{js,map}", {
      root: directory,
      absolute: true,
      nodir: true,
      ignore: ["/.next/static/**/ignored*"],
    });
    assert.deepEqual(
      rooted.sort(),
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

test("mail template engine renders real layout and partial files after its upstream patch", {
  timeout: 5000,
}, async (t) => {
  const { create } = mailRequire("express-handlebars");
  assert.equal(mailRequire("express-handlebars/package.json").version, "9.0.4");
  const directory = await mkdtemp(path.join(tmpdir(), "lectum-dependency-template-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(path.join(directory, "layouts"));
  await mkdir(path.join(directory, "partials"));
  await writeFile(path.join(directory, "layouts", "main.hbs"), "<main>{{{body}}}</main>");
  await writeFile(path.join(directory, "partials", "heading.hbs"), "<h1>{{title}}</h1>");
  const file = path.join(directory, "message.hbs");
  await writeFile(file, "{{> heading}}<p>{{content}}</p>");
  const engine = create({
    extname: ".hbs",
    defaultLayout: "main",
    layoutsDir: path.join(directory, "layouts"),
    partialsDir: path.join(directory, "partials"),
  });
  const html = await engine.renderView(file, { title: "Lectum", content: "<safe>" });
  assert.equal(html, "<main><h1>Lectum</h1><p>&lt;safe&gt;</p></main>");
});
