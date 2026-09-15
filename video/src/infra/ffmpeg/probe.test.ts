import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { z } from "zod";
import { VideoProcessingError } from "../../domain/jobs/contracts.js";
import { buildRemoteVideoProbeArguments, classifyVideoProbeError } from "./probe.js";
import { ManagedProcessError, managedProcessDiagnosticCode } from "./process.js";

describe("FFprobe error classification contracts", () => {
  for (const fallbackCode of ["invalid_video", "processing_failed"] as const) {
    it(`classifica timeout como falha operacional repetível (${fallbackCode})`, () => {
      const cause = new ManagedProcessError("timeout");
      const error = classifyVideoProbeError(cause, fallbackCode);

      assert.ok(error instanceof VideoProcessingError);
      assert.equal(error.code, "processing_failed");
      assert.equal(error.retryable, true);
      assert.equal(error.message, "processing_failed");
      assert.equal(error.cause, cause);
      assert.equal(managedProcessDiagnosticCode(error), "process_timeout");
    });

    it(`preserva cancelamento sem retry (${fallbackCode})`, () => {
      const cause = new ManagedProcessError("aborted");
      const error = classifyVideoProbeError(cause, fallbackCode);

      assert.equal(error.code, "canceled");
      assert.equal(error.retryable, false);
      assert.equal(error.cause, cause);
      assert.equal(managedProcessDiagnosticCode(error), "process_aborted");
      assert.equal(classifyVideoProbeError(error, fallbackCode), error);
    });

    it(`mantém mídia inválida e limite de saída permanentes (${fallbackCode})`, () => {
      for (const cause of [
        new ManagedProcessError("failed", { diagnosticCode: "ffmpeg_input_decode_failed" }),
        new ManagedProcessError("output_limit"),
        new Error("video_probe_invalid"),
        new Error("timeout"),
      ]) {
        const error = classifyVideoProbeError(cause, fallbackCode);
        assert.equal(error.code, fallbackCode);
        assert.equal(error.retryable, false);
        assert.equal(error.cause, cause);
      }
    });

    it(`mantém erros reais de JSON e schema permanentes (${fallbackCode})`, () => {
      assert.throws(
        () => JSON.parse("{"),
        (cause) => {
          assert.ok(cause instanceof SyntaxError);
          const error = classifyVideoProbeError(cause, fallbackCode);
          assert.equal(error.code, fallbackCode);
          assert.equal(error.retryable, false);
          assert.equal(error.cause, cause);
          return true;
        },
      );
      const parsed = z.object({ streams: z.array(z.object({})) }).safeParse({});
      assert.equal(parsed.success, false);
      const error = classifyVideoProbeError(parsed.error, fallbackCode);
      assert.equal(error.code, fallbackCode);
      assert.equal(error.retryable, false);
      assert.equal(error.cause, parsed.error);
    });
  }

  it("preserva retry e diagnóstico do timeout ao validar a saída", () => {
    const cause = new ManagedProcessError("timeout");
    const error = classifyVideoProbeError(cause);
    const outputError = classifyVideoProbeError(error, "processing_failed");

    assert.equal(outputError.code, "processing_failed");
    assert.equal(outputError.retryable, true);
    assert.equal(outputError, error);
    assert.equal(outputError.cause, cause);
    assert.equal(managedProcessDiagnosticCode(outputError), "process_timeout");
  });

  it("converte mídia inválida na saída em falha de processamento permanente", () => {
    const cause = classifyVideoProbeError(new Error("video_probe_invalid"));
    const error = classifyVideoProbeError(cause, "processing_failed");

    assert.equal(cause.code, "invalid_video");
    assert.equal(error.code, "processing_failed");
    assert.equal(error.retryable, false);
    assert.equal(error.cause, cause);
  });

  it("não reinterpreta abort como timeout por causa encadeada", () => {
    const cause = new ManagedProcessError("aborted", {
      cause: new ManagedProcessError("timeout"),
    });
    const error = classifyVideoProbeError(cause);

    assert.equal(error.code, "canceled");
    assert.equal(error.retryable, false);
    assert.equal(error.cause, cause);
    assert.equal(managedProcessDiagnosticCode(error), "process_aborted");
  });
});

describe("FFprobe remote video command", () => {
  it("envia headers seguros para probe de HLS privado", () => {
    const sourceUrl =
      "https://customer-code_123.cloudflarestream.com/eyJhbGci.eyJzdWIi.signature/manifest/video.m3u8";
    const args = buildRemoteVideoProbeArguments({
      requestOrigin: "https://homolog.lectum.com.br",
      sourceUrl,
    });
    const headersIndex = args.indexOf("-headers");

    assert.notEqual(headersIndex, -1);
    assert.equal(args[headersIndex + 1]?.includes("User-Agent: LectumVideoService/1.0"), true);
    assert.equal(args[headersIndex + 1]?.includes("Origin: https://homolog.lectum.com.br"), true);
    assert.equal(args[headersIndex + 1]?.includes("Referer: https://homolog.lectum.com.br/"), true);
    assert.equal(args.includes("-allowed_extensions"), true);
    assert.equal(args.at(args.indexOf("-tls_verify") + 1), "1");
    assert.equal(args.at(args.indexOf("-protocol_whitelist") + 1), "https,tcp,tls,crypto");
    assert.ok(headersIndex < args.indexOf(sourceUrl));
    assert.equal(args.at(-1), sourceUrl);
  });

  it("envia User-Agent controlado tambem para midia publica sem Origin", () => {
    const sourceUrl =
      "https://homolog-api.lectum.com.br/public/files/posts/media/l4gcubbiqb4i6wldhkq0keyk.mp4";
    const args = buildRemoteVideoProbeArguments(sourceUrl);
    const headersIndex = args.indexOf("-headers");

    assert.notEqual(headersIndex, -1);
    assert.equal(args[headersIndex + 1], "User-Agent: LectumVideoService/1.0\r\n");
    assert.ok(headersIndex < args.indexOf(sourceUrl));
    assert.equal(args.at(-1), sourceUrl);
    assert.equal(args.includes("-allowed_extensions"), false);
  });
});
