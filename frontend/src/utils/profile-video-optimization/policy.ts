import {
  formatVideoSize,
  getVideoPreparationPurposePolicy,
  resolveVideoContainer,
  resolveVideoDimensions,
  resolveVideoEncodingPolicy,
  shouldOptimizeVideo,
  shouldUseOptimizedVideo,
  type VideoAnalysis,
  type VideoContainer,
  type VideoEncodingPolicy,
} from "../video-preparation/policy";

const PROFILE_VIDEO_PURPOSE = "profile-presentation" as const;
const profileVideoPolicy = getVideoPreparationPurposePolicy(PROFILE_VIDEO_PURPOSE);

export const PROFILE_VIDEO_MAX_OUTPUT_BYTES = profileVideoPolicy.maxOutputBytes;
export const PROFILE_VIDEO_MAX_EDGE_PX = profileVideoPolicy.maxEdgePx;
export const PROFILE_VIDEO_MAX_FRAME_RATE = profileVideoPolicy.maxFrameRate;
export const PROFILE_VIDEO_AUDIO_BITRATE = profileVideoPolicy.audioBitrate;

export type ProfileVideoContainer = VideoContainer;
export type ProfileVideoAnalysis = VideoAnalysis;
export type ProfileVideoEncodingPolicy = VideoEncodingPolicy;

export const resolveProfileVideoContainer = resolveVideoContainer;

export const resolveProfileVideoDimensions = (width: number, height: number) =>
  resolveVideoDimensions(width, height, PROFILE_VIDEO_PURPOSE);

export const resolveProfileVideoEncodingPolicy = (analysis: ProfileVideoAnalysis) =>
  resolveVideoEncodingPolicy(analysis, PROFILE_VIDEO_PURPOSE);

export const shouldOptimizeProfileVideo = (
  analysis: ProfileVideoAnalysis,
  encodingPolicy: ProfileVideoEncodingPolicy,
) => shouldOptimizeVideo(analysis, encodingPolicy, PROFILE_VIDEO_PURPOSE);

export const shouldUseOptimizedProfileVideo = (originalSize: number, outputSize: number) =>
  shouldUseOptimizedVideo(originalSize, outputSize, PROFILE_VIDEO_PURPOSE);

export const formatProfileVideoSize = formatVideoSize;
