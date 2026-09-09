import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseVideoServiceConfig } from "../../config/env.js";
import {
  buildSocialShareFilter,
  buildSocialShareVideoArguments,
  sanitizeSocialShareMetadata,
} from "./social-share.js";
import { resolveSocialShareAssetFile } from "./social-share-assets.js";
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
  cardLabel: "Respondido na Lectum",
  professionalName: "Ana Martins",
  professionalRoleLabel: "Psicóloga",
  professionalVerified: true,
  responseText: "Resposta profissional",
  sourceText: "Como lidar com ansiedade antes de dormir?",
};

describe("FFmpeg social share command", () => {
  it("gera MP4 9:16 de alta qualidade sem shell e com arte Lectum", () => {
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
    assert.match(command, /crop=1080:1920/);
    assert.match(command, /-loop 1 -i .*lectum-symbol-white\.png/);
    assert.match(command, /-loop 1 -i .*verified-badge\.png/);
    assert.match(command, /overlay=x=329:y=274:format=auto/);
    assert.match(command, /scale=26:24:flags=lanczos\[verified_badge\]/);
    assert.match(command, /overlay=x=628:y=1405:format=auto/);
    assert.equal(command.includes("eq="), false);
    assert.equal(command.includes("fps="), false);
    assert.equal(command.includes("[v0],drawbox"), false);
    assert.equal(command.includes("gblur="), false);
    assert.match(command, /drawbox=x=110:y=274:w=860:h=64:color=0x308ce8@0\.98:t=fill/);
    assert.match(command, /drawbox=x=110:y=338:w=860:h=242:color=white@0\.98:t=fill/);
    assert.match(command, /drawtext=text='Respondido na Lectum'/);
    assert.match(command, /drawtext=text='Respondido na Lectum':.*:x=371:y=274:fontsize=38/);
    assert.doesNotMatch(command, /drawtext=text='✓'/);
    assert.match(command, /drawtext=text='Psicóloga':.*:x=427:y=1440:fontsize=21/);
    assert.match(command, /fontfile='\/usr\/share\/fonts\/truetype\/manrope\/Manrope-Bold\.ttf'/);
    assert.match(command, /fontfile='\/usr\/share\/fonts\/truetype\/manrope\/Manrope-Medium\.ttf'/);
    assert.doesNotMatch(command, /drawtext=text='lectum'/);
    assert.match(command, /-c:v libx264/);
    assert.match(command, /-crf 20/);
    assert.match(command, /-preset veryfast/);
    assert.match(command, /-protocol_whitelist file,http,https,tcp,tls,crypto/);
    assert.match(command, /-allowed_extensions ALL/);
    assert.equal(args.at(-1), "/safe/outputs/video.partial.mp4");
    assert.equal(args.includes("-nostdin"), true);
    assert.equal(args.at(args.indexOf("-r") + 1), "30");
  });

  it("oferece filtergraph portatil sem filtros secundarios do fundo", () => {
    const args = buildSocialShareVideoArguments(
      {
        config,
        metadata,
        outputPath: "/safe/outputs/video.partial.mp4",
        source: {
          inputPath: "/safe/inputs/source",
          kind: "file",
        },
      },
      { filterMode: "portable", fontFile: null, logoFile: null, verifiedBadgeFile: null },
    );
    const command = args.join(" ");

    assert.match(command, /pad=1080:1920:\(ow-iw\)\/2:\(oh-ih\)\/2:color=black/);
    assert.match(command, /\[v0\]drawbox=/);
    assert.equal(command.includes("overlay="), false);
    assert.equal(command.includes("crop="), false);
    assert.equal(command.includes("eq="), false);
    assert.equal(command.includes("fps="), false);
    assert.equal(command.includes("gblur="), false);
    assert.match(command, /drawtext=text='Respondido na Lectum'/);
  });

  it("permite renderizar overlay sem fontfile explicito quando a imagem nao tem a fonte Debian", () => {
    const args = buildSocialShareVideoArguments(
      {
        config,
        metadata,
        outputPath: "/safe/outputs/video.partial.mp4",
        source: {
          inputPath: "/safe/inputs/source",
          kind: "file",
        },
      },
      { fontFile: null },
    );
    const command = args.join(" ");

    assert.match(command, /drawtext=text='Respondido na Lectum'/);
    assert.equal(command.includes("fontfile="), false);
  });

  it("resolve assets reais da marca usados no overlay social", () => {
    assert.match(
      resolveSocialShareAssetFile("lectum-symbol-white.png") ?? "",
      /lectum-symbol-white\.png$/,
    );
    assert.match(resolveSocialShareAssetFile("verified-badge.png") ?? "", /verified-badge\.png$/);
    assert.equal(resolveSocialShareAssetFile("missing-social-asset.png"), null);
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

    assert.equal(sanitized.cardLabel, "Respondido na Lectum");
    assert.equal(sanitized.professionalName, "Profissional Lectum");
    assert.equal(sanitized.responseText, null);
    assert.equal(sanitized.sourceText.length, 180);
    assert.doesNotThrow(() => buildSocialShareFilter(sanitized, 30));
  });

  it("compacta perguntas longas antes de vazar para fora da caixa", () => {
    const filter = buildSocialShareFilter(
      {
        ...metadata,
        sourceText:
          "O que fazer qdo a crise de ansiedade bate forte? E trouxer a sensacao de falta de ar?",
      },
      30,
    );

    assert.match(filter, /drawtext=text='ansiedade bate forte\? E trouxer':.*:fontsize=44/);
    assert.match(filter, /drawtext=text='a sensacao de falta de ar\?':.*:fontsize=44/);
    assert.doesNotMatch(filter, /drawtext=text='ansiedade bate forte\? E trouxer':.*:fontsize=50/);
    assert.doesNotMatch(filter, /drawtext=text='trouxer a sensacao de falta…'/);
  });

  it("normaliza o rótulo legado de pergunta para resposta", () => {
    const sanitized = sanitizeSocialShareMetadata({
      ...metadata,
      cardLabel: "Perguntaram na Lectum",
    });

    assert.equal(sanitized.cardLabel, "Respondido na Lectum");
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
    assert.equal(filter.includes("\\'teste\\'"), true);
    assert.equal(filter.includes("\\[100\\%\\]"), true);
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
