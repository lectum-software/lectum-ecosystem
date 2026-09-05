import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseVideoServiceConfig } from "../../config/env.js";
import {
  buildSocialShareFilter,
  buildSocialShareVideoArguments,
  sanitizeSocialShareMetadata,
} from "./social-share.js";
import { parseRemoteVideoSourceUrl } from "./source-url.js";

const config = parseVideoServiceConfig({
  NODE_ENV: "test",
  REDIS_URL: "redis://localhost:6379/0",
  VIDEO_SERVICE_API_KEY: "x".repeat(32),
});

const metadata = {
  cardLabel: "Perguntaram na Lectum",
  professionalName: "Ana Martins",
  professionalRoleLabel: "Psicóloga",
  professionalVerified: true,
  responseText: "Resposta profissional",
  sourceText: "Como lidar com ansiedade antes de dormir?",
};

describe("FFmpeg social share command", () => {
  it("gera MP4 9:16 de alta qualidade sem shell e com overlay Lectum", () => {
    const args = buildSocialShareVideoArguments({
      config,
      metadata,
      outputPath: "/safe/outputs/video.partial.mp4",
      source: {
        kind: "remote",
        sourceUrl:
          "https://customer-code_123.cloudflarestream.com/eyJhbGci.eyJzdWIi.signature/manifest/video.m3u8",
      },
    });
    const command = args.join(" ");

    assert.match(command, /-filter_complex/);
    assert.match(command, /scale=1080:1920/);
    assert.match(command, /drawtext=text='Perguntaram na Lectum'/);
    assert.match(command, /drawtext=text='lectum'/);
    assert.match(command, /-c:v libx264/);
    assert.match(command, /-crf 18/);
    assert.match(command, /-preset slow/);
    assert.match(command, /-protocol_whitelist file,http,https,tcp,tls,crypto/);
    assert.match(command, /-allowed_extensions ALL/);
    assert.equal(args.at(-1), "/safe/outputs/video.partial.mp4");
    assert.equal(args.includes("-nostdin"), true);
  });

  it("sanitiza textos do overlay antes de montar o filtro", () => {
    const sanitized = sanitizeSocialShareMetadata({
      cardLabel: "  ",
      professionalName: " ".repeat(4),
      professionalRoleLabel: "Psicólogo(a)",
      professionalVerified: false,
      responseText: null,
      sourceText: "uma pergunta ".repeat(40),
    });

    assert.equal(sanitized.cardLabel, "Perguntaram na Lectum");
    assert.equal(sanitized.professionalName, "Profissional Lectum");
    assert.equal(sanitized.responseText, null);
    assert.equal(sanitized.sourceText.length, 180);
    assert.doesNotThrow(() => buildSocialShareFilter(sanitized, 30));
  });

  it("aceita somente origens HTTPS de video e rejeita hosts locais ou caminhos inesperados", () => {
    assert.ok(
      parseRemoteVideoSourceUrl(
        "https://customer-code_123.cloudflarestream.com/eyJhbGci.eyJzdWIi.signature/manifest/video.m3u8",
      ),
    );
    assert.ok(parseRemoteVideoSourceUrl("https://api.example.com/public/files/posts/media/a.mp4"));
    assert.equal(
      parseRemoteVideoSourceUrl("http://api.example.com/public/files/posts/media/a.mp4"),
      null,
    );
    assert.equal(parseRemoteVideoSourceUrl("https://api.example.com/internal/secret"), null);
    assert.equal(parseRemoteVideoSourceUrl("https://user:pass@example.com/video.mp4"), null);
  });
});
