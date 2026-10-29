"use client";

import dynamic from "next/dynamic";
import { type ReactNode, useState } from "react";
import {
  ContentVideoLaunchContext,
  type ContentVideoRequest,
  type ContentVideoSource,
  ContentVideoScope as SourceProvider,
} from "./content-video-context";

const ContentVideoViewer = dynamic(
  () => import("./content-video-viewer").then((module) => module.ContentVideoViewer),
  { ssr: false },
);

export const ContentVideoHost = ({ children }: { children: ReactNode }) => {
  const [request, setRequest] = useState<ContentVideoRequest | null>(null);
  return (
    <ContentVideoLaunchContext.Provider value={setRequest}>
      {children}
      {request ? <ContentVideoViewer {...request} onClose={() => setRequest(null)} /> : null}
    </ContentVideoLaunchContext.Provider>
  );
};

export const ContentVideoScope = ({
  children,
  ...source
}: ContentVideoSource & { children: ReactNode }) => (
  <SourceProvider {...source}>
    <ContentVideoHost>{children}</ContentVideoHost>
  </SourceProvider>
);
