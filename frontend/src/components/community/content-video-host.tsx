"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { useAppSelector } from "@/hooks/redux";
import {
  ContentVideoLaunchContext,
  type ContentVideoRequest,
  type ContentVideoSource,
  ContentVideoScope as SourceProvider,
  useContentVideoSource,
} from "./content-video-context";
import {
  clearContentVideoHistory,
  readContentVideoHistory,
  saveContentVideoHistory,
} from "./content-video-history";

const ContentVideoViewer = dynamic(
  () => import("./content-video-viewer").then((module) => module.ContentVideoViewer),
  { ssr: false },
);

export const ContentVideoHost = ({ children }: { children: ReactNode }) => {
  const [request, setRequest] = useState<ContentVideoRequest | null>(null);
  const pathname = usePathname();
  const scope = useContentVideoSource()?.mode ?? "root";
  const userId = useAppSelector((state) => state.user?.id) ?? "guest";
  useEffect(() => {
    void pathname;
    const restore = () => setRequest(readContentVideoHistory(scope, userId));
    restore();
    window.addEventListener("popstate", restore);
    window.addEventListener("pageshow", restore);
    return () => {
      window.removeEventListener("popstate", restore);
      window.removeEventListener("pageshow", restore);
    };
  }, [pathname, scope, userId]);
  return (
    <ContentVideoLaunchContext.Provider
      value={(next) => {
        clearContentVideoHistory();
        setRequest(next);
      }}
    >
      {children}
      {request ? (
        <ContentVideoViewer
          {...request}
          onClose={() => {
            clearContentVideoHistory();
            setRequest(null);
          }}
          onNavigate={(next) => {
            saveContentVideoHistory(next, scope, userId);
            setRequest(null);
          }}
        />
      ) : null}
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
