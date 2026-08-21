import {
  ALL_FORMATS,
  BlobSource,
  BufferTarget,
  Conversion,
  canEncodeAudio,
  canEncodeVideo,
  Input,
  Mp4OutputFormat,
  Output,
  Quality,
  StreamTarget,
} from "mediabunny";
import {
  cleanupVideoPreparationTemporaryOutput,
  createVideoPreparationTemporaryOutput,
  readVideoPreparationTemporaryFile,
  shouldUseMemoryVideoOutputFallback,
  VIDEO_PREPARATION_MEMORY_FALLBACK_MAX_OUTPUT_BYTES,
  type VideoPreparationTemporaryOutput,
} from "./opfs-output";
import {
  getVideoPreparationPurposePolicy,
  resolveVideoContainer,
  resolveVideoEncodingPolicy,
  resolveVideoOutputFileName,
  shouldOptimizeVideo,
  shouldUseOptimizedVideo,
} from "./policy";
import {
  isVideoPreparationPurpose,
  type VideoOptimizationWorkerRequest,
  type VideoOptimizationWorkerResponse,
  type VideoPreparationPurpose,
  type VideoPreparationStage,
} from "./types";

type VideoWorkerScope = {
  onmessage: ((event: MessageEvent<VideoOptimizationWorkerRequest>) => void) | null;
  postMessage: (message: VideoOptimizationWorkerResponse, transfer?: Transferable[]) => void;
};

const workerScope = self as unknown as VideoWorkerScope;
let activeConversion: Conversion | null = null;
let canceledByUser = false;

type VideoOptimizationTerminalResponse = Exclude<
  VideoOptimizationWorkerResponse,
  { type: "progress" | "temporary-file-created" }
>;

type VideoOutputDestination =
  | {
      kind: "buffer";
      maxOutputBytes: number;
      target: BufferTarget;
    }
  | {
      kind: "opfs";
      maxOutputBytes: number;
      target: StreamTarget;
      temporaryOutput: VideoPreparationTemporaryOutput;
    };

class VideoPreparationWorkerCanceledError extends Error {
  constructor() {
    super("video_preparation_worker_canceled");
    this.name = "AbortError";
  }
}

const throwIfWorkerCanceled = () => {
  if (canceledByUser) throw new VideoPreparationWorkerCanceledError();
};

const postProgress = (stage: VideoPreparationStage, percentage: number | null) => {
  workerScope.postMessage({ percentage, stage, type: "progress" });
};

const ensureAacEncoder = async (numberOfChannels: number, sampleRate: number, quality: Quality) => {
  const options = { numberOfChannels, quality, sampleRate };
  if (await canEncodeAudio("aac", options)) return true;

  const { registerAacEncoder } = await import("@mediabunny/aac-encoder");
  registerAacEncoder();
  return canEncodeAudio("aac", options);
};

const createVideoOutputDestination = async (
  inputSize: number,
  estimatedOutputSize: number,
  maxOutputBytes: number,
): Promise<VideoOutputDestination | null> => {
  let temporaryOutput: VideoPreparationTemporaryOutput | null = null;

  try {
    temporaryOutput = await createVideoPreparationTemporaryOutput(maxOutputBytes);
    const target = new StreamTarget(temporaryOutput.writable, { chunked: false });
    workerScope.postMessage({
      temporaryFileName: temporaryOutput.fileName,
      type: "temporary-file-created",
    });
    return { kind: "opfs", maxOutputBytes, target, temporaryOutput };
  } catch {
    if (temporaryOutput) {
      await cleanupVideoPreparationTemporaryOutput(temporaryOutput);
    }
  }

  if (!shouldUseMemoryVideoOutputFallback(inputSize, estimatedOutputSize)) return null;
  return {
    kind: "buffer",
    maxOutputBytes: Math.min(maxOutputBytes, VIDEO_PREPARATION_MEMORY_FALLBACK_MAX_OUTPUT_BYTES),
    target: new BufferTarget(),
  };
};

const postTerminalResponse = (response: VideoOptimizationTerminalResponse) => {
  if (response.type === "optimized-buffer") {
    workerScope.postMessage(response, [response.buffer]);
    return;
  }

  workerScope.postMessage(response);
};

const optimizeVideo = async (file: File, purpose: VideoPreparationPurpose) => {
  let input: Input | null = null;
  let destination: VideoOutputDestination | null = null;
  let retainTemporaryFile = false;
  let terminalResponse: VideoOptimizationTerminalResponse | null = null;

  try {
    const purposePolicy = getVideoPreparationPurposePolicy(purpose);
    input = new Input({
      formats: ALL_FORMATS,
      source: new BlobSource(file),
    });

    postProgress("analyzing", null);
    if (!(await input.canRead())) {
      terminalResponse = { reason: "unsupported", type: "use-original" };
      return;
    }
    throwIfWorkerCanceled();

    const videoTrack = await input.getPrimaryVideoTrack();
    const audioTrack = await input.getPrimaryAudioTrack();
    if (
      !videoTrack ||
      !(await videoTrack.canDecode()) ||
      (audioTrack && !(await audioTrack.canDecode()))
    ) {
      terminalResponse = { reason: "unsupported", type: "use-original" };
      return;
    }
    throwIfWorkerCanceled();

    const [
      audioCodec,
      durationFromMetadata,
      frameRateMetrics,
      height,
      inputMimeType,
      videoCodec,
      width,
    ] = await Promise.all([
      audioTrack?.getCodec() ?? Promise.resolve(null),
      input.getDurationFromMetadata([videoTrack, ...(audioTrack ? [audioTrack] : [])]),
      videoTrack.computeFrameRateMetrics({ targetPacketCount: 256 }),
      videoTrack.getDisplayHeight(),
      input.getMimeType(),
      videoTrack.getCodec(),
      videoTrack.getDisplayWidth(),
    ]);
    throwIfWorkerCanceled();
    const durationSeconds =
      durationFromMetadata && durationFromMetadata > 0
        ? durationFromMetadata
        : await input.computeDuration([videoTrack, ...(audioTrack ? [audioTrack] : [])]);
    throwIfWorkerCanceled();
    const analysis = {
      audioCodec,
      container: resolveVideoContainer(inputMimeType || file.type),
      durationSeconds: durationSeconds > 0 ? durationSeconds : null,
      fileSize: file.size,
      frameRate: frameRateMetrics.bestGuessFrameRate,
      height,
      videoCodec,
      width,
    };
    const encodingPolicy = resolveVideoEncodingPolicy(analysis, purpose);
    if (!encodingPolicy) {
      terminalResponse = { reason: "unsupported", type: "use-original" };
      return;
    }
    if (!shouldOptimizeVideo(analysis, encodingPolicy, purpose)) {
      terminalResponse = { reason: "already-efficient", type: "use-original" };
      return;
    }

    const videoQuality = new Quality({
      bitrate: encodingPolicy.videoBitrate,
      bitrateMode: "variable",
    });
    if (
      !(await canEncodeVideo("avc", {
        height: encodingPolicy.height,
        quality: videoQuality,
        width: encodingPolicy.width,
      }))
    ) {
      terminalResponse = { reason: "unsupported", type: "use-original" };
      return;
    }
    throwIfWorkerCanceled();

    const audioQuality = new Quality({
      bitrate: purposePolicy.audioBitrate,
      bitrateMode: "variable",
    });
    const audioConfig = audioTrack
      ? {
          numberOfChannels: Math.min(2, await audioTrack.getNumberOfChannels()),
          sampleRate: Math.min(48_000, await audioTrack.getSampleRate()),
        }
      : null;
    throwIfWorkerCanceled();
    if (
      audioConfig &&
      !(await ensureAacEncoder(audioConfig.numberOfChannels, audioConfig.sampleRate, audioQuality))
    ) {
      terminalResponse = { reason: "unsupported", type: "use-original" };
      return;
    }
    throwIfWorkerCanceled();

    destination = await createVideoOutputDestination(
      file.size,
      encodingPolicy.estimatedOutputBytes,
      purposePolicy.maxOutputBytes,
    );
    if (!destination) {
      terminalResponse = { reason: "failed", type: "use-original" };
      return;
    }
    throwIfWorkerCanceled();

    const { target } = destination;
    const output = new Output({
      format: new Mp4OutputFormat({ fastStart: false }),
      target,
    });
    const conversion = await Conversion.init({
      audio: audioConfig
        ? {
            codec: "aac",
            forceTranscode: true,
            numberOfChannels: audioConfig.numberOfChannels,
            quality: audioQuality,
            sampleRate: audioConfig.sampleRate,
          }
        : undefined,
      input,
      output,
      showWarnings: false,
      tags: {},
      tracks: "primary",
      video: {
        allowRotationMetadata: true,
        codec: "avc",
        fit: "contain",
        forceTranscode: true,
        frameRate: encodingPolicy.frameRate,
        height: encodingPolicy.height,
        keyFrameInterval: 2,
        quality: videoQuality,
        width: encodingPolicy.width,
      },
    });
    if (!conversion.isValid) {
      terminalResponse = { reason: "unsupported", type: "use-original" };
      return;
    }
    throwIfWorkerCanceled();

    activeConversion = conversion;
    const destinationMaxOutputBytes = destination.maxOutputBytes;
    let outputLimitExceeded = false;
    let maximumWrittenEnd = 0;
    target.on("write", ({ end }) => {
      maximumWrittenEnd = Math.max(maximumWrittenEnd, end);
      if (maximumWrittenEnd <= destinationMaxOutputBytes || outputLimitExceeded) return;
      outputLimitExceeded = true;
      void conversion.cancel().catch(() => undefined);
    });
    conversion.onProgress = (progress) => {
      postProgress("optimizing", Math.max(0, Math.min(100, Math.round(progress * 100))));
    };
    postProgress("optimizing", 0);
    await conversion.execute();
    throwIfWorkerCanceled();

    if (outputLimitExceeded) {
      terminalResponse = { reason: "failed", type: "use-original" };
      return;
    }

    if (destination.kind === "buffer") {
      const buffer = destination.target.buffer;
      if (
        !buffer ||
        !shouldUseOptimizedVideo(file.size, buffer.byteLength, purpose) ||
        buffer.byteLength > destination.maxOutputBytes
      ) {
        terminalResponse = { reason: "failed", type: "use-original" };
        return;
      }

      terminalResponse = {
        buffer,
        outputSize: buffer.byteLength,
        type: "optimized-buffer",
      };
      return;
    }

    const optimizedFile = await readVideoPreparationTemporaryFile(
      destination.temporaryOutput,
      resolveVideoOutputFileName(purpose),
    );
    throwIfWorkerCanceled();
    if (!shouldUseOptimizedVideo(file.size, optimizedFile.size, purpose)) {
      terminalResponse = { reason: "failed", type: "use-original" };
      return;
    }

    retainTemporaryFile = true;
    terminalResponse = {
      file: optimizedFile,
      outputSize: optimizedFile.size,
      temporaryFileName: destination.temporaryOutput.fileName,
      type: "optimized-file",
    };
  } catch {
    terminalResponse = canceledByUser
      ? { type: "canceled" }
      : { reason: "failed", type: "use-original" };
  } finally {
    activeConversion = null;
    try {
      input?.dispose();
    } catch {
      // Disposal cannot prevent storage cleanup or the terminal response.
    }

    if (destination?.kind === "opfs" && !retainTemporaryFile) {
      await cleanupVideoPreparationTemporaryOutput(destination.temporaryOutput);
    }

    if (canceledByUser && terminalResponse?.type !== "optimized-file") {
      terminalResponse = { type: "canceled" };
    }
    terminalResponse ??= { reason: "failed", type: "use-original" };

    try {
      postTerminalResponse(terminalResponse);
    } catch {
      if (destination?.kind === "opfs" && retainTemporaryFile) {
        await cleanupVideoPreparationTemporaryOutput(destination.temporaryOutput);
      }
      try {
        workerScope.postMessage({ reason: "failed", type: "use-original" });
      } catch {
        // The client watchdog remains the final fallback if the channel is unavailable.
      }
    }
  }
};

workerScope.onmessage = (event) => {
  if (event.data.type === "cancel") {
    canceledByUser = true;
    void activeConversion?.cancel().catch(() => undefined);
    return;
  }

  canceledByUser = false;
  if (!isVideoPreparationPurpose(event.data.purpose)) {
    workerScope.postMessage({ reason: "unsupported", type: "use-original" });
    return;
  }
  void optimizeVideo(event.data.file, event.data.purpose);
};
