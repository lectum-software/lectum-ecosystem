"use client";

import { useMutation } from "@tanstack/react-query";
import type { LocationCaptureRequest } from "@/api/req/analytics";
import * as api from "@/api/req/analytics";

export const useLocationCapture = () => {
  return useMutation({
    mutationFn: (body: LocationCaptureRequest) => api.captureVisitorLocation(body),
  });
};
