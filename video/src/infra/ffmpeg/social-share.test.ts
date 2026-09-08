import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseVideoServiceConfig } from "../../config/env.js";
import {
  buildSocialShareFilter,
  buildSocialShareVideoArguments,
  sanitizeSocialShareMetadata,
} from "./social-share.js";
import {
  assertSafeRemoteVideoSourceUrl,
  isFirstPartyLectumPublicPostMediaUrl,
  parseRemoteVideoRequestOrigin,
  parseRemoteVideoSourceUrl,
  remoteVideoRequestHeaders,
} from "./source-url.js";

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
    assert.match(command, /fontfile='\/usr\/share\/fonts\/truetype\/dejavu\/DejaVuSans\.ttf'/);
    assert.match(command, /drawtext=text='lectum'/);
    assert.match(command, /-c:v libx264/);
    assert.match(command, /-crf 20/);
    assert.match(command, /-preset veryfast/);
    assert.match(command, /-protocol_whitelist file,http,https,tcp,tls,crypto/);
    assert.match(command, /-allowed_extensions ALL/);
    assert.equal(args.at(-1), "/safe/outputs/video.partial.mp4");
    assert.equal(args.includes("-nostdin"), true);
  });

  it("omite allowed_extensions para MP4 publico porque o demuxer mov rejeita a opcao", () => {
    const sourceUrl =
      "https://homolog-api.lectum.com.br/public/files/posts/media/l4gcubbiqb4i6wldhkq0keyk.mp4";
    const args = buildSocialShareVideoArguments({
      config,
      metadata,
      outputPath: "/safe/outputs/video.partial.mp4",
      source: {
        kind: "remote",
        sourceUrl,
      },
    });

    assert.equal(args.includes("-allowed_extensions"), false);
    assert.equal(args.at(args.indexOf("-i") + 1), sourceUrl);
  });

  it("usa entrada local quando o worker baixa MP4 remoto direto antes do render", () => {
    const inputPath = "/safe/inputs/source";
    const args = buildSocialShareVideoArguments({
      config,
      metadata,
      outputPath: "/safe/outputs/video.partial.mp4",
      source: {
        inputPath,
        kind: "file",
      },
    });

    assert.equal(args.includes("-reconnect"), false);
    assert.equal(args.includes("-allowed_extensions"), false);
    assert.equal(args.at(args.indexOf("-i") + 1), inputPath);
    assert.equal(args.at(args.indexOf("-protocol_whitelist") + 1), "file,pipe");
  });

  it("envia Origin e Referer seguros ao ler HLS remoto privado", () => {
    const args = buildSocialShareVideoArguments({
      config,
      metadata,
      outputPath: "/safe/outputs/video.partial.mp4",
      source: {
        kind: "remote",
        requestOrigin: "https://homolog.lectum.com.br",
        sourceUrl:
          "https://customer-code_123.cloudflarestream.com/eyJhbGci.eyJzdWIi.signature/manifest/video.m3u8",
      },
    });
    const headersIndex = args.indexOf("-headers");

    assert.notEqual(headersIndex, -1);
    assert.equal(args[headersIndex + 1]?.includes("Origin: https://homolog.lectum.com.br"), true);
    assert.equal(args[headersIndex + 1]?.includes("Referer: https://homolog.lectum.com.br/"), true);
    assert.ok(headersIndex < args.indexOf("-i"));
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

  it("escapa separadores do filtergraph em textos livres do overlay", () => {
    const filter = buildSocialShareFilter(
      {
        cardLabel: "Pergunta, resposta; Lectum",
        professionalName: "Ana, Martins; Silva",
        professionalRoleLabel: "Psicóloga, supervisora; clínica",
        professionalVerified: false,
        responseText: null,
        sourceText: "Ansiedade, sono; rotina: 'teste' [100%]",
      },
      30,
    );

    assert.match(filter, /Pergunta\\, resposta\\; Lectum/);
    assert.match(filter, /Ana\\, Martins\\; Silva/);
    assert.match(filter, /Psicóloga\\, supervisora\\; clínica/);
    assert.match(filter, /Ansiedade\\, sono\\; rotina\\:/);
    assert.equal(filter.includes("\\'teste\\' \\[100\\%\\]"), true);
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
    assert.equal(
      parseRemoteVideoSourceUrl("https://api.example.com/public/files/posts/media/a.mp4?token=x"),
      null,
    );
    assert.equal(parseRemoteVideoSourceUrl("https://user:pass@example.com/video.mp4"), null);
  });

  it("aceita somente origem HTTPS publica para requisitar video remoto", () => {
    assert.equal(
      parseRemoteVideoRequestOrigin("https://homolog.lectum.com.br"),
      "https://homolog.lectum.com.br",
    );
    assert.equal(
      remoteVideoRequestHeaders("https://homolog.lectum.com.br"),
      "User-Agent: LectumVideoService/1.0\r\nOrigin: https://homolog.lectum.com.br\r\nReferer: https://homolog.lectum.com.br/\r\n",
    );
    assert.equal(remoteVideoRequestHeaders(null), "User-Agent: LectumVideoService/1.0\r\n");
    assert.equal(parseRemoteVideoRequestOrigin("http://homolog.lectum.com.br"), null);
    assert.equal(parseRemoteVideoRequestOrigin("https://localhost"), null);
    assert.equal(parseRemoteVideoRequestOrigin("https://127.0.0.1"), null);
    assert.equal(parseRemoteVideoRequestOrigin("https://homolog.lectum.com.br/path"), null);
    assert.equal(parseRemoteVideoRequestOrigin("https://homolog.lectum.com.br?token=x"), null);
    assert.equal(parseRemoteVideoRequestOrigin("https://homolog.lectum.com.br/\nX-Test: x"), null);
    assert.equal(
      remoteVideoRequestHeaders("https://localhost"),
      "User-Agent: LectumVideoService/1.0\r\n",
    );
  });

  it("preserva midia publica Lectum mesmo quando o DNS do ambiente usa rota privada", async () => {
    const homologUrl = new URL(
      "https://homolog-api.lectum.com.br/public/files/posts/media/l4gcubbiqb4i6wldhkq0keyk.mp4",
    );
    const productionUrl = new URL(
      "https://api.lectum.com.br/public/files/posts/media/l4gcubbiqb4i6wldhkq0keyk.mp4",
    );

    assert.equal(isFirstPartyLectumPublicPostMediaUrl(homologUrl), true);
    assert.equal(isFirstPartyLectumPublicPostMediaUrl(productionUrl), true);
    assert.equal(
      isFirstPartyLectumPublicPostMediaUrl(
        new URL("https://homolog-api.lectum.com.br/internal/video.mp4"),
      ),
      false,
    );
    assert.equal(
      isFirstPartyLectumPublicPostMediaUrl(
        new URL("https://api.example.com/public/files/posts/media/l4gcubbiqb4i6wldhkq0keyk.mp4"),
      ),
      false,
    );
    assert.equal(
      await assertSafeRemoteVideoSourceUrl(
        "https://homolog-api.lectum.com.br/public/files/posts/media/l4gcubbiqb4i6wldhkq0keyk.mp4",
      ),
      "https://homolog-api.lectum.com.br/public/files/posts/media/l4gcubbiqb4i6wldhkq0keyk.mp4",
    );
  });
});
