import { spawn } from "node:child_process";

export type ManagedProcessFailure = "aborted" | "failed" | "output_limit" | "timeout";

export class ManagedProcessError extends Error {
  readonly kind: ManagedProcessFailure;

  constructor(kind: ManagedProcessFailure, options: { cause?: unknown } = {}) {
    super(
      `video_process_${kind}`,
      options.cause === undefined ? undefined : { cause: options.cause },
    );
    this.name = "ManagedProcessError";
    this.kind = kind;
  }
}

type RunManagedProcessInput = {
  args: readonly string[];
  command: string;
  maxStdoutBytes?: number;
  onStdout?: (chunk: string) => void;
  signal?: AbortSignal;
  timeoutMs: number;
};

const childEnvironment = (): NodeJS.ProcessEnv => {
  const environment: NodeJS.ProcessEnv = { LANG: "C", LC_ALL: "C" };
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
    let failure: ManagedProcessFailure | null = null;
    let killTimeout: NodeJS.Timeout | null = null;
    let settled = false;
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

    child.stderr.resume();

    child.once("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(processTimeout);
      if (killTimeout) clearTimeout(killTimeout);
      signal?.removeEventListener("abort", handleAbort);
      reject(new ManagedProcessError(failure ?? "failed", { cause: error }));
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
        reject(new ManagedProcessError("failed"));
        return;
      }

      resolve(stdout);
    });
  });
