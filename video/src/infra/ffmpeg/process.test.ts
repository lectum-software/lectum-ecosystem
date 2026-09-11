import assert from "node:assert/strict";
import { access, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import {
  classifyManagedProcessDiagnostic,
  ManagedProcessError,
  managedProcessDiagnosticCode,
  runManagedProcess,
} from "./process.js";

describe("managed FFmpeg process diagnostics", () => {
  it("não inicia um processo quando o job já está cancelado", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "lectum-video-preabort-"));
    const marker = path.join(directory, "must-not-exist");
    try {
      await assert.rejects(
        runManagedProcess({
          args: ["-e", "require('node:fs').writeFileSync(process.argv[1], 'started')", marker],
          command: process.execPath,
          signal: AbortSignal.abort(),
          timeoutMs: 5000,
        }),
        (error) => error instanceof ManagedProcessError && error.kind === "aborted",
      );
      await assert.rejects(access(marker));
    } finally {
      await rm(directory, { force: true, recursive: true });
    }
  });

  it("encerra processos reais por prazo e limite de saída", async () => {
    await assert.rejects(
      runManagedProcess({
        args: ["-e", "setInterval(() => {}, 1000)"],
        command: process.execPath,
        timeoutMs: 100,
      }),
      (error) => error instanceof ManagedProcessError && error.kind === "timeout",
    );
    await assert.rejects(
      runManagedProcess({
        args: ["-e", "process.stdout.write('x'.repeat(10000))"],
        command: process.execPath,
        maxStdoutBytes: 100,
        timeoutMs: 5000,
      }),
      (error) => error instanceof ManagedProcessError && error.kind === "output_limit",
    );
  });
  it("classifica falhas conhecidas sem expor stderr bruto", () => {
    assert.equal(
      classifyManagedProcessDiagnostic("No such filter: 'drawtext'"),
      "ffmpeg_filter_drawtext_unavailable",
    );
    assert.equal(
      classifyManagedProcessDiagnostic("No such filter: 'crop'"),
      "ffmpeg_filter_crop_unavailable",
    );
    assert.equal(
      classifyManagedProcessDiagnostic("No such filter: pad"),
      "ffmpeg_filter_pad_unavailable",
    );
    assert.equal(
      classifyManagedProcessDiagnostic("No such filter: ''"),
      "ffmpeg_filtergraph_invalid",
    );
    assert.equal(
      classifyManagedProcessDiagnostic("No such filter: 'custom_filter'"),
      "ffmpeg_filter_unavailable",
    );
    assert.equal(
      classifyManagedProcessDiagnostic("Unknown encoder 'libx264'"),
      "ffmpeg_encoder_h264_unavailable",
    );
    assert.equal(
      classifyManagedProcessDiagnostic("Error while opening encoder for output stream #0:0"),
      "ffmpeg_encoder_open_failed",
    );
    assert.equal(
      classifyManagedProcessDiagnostic("Cannot find a valid font for family Sans"),
      "ffmpeg_font_unavailable",
    );
  });

  it("propaga somente codigo diagnostico controlado por causas encadeadas", () => {
    const root = new ManagedProcessError("failed", {
      diagnosticCode: "ffmpeg_filtergraph_invalid",
    });
    const wrapped = new Error("processing_failed", { cause: root });

    assert.equal(managedProcessDiagnosticCode(wrapped), "ffmpeg_filtergraph_invalid");
    assert.equal(
      managedProcessDiagnosticCode(new Error("raw https://example.invalid/video.mp4")),
      undefined,
    );
  });

  for (const filter of ["constructor", "__proto__", "toString", "hasOwnProperty"]) {
    it(`trata ${filter} como filtro desconhecido, nunca como propriedade herdada`, () => {
      const code = classifyManagedProcessDiagnostic(`No such filter: '${filter}'`);
      assert.equal(code, "ffmpeg_filter_unavailable");
      const error = new ManagedProcessError("failed", { diagnosticCode: code });
      assert.deepEqual(
        JSON.parse(JSON.stringify({ diagnostic_code: managedProcessDiagnosticCode(error) })),
        {
          diagnostic_code: "ffmpeg_filter_unavailable",
        },
      );
    });
  }

  it("preserva todos os diagnósticos específicos dos filtros permitidos", () => {
    for (const filter of [
      "crop",
      "drawbox",
      "drawtext",
      "eq",
      "format",
      "fps",
      "overlay",
      "pad",
      "scale",
      "setsar",
    ]) {
      assert.equal(
        classifyManagedProcessDiagnostic(`No such filter: '${filter}'`),
        `ffmpeg_filter_${filter}_unavailable`,
      );
    }
  });
});
