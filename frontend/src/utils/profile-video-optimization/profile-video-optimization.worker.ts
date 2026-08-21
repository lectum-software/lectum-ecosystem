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
} from "mediabunny";
import {
  PROFILE_VIDEO_AUDIO_BITRATE,
  PROFILE_VIDEO_MAX_OUTPUT_BYTES,
  resolveProfileVideoContainer,
  resolveProfileVideoEncodingPolicy,
  shouldOptimizeProfileVideo,
} from "./policy";
import type {
  ProfileVideoOptimizationWorkerRequest,
  ProfileVideoOptimizationWorkerResponse,
} from "./types";

type ProfileVideoWorkerScope = {
  onmessage: ((event: MessageEvent<ProfileVideoOptimizationWorkerRequest>) => void) | null;
  postMessage: (message: ProfileVideoOptimizationWorkerResponse, transfer?: Transferable[]) => void;
};

const workerScope = self as unknown as ProfileVideoWorkerScope;
let activeConversion: Conversion | null = null;
let canceledByUser = false;

const postProgress = (stage: "analyzing" | "optimizing", percentage: number | null) => {
  workerScope.postMessage({ percentage, stage, type: "progress" });
};

const ensureAacEncoder = async (numberOfChannels: number, sampleRate: number, quality: Quality) => {
  const options = { numberOfChannels, quality, sampleRate };
  if (await canEncodeAudio("aac", options)) return true;

  const { registerAacEncoder } = await import("@mediabunny/aac-encoder");
  registerAacEncoder();
  return canEncodeAudio("aac", options);
};

const optimizeProfileVideo = async (file: File) => {
  const input = new Input({
    formats: ALL_FORMATS,
    source: new BlobSource(file),
  });

  try {
    postProgress("analyzing", null);
    if (!(await input.canRead())) {
      workerScope.postMessage({ reason: "unsupported", type: "use-original" });
      return;
    }

    const videoTrack = await input.getPrimaryVideoTrack();
    const audioTrack = await input.getPrimaryAudioTrack();
    if (
      !videoTrack ||
      !(await videoTrack.canDecode()) ||
      (audioTrack && !(await audioTrack.canDecode()))
    ) {
      workerScope.postMessage({ reason: "unsupported", type: "use-original" });
      return;
    }

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
    const durationSeconds =
      durationFromMetadata && durationFromMetadata > 0
        ? durationFromMetadata
        : await input.computeDuration([videoTrack, ...(audioTrack ? [audioTrack] : [])]);
    const analysis = {
      audioCodec,
      container: resolveProfileVideoContainer(inputMimeType || file.type),
      durationSeconds: durationSeconds > 0 ? durationSeconds : null,
      fileSize: file.size,
      frameRate: frameRateMetrics.bestGuessFrameRate,
      height,
      videoCodec,
      width,
    };
    const policy = resolveProfileVideoEncodingPolicy(analysis);
    if (!policy) {
      workerScope.postMessage({ reason: "unsupported", type: "use-original" });
      return;
    }
    if (!shouldOptimizeProfileVideo(analysis, policy)) {
      workerScope.postMessage({ reason: "already-efficient", type: "use-original" });
      return;
    }

    const videoQuality = new Quality({ bitrate: policy.videoBitrate, bitrateMode: "variable" });
    if (
      !(await canEncodeVideo("avc", {
        height: policy.height,
        quality: videoQuality,
        width: policy.width,
      }))
    ) {
      workerScope.postMessage({ reason: "unsupported", type: "use-original" });
      return;
    }

    const audioQuality = new Quality({
      bitrate: PROFILE_VIDEO_AUDIO_BITRATE,
      bitrateMode: "variable",
    });
    const audioConfig = audioTrack
      ? {
          numberOfChannels: Math.min(2, await audioTrack.getNumberOfChannels()),
          sampleRate: Math.min(48_000, await audioTrack.getSampleRate()),
        }
      : null;
    if (
      audioConfig &&
      !(await ensureAacEncoder(audioConfig.numberOfChannels, audioConfig.sampleRate, audioQuality))
    ) {
      workerScope.postMessage({ reason: "unsupported", type: "use-original" });
      return;
    }

    const target = new BufferTarget();
    const output = new Output({
      format: new Mp4OutputFormat({ fastStart: "in-memory" }),
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
        frameRate: policy.frameRate,
        height: policy.height,
        keyFrameInterval: 2,
        quality: videoQuality,
        width: policy.width,
      },
    });
    if (!conversion.isValid) {
      workerScope.postMessage({ reason: "unsupported", type: "use-original" });
      return;
    }

    activeConversion = conversion;
    let outputLimitExceeded = false;
    target.on("write", ({ end }) => {
      if (end <= PROFILE_VIDEO_MAX_OUTPUT_BYTES || outputLimitExceeded) return;
      outputLimitExceeded = true;
      void conversion.cancel();
    });
    conversion.onProgress = (progress) => {
      postProgress("optimizing", Math.max(0, Math.min(100, Math.round(progress * 100))));
    };
    postProgress("optimizing", 0);
    await conversion.execute();

    const buffer = target.buffer;
    if (!buffer || outputLimitExceeded || buffer.byteLength > PROFILE_VIDEO_MAX_OUTPUT_BYTES) {
      workerScope.postMessage({ reason: "failed", type: "use-original" });
      return;
    }

    workerScope.postMessage({ buffer, outputSize: buffer.byteLength, type: "optimized" }, [buffer]);
  } catch {
    workerScope.postMessage(
      canceledByUser ? { type: "canceled" } : { reason: "failed", type: "use-original" },
    );
  } finally {
    activeConversion = null;
    input.dispose();
  }
};

workerScope.onmessage = (event) => {
  if (event.data.type === "cancel") {
    canceledByUser = true;
    void activeConversion?.cancel();
    return;
  }

  canceledByUser = false;
  void optimizeProfileVideo(event.data.file);
};
