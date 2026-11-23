"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { useAppSelector } from "@/hooks/redux";
import {
  ContentVideoLaunchContext,
  ContentVideoOpenContext,
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
import {
  contentVideoHref,
  readContentVideoLink,
  withoutContentVideoLink,
} from "./content-video-link";

const ContentVideoViewer = dynamic(
  () => import("./content-video-viewer").then((module) => module.ContentVideoViewer),
  { ssr: false },
);

export const ContentVideoHost = ({ children }: { children: ReactNode }) => {
  const [request, setRequest] = useState<ContentVideoRequest | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const scope = useContentVideoSource()?.mode ?? "root";
  const userId = useAppSelector((state) => state.user?.id) ?? "guest";
  useEffect(() => {
    void pathname;
    const restore = () => {
      const initial = readContentVideoLink(window.location.href);
      const owner = window.history.state?.lectumReelScope ?? "root";
      setRequest(
        initial ? (owner === scope ? { initial } : null) : readContentVideoHistory(scope, userId),
      );
    };
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
        window.history.pushState(
          { ...window.history.state, lectumReelScope: scope },
          "",
          window.location.href,
        );
        setRequest(next);
      }}
    >
      <ContentVideoOpenContext.Provider value={request !== null}>
        {children}
        {request ? (
          <ContentVideoViewer
            key={JSON.stringify(request.initial)}
            {...request}
            onActiveVideo={(entry) => {
              window.history.replaceState(
                { ...window.history.state, lectumReelScope: scope },
                "",
                contentVideoHref(window.location.href, entry),
              );
            }}
            onClose={() => {
              clearContentVideoHistory();
              const state = { ...window.history.state };
              delete state.lectumReelScope;
              const watchPage = document.querySelector<HTMLElement>("[data-public-reel-page]");
              const postHref = watchPage?.dataset.postHref;
              if (postHref?.startsWith("/comunidades/")) {
                // A direct Reel exits to its post, not to a second video presentation.
                window.history.replaceState(state, "", window.location.href);
                router.replace(postHref);
                setRequest(null);
                return;
              }
              window.history.replaceState(state, "", withoutContentVideoLink(window.location.href));
              setRequest(null);
            }}
            onNavigate={(next) => {
              const state = { ...window.history.state };
              delete state.lectumReelScope;
              window.history.replaceState(state, "", withoutContentVideoLink(window.location.href));
              saveContentVideoHistory(next, scope, userId);
              setRequest(null);
            }}
          />
        ) : null}
      </ContentVideoOpenContext.Provider>
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
