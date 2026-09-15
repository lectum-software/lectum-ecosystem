"use client";

import { useMutation } from "@tanstack/react-query";
import type {
  ContentAttentionTrackingRequest,
  ContentVideoWatchTrackingRequest,
  ImportantActionTrackingRequest,
  LocationCaptureRequest,
  PageViewTrackingRequest,
} from "@/api/req/analytics";
import * as api from "@/api/req/analytics";

export const useLocationCapture = () => {
  return useMutation({
    mutationFn: (body: LocationCaptureRequest) => api.captureVisitorLocation(body),
  });
};

export const usePageViewTracking = () => {
  return useMutation({
    mutationFn: (body: PageViewTrackingRequest) => api.trackPageView(body),
  });
};

export const useImportantActionTracking = () => {
  return useMutation({
    mutationFn: (body: ImportantActionTrackingRequest) => api.trackImportantAction(body),
  });
};

export const useContentVideoWatchTracking = () => {
  return useMutation({
    mutationFn: (body: ContentVideoWatchTrackingRequest) => api.trackContentVideoWatch(body),
  });
};

export const useContentAttentionTracking = () => {
  return useMutation({
    mutationFn: (body: ContentAttentionTrackingRequest) => api.trackContentAttention(body),
  });
};
