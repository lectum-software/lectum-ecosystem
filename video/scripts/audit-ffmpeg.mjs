// Reproducible security checks with a cached FFmpeg image, no external network,
// disposable media/certificate and current compiled video modules mounted read-only.
import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer as createHttpServer } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { quoteDrawTextValue } from "../dist/infra/ffmpeg/drawtext.js";
import { buildRemoteVideoProbeArguments } from "../dist/infra/ffmpeg/probe.js";
import { fetchRemoteVideo } from "../dist/infra/ffmpeg/remote-fetch.js";
import { parseRemoteVideoSourceUrl } from "../dist/infra/ffmpeg/source-url.js";

const execFile = promisify(execFileCallback);
const texts = [
  "D'água: 100% [ok], teste; fim",
  "Barra \\ : %{pts} e %{localtime}",
  "x':textfile=/audit/source.mp4:a='",
  "[in];movie=/audit/source.mp4[out]",
];

const inContainer = async () => {
  let checks = 0;
  const verify = (label) => {
    checks += 1;
    console.info(`[video-ffmpeg-audit] OK ${label}`);
  };
  for (const [index, value] of texts.entries()) {
    const render = async (textOption) => {
      const { stdout } = await execFile(
        "ffmpeg",
        [
          "-v",
          "error",
          "-f",
          "lavfi",
          "-i",
          "color=s=600x200:d=0.1",
          "-vf",
          `drawtext=${textOption}:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:expansion=none:fontsize=20:fontcolor=white:x=10:y=10`,
          "-frames:v",
          "1",
          "-f",
          "framemd5",
          "-",
        ],
        { timeout: 10_000 },
      );
      return stdout;
    };
    assert.equal(
      await render(`text=${quoteDrawTextValue(value)}`),
      await render(`textfile=/audit/text-${index}.txt`),
    );
    verify(`drawtext ${index + 1}: pixels idênticos ao texto literal via textfile`);
  }

  const source = await readFile("/audit/source.mp4");
  const segment = await readFile("/audit/segment.ts");
  const certificate = await readFile("/audit/cert.pem");
  const key = await readFile("/audit/key.pem");
  let httpsReads = 0;
  let privateSegmentReads = 0;
  const privateServer = createHttpServer((_request, response) => {
    privateSegmentReads += 1;
    response.writeHead(200, { "Content-Type": "video/mp2t" });
    response.end(segment);
  });
  const server = createHttpsServer({ cert: certificate, key }, (request, response) => {
    httpsReads += 1;
    if (request.url.endsWith("/redirect.mp4")) {
      response.writeHead(302, { Location: "http://127.0.0.1:8080/segment.ts" });
      response.end();
      return;
    }
    if (request.url.endsWith(".m3u8")) {
      response.writeHead(200, { "Content-Type": "application/vnd.apple.mpegurl" });
      response.end(
        "#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:1\n#EXT-X-MEDIA-SEQUENCE:0\n#EXTINF:1,\nhttp://127.0.0.1:8080/segment.ts\n#EXT-X-ENDLIST\n",
      );
      return;
    }
    response.writeHead(200, { "Content-Length": source.length, "Content-Type": "video/mp4" });
    response.end(source);
  });
  privateServer.listen(8080, "127.0.0.1");
  server.listen(443, "127.0.0.1");
  await Promise.all([once(privateServer, "listening"), once(server, "listening")]);
  const base = "https://api.lectum.com.br/public/files/posts/media";
  try {
    const downloaded = await fetchRemoteVideo(`${base}/source.mp4`);
    assert.deepEqual(Buffer.from(await downloaded.arrayBuffer()), source);
    verify("HTTPS nativo valida CA/hostname e preserva exceção first-party privada");

    const beforeDns = httpsReads;
    await assert.rejects(fetchRemoteVideo("https://media.example.com/source.mp4"));
    assert.equal(httpsReads, beforeDns);
    verify("DNS real no socket recusa host externo resolvido para loopback");

    await assert.rejects(fetchRemoteVideo(`${base}/redirect.mp4`));
    assert.equal(privateSegmentReads, 0);
    await assert.rejects(
      fetchRemoteVideo("https://homolog-api.lectum.com.br/public/files/posts/media/source.mp4"),
    );
    verify("HTTPS nativo recusa redirects e certificado de outro hostname");

    const probeArgs = buildRemoteVideoProbeArguments(`${base}/source.mp4`);
    await assert.rejects(execFile("ffprobe", probeArgs, { timeout: 10_000 }));
    await execFile("ffprobe", ["-ca_file", "/audit/cert.pem", ...probeArgs], { timeout: 10_000 });
    await assert.rejects(
      execFile(
        "ffprobe",
        [
          "-ca_file",
          "/audit/cert.pem",
          ...buildRemoteVideoProbeArguments(
            "https://homolog-api.lectum.com.br/public/files/posts/media/source.mp4",
          ),
        ],
        { timeout: 10_000 },
      ),
    );
    verify("FFprobe recusa CA não confiável; CA explícita permite probe real");

    const playlistUrl = `${base}/evil.m3u8`;
    assert.equal(parseRemoteVideoSourceUrl(playlistUrl), null);
    const safeArgs = buildRemoteVideoProbeArguments(playlistUrl);
    const legacyArgs = [...safeArgs];
    legacyArgs[legacyArgs.indexOf("-protocol_whitelist") + 1] = "file,http,https,tcp,tls,crypto";
    await execFile("ffprobe", ["-ca_file", "/audit/cert.pem", ...legacyArgs], { timeout: 10_000 });
    assert.ok(privateSegmentReads > 0);
    privateSegmentReads = 0;
    await assert.rejects(
      execFile("ffprobe", ["-ca_file", "/audit/cert.pem", ...safeArgs], { timeout: 10_000 }),
    );
    assert.equal(privateSegmentReads, 0);
    verify("política antiga de protocolos alcançava segmento privado; política nova recusa");
    console.info(
      `[video-ffmpeg-audit] ${checks} verificações passaram; Stream externo não validado.`,
    );
  } finally {
    server.closeAllConnections();
    privateServer.closeAllConnections();
    await Promise.all(
      [server, privateServer].map((item) => new Promise((resolve) => item.close(resolve))),
    );
  }
};

if (process.argv[2] === "--isolated-container") {
  await inContainer();
} else {
  const directory = await mkdtemp(path.join(tmpdir(), "lectum-video-ffmpeg-audit-"));
  const container = `lectum-video-ffmpeg-audit-${randomUUID()}`;
  const videoRoot = fileURLToPath(new URL("..", import.meta.url));
  try {
    for (const [index, text] of texts.entries()) {
      await writeFile(path.join(directory, `text-${index}.txt`), text);
    }
    await execFile("openssl", [
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-days",
      "1",
      "-keyout",
      path.join(directory, "key.pem"),
      "-out",
      path.join(directory, "cert.pem"),
      "-subj",
      "/CN=api.lectum.com.br",
      "-addext",
      "subjectAltName=DNS:api.lectum.com.br",
    ]);
    await execFile("ffmpeg", [
      "-v",
      "error",
      "-f",
      "lavfi",
      "-i",
      "testsrc2=s=320x240:r=24:d=1",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      path.join(directory, "source.mp4"),
    ]);
    await execFile("ffmpeg", [
      "-v",
      "error",
      "-i",
      path.join(directory, "source.mp4"),
      "-c",
      "copy",
      "-f",
      "mpegts",
      path.join(directory, "segment.ts"),
    ]);
    const { stdout } = await execFile(
      "docker",
      [
        "run",
        "--pull=never",
        "--rm",
        "--name",
        container,
        "--label",
        "lectum.audit=disposable-task178",
        "--network",
        "none",
        "--read-only",
        "--cap-drop",
        "ALL",
        "--security-opt",
        "no-new-privileges",
        "--user",
        "0:0",
        "--add-host",
        "api.lectum.com.br:127.0.0.1",
        "--add-host",
        "homolog-api.lectum.com.br:127.0.0.1",
        "--add-host",
        "media.example.com:127.0.0.1",
        "-e",
        "NODE_EXTRA_CA_CERTS=/audit/cert.pem",
        "-v",
        `${directory}:/audit:ro`,
        "-v",
        `${path.join(videoRoot, "dist")}:/app/dist:ro`,
        "-v",
        `${fileURLToPath(import.meta.url)}:/app/scripts/audit-ffmpeg.mjs:ro`,
        "--entrypoint",
        "node",
        "lectum-video-e2e-final-worker:latest",
        "/app/scripts/audit-ffmpeg.mjs",
        "--isolated-container",
      ],
      { timeout: 120_000 },
    );
    process.stdout.write(stdout);
  } finally {
    await execFile("docker", ["rm", "-f", container]).catch(() => undefined);
    await rm(directory, { force: true, recursive: true });
  }
}
