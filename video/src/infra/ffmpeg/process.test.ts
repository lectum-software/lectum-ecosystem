import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyManagedProcessDiagnostic,
  ManagedProcessError,
  managedProcessDiagnosticCode,
} from "./process.js";

describe("managed FFmpeg process diagnostics", () => {
  it("classifica falhas conhecidas sem expor stderr bruto", () => {
    assert.equal(
      classifyManagedProcessDiagnostic("No such filter: 'drawtext'"),
      "ffmpeg_filter_drawtext_unavailable",
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
});
