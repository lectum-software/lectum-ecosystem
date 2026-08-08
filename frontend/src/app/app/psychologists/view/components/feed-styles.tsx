"use client";

export const PsychologistsFeedStyles = () => {
  return (
    <style>
      {`
                @keyframes psychologists-double-tap-feedback {
                  0% {
                    opacity: 0;
                    transform: translate3d(-50%, -50%, 0) scale(0.72);
                  }
                  22% {
                    opacity: 1;
                    transform: translate3d(-50%, -50%, 0) scale(1.12);
                  }
                  100% {
                    opacity: 0;
                    transform: translate3d(-50%, -50%, 0) scale(1.38);
                  }
                }

                @keyframes psychologists-swipe-hint-float {
                  0%,
                  100% {
                    transform: translate3d(-50%, 0, 0);
                  }
                  50% {
                    transform: translate3d(-50%, -6px, 0);
                  }
                }

                @keyframes psychologists-swipe-hint-enter {
                  0% {
                    opacity: 0;
                    transform: translate3d(-50%, 8px, 0) scale(0.96);
                  }
                  100% {
                    opacity: 1;
                    transform: translate3d(-50%, 0, 0) scale(1);
                  }
                }

                @keyframes psychologists-swipe-card-nudge {
                  0%,
                  100% {
                    transform: translate3d(0, 0, 0);
                  }
                  45% {
                    transform: translate3d(0, -8px, 0);
                  }
                }

                @keyframes psychologists-availability-dot-pulse {
                  0%,
                  100% {
                    box-shadow: 0 0 0 0
                      color-mix(in srgb, var(--lectum-success) 0%, transparent);
                    opacity: 1;
                    transform: scale(1);
                  }
                  50% {
                    box-shadow: 0 0 0 4px
                      color-mix(in srgb, var(--lectum-success) 22%, transparent);
                    opacity: 0.92;
                    transform: scale(1.18);
                  }
                }

                .psychologists-video-feed {
                  -webkit-overflow-scrolling: touch;
                  scroll-behavior: smooth;
                  -ms-overflow-style: none;
                  scrollbar-width: none;
                }

                .psychologists-video-feed::-webkit-scrollbar {
                  display: none;
                }

                .psychologists-filter-dialog-scroll {
                  scrollbar-width: none;
                  -ms-overflow-style: none;
                }

                .psychologists-filter-dialog-scroll::-webkit-scrollbar {
                  display: none;
                }

                @media (min-width: 1024px) {
                  .psychologists-shorts-layout {
                    --psychologists-desktop-card-top: 10px;
                    --psychologists-desktop-card-gap: 6px;
                    --psychologists-desktop-card-height: min(900px, calc(100dvh - 82px));
                    --psychologists-desktop-card-width: min(506px, calc(56.25dvh - 46.125px));
                    --psychologists-desktop-card-half-width: min(253px, calc(28.125dvh - 23.0625px));
                    --psychologists-desktop-rail-left: calc(
                      50% +
                      var(--psychologists-desktop-card-half-width) +
                      28px
                    );
                    --psychologists-desktop-slide-height: calc(
                      var(--psychologists-desktop-card-top) +
                      var(--psychologists-desktop-card-height) +
                      var(--psychologists-desktop-card-gap)
                    );
                  }

                  .psychologists-video-feed {
                    scroll-padding-top: 0;
                  }
                }

                .psychologists-double-tap-feedback {
                  animation: psychologists-double-tap-feedback 520ms ease-out both;
                }

                .psychologists-swipe-hint {
                  animation:
                    psychologists-swipe-hint-enter 220ms ease-out both,
                    psychologists-swipe-hint-float 1.4s 220ms ease-in-out infinite;
                }

                .psychologists-swipe-nudge {
                  animation: psychologists-swipe-card-nudge 760ms cubic-bezier(0.2, 0.85, 0.2, 1) both;
                }

                .psychologists-availability-dot {
                  animation: psychologists-availability-dot-pulse 1.6s ease-in-out infinite;
                  will-change: box-shadow, opacity, transform;
                }

                .psychologists-ui-inert,
                .psychologists-ui-inert * {
                  pointer-events: none !important;
                }

                @media (prefers-reduced-motion: reduce) {
                  .psychologists-video-feed {
                    scroll-behavior: auto;
                  }

                  .psychologists-double-tap-feedback {
                    animation: none;
                    opacity: 1;
                  }

                  .psychologists-swipe-hint,
                  .psychologists-swipe-nudge {
                    animation: none;
                  }

                  .psychologists-availability-dot {
                    animation: none;
                    box-shadow: none;
                    opacity: 1;
                    transform: none;
                  }
                }
              `}
    </style>
  );
};
