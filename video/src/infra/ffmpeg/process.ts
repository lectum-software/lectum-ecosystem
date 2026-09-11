import { spawn } from "node:child_process";

export type ManagedProcessFailure = "aborted" | "failed" | "output_limit" | "timeout";

export type ManagedProcessDiagnosticCode =
  | "ffmpeg_encoder_aac_unavailable"
  | "ffmpeg_encoder_h264_unavailable"
  | "ffmpeg_encoder_open_failed"
  | "ffmpeg_encoder_unavailable"
  | "ffmpeg_filter_crop_unavailable"
  | "ffmpeg_filter_drawbox_unavailable"
  | "ffmpeg_filter_drawtext_unavailable"
  | "ffmpeg_filter_eq_unavailable"
  | "ffmpeg_filter_format_unavailable"
  | "ffmpeg_filter_fps_unavailable"
  | "ffmpeg_filter_overlay_unavailable"
  | "ffmpeg_filter_pad_unavailable"
  | "ffmpeg_filter_scale_unavailable"
  | "ffmpeg_filter_setsar_unavailable"
  | "ffmpeg_filter_unavailable"
  | "ffmpeg_filtergraph_invalid"
  | "ffmpeg_font_unavailable"
  | "ffmpeg_input_decode_failed"
  | "ffmpeg_muxer_failed"
  | "ffmpeg_protocol_unavailable"
  | "process_aborted"
  | "process_binary_not_executable"
  | "process_binary_unavailable"
  | "process_failed"
  | "process_output_limit"
  | "process_output_no_space"
  | "process_permission_denied"
  | "process_spawn_failed"
  | "process_timeout";

const DEFAULT_DIAGNOSTIC_BY_FAILURE = {
  aborted: "process_aborted",
  failed: "process_failed",
  output_limit: "process_output_limit",
  timeout: "process_timeout",
} as const satisfies Record<ManagedProcessFailure, ManagedProcessDiagnosticCode>;

const STDERR_DIAGNOSTIC_BYTES = 16_384;

const SPECIFIC_FILTER_DIAGNOSTIC: Readonly<Record<string, ManagedProcessDiagnosticCode>> = {
  crop: "ffmpeg_filter_crop_unavailable",
  drawbox: "ffmpeg_filter_drawbox_unavailable",
  drawtext: "ffmpeg_filter_drawtext_unavailable",
  eq: "ffmpeg_filter_eq_unavailable",
  format: "ffmpeg_filter_format_unavailable",
  fps: "ffmpeg_filter_fps_unavailable",
  overlay: "ffmpeg_filter_overlay_unavailable",
  pad: "ffmpeg_filter_pad_unavailable",
  scale: "ffmpeg_filter_scale_unavailable",
  setsar: "ffmpeg_filter_setsar_unavailable",
} as const;

export class ManagedProcessError extends Error {
  readonly diagnosticCode: ManagedProcessDiagnosticCode;
  readonly kind: ManagedProcessFailure;

  constructor(
    kind: ManagedProcessFailure,
    options: { cause?: unknown; diagnosticCode?: ManagedProcessDiagnosticCode } = {},
  ) {
    super(
      `video_process_${kind}`,
      options.cause === undefined ? undefined : { cause: options.cause },
    );
    this.name = "ManagedProcessError";
    this.diagnosticCode = options.diagnosticCode ?? DEFAULT_DIAGNOSTIC_BY_FAILURE[kind];
    this.kind = kind;
  }
}

export const classifyManagedProcessDiagnostic = (stderr: string): ManagedProcessDiagnosticCode => {
  const normalized = stderr.toLowerCase();

  if (!normalized.trim()) return "process_failed";
  const filterMatch = /no such filter:\s*'?(?<filter>[a-z0-9_]+)'?/iu.exec(normalized);
  const filterName = filterMatch?.groups?.filter;
  if (filterName) {
    return Object.hasOwn(SPECIFIC_FILTER_DIAGNOSTIC, filterName)
      ? (SPECIFIC_FILTER_DIAGNOSTIC[filterName] ?? "ffmpeg_filter_unavailable")
      : "ffmpeg_filter_unavailable";
  }
  if (/no such filter:\s*''/iu.test(normalized)) return "ffmpeg_filtergraph_invalid";
  if (
    normalized.includes("cannot find a valid font") ||
    normalized.includes("could not load font") ||
    normalized.includes("error loading font") ||
    normalized.includes("fontconfig")
  ) {
    return "ffmpeg_font_unavailable";
  }
  if (normalized.includes("no such filter")) return "ffmpeg_filter_unavailable";
  if (normalized.includes("unknown encoder") && normalized.includes("libx264")) {
    return "ffmpeg_encoder_h264_unavailable";
  }
  if (normalized.includes("unknown encoder") && normalized.includes("aac")) {
    return "ffmpeg_encoder_aac_unavailable";
  }
  if (normalized.includes("unknown encoder")) return "ffmpeg_encoder_unavailable";
  if (
    normalized.includes("error while opening encoder") ||
    normalized.includes("encoder not found")
  ) {
    return "ffmpeg_encoder_open_failed";
  }
  if (normalized.includes("no space left on device")) return "process_output_no_space";
  if (normalized.includes("permission denied")) return "process_permission_denied";
  if (
    normalized.includes("protocol not found") ||
    normalized.includes("protocol not on whitelist")
  ) {
    return "ffmpeg_protocol_unavailable";
  }
  if (
    normalized.includes("moov atom not found") ||
    normalized.includes("invalid data found") ||
    normalized.includes("could not find codec parameters")
  ) {
    return "ffmpeg_input_decode_failed";
  }
  if (
    normalized.includes("error initializing filter") ||
    normalized.includes("error initializing complex filters") ||
    normalized.includes("failed to configure output pad") ||
    normalized.includes("invalid argument")
  ) {
    return "ffmpeg_filtergraph_invalid";
  }
  if (
    normalized.includes("error writing trailer") ||
    normalized.includes("could not write header")
  ) {
    return "ffmpeg_muxer_failed";
  }

  return "process_failed";
};

const classifySpawnDiagnostic = (error: NodeJS.ErrnoException): ManagedProcessDiagnosticCode => {
  if (error.code === "ENOENT") return "process_binary_unavailable";
  if (error.code === "EACCES") return "process_binary_not_executable";
  return "process_spawn_failed";
};

export const managedProcessDiagnosticCode = (
  error: unknown,
): ManagedProcessDiagnosticCode | undefined => {
  if (error instanceof ManagedProcessError) return error.diagnosticCode;
  if (error instanceof Error) return managedProcessDiagnosticCode(error.cause);
  return undefined;
};

type RunManagedProcessInput = {
  args: readonly string[];
  command: string;
  maxStdoutBytes?: number;
  onStdout?: (chunk: string) => void;
  signal?: AbortSignal;
  timeoutMs: number;
};

const childEnvironment = (): NodeJS.ProcessEnv => {
  const environment: NodeJS.ProcessEnv = { LANG: "C.UTF-8", LC_ALL: "C.UTF-8" };
  for (const key of ["HOME", "LD_LIBRARY_PATH", "PATH", "TEMP", "TMP", "TMPDIR"]) {
    const value = process.env[key];
    if (value) environment[key] = value;
  }
  return environment;
};

export const runManagedProcess = ({
  args,
  command,
  maxStdoutBytes = 1_048_576,
  onStdout,
  signal,
  timeoutMs,
}: RunManagedProcessInput): Promise<string> =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new ManagedProcessError("aborted"));
      return;
    }
    let failure: ManagedProcessFailure | null = null;
    let killTimeout: NodeJS.Timeout | null = null;
    let settled = false;
    let stderrTail = "";
    let stdout = "";
    let stdoutBytes = 0;

    const child = spawn(command, [...args], {
      env: childEnvironment(),
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    const forceKill = () => {
      if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    };

    const terminate = (kind: ManagedProcessFailure) => {
      if (failure) return;
      failure = kind;
      if (child.exitCode === null && child.signalCode === null) child.kill("SIGTERM");
      killTimeout = setTimeout(forceKill, 5_000);
      killTimeout.unref();
    };

    const handleAbort = () => terminate("aborted");
    signal?.addEventListener("abort", handleAbort, { once: true });
    if (signal?.aborted) handleAbort();

    const processTimeout = setTimeout(() => terminate("timeout"), timeoutMs);
    processTimeout.unref();

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      if (failure) return;
      stdoutBytes += Buffer.byteLength(chunk);
      if (stdoutBytes > maxStdoutBytes) {
        terminate("output_limit");
        return;
      }
      stdout += chunk;
      onStdout?.(chunk);
    });

    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      stderrTail = `${stderrTail}${chunk}`.slice(-STDERR_DIAGNOSTIC_BYTES);
    });

    child.once("error", (error: NodeJS.ErrnoException) => {
      if (settled) return;
      settled = true;
      clearTimeout(processTimeout);
      if (killTimeout) clearTimeout(killTimeout);
      signal?.removeEventListener("abort", handleAbort);
      reject(
        new ManagedProcessError(failure ?? "failed", {
          cause: error,
          diagnosticCode: classifySpawnDiagnostic(error),
        }),
      );
    });

    child.once("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(processTimeout);
      if (killTimeout) clearTimeout(killTimeout);
      signal?.removeEventListener("abort", handleAbort);

      if (failure) {
        reject(new ManagedProcessError(failure));
        return;
      }
      if (code !== 0) {
        reject(
          new ManagedProcessError("failed", {
            diagnosticCode: classifyManagedProcessDiagnostic(stderrTail),
          }),
        );
        return;
      }

      resolve(stdout);
    });
  });
