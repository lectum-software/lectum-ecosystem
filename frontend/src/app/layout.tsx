import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { ThemeProvider } from "next-themes";

import "@/app/globals.css";
import { LocationCapture } from "@/components/analytics/location-capture";
import { ProgressiveConversionBoundary } from "@/components/conversion/progressive-conversion-provider";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { absoluteUrl, getSiteUrl, SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";
import { Progress } from "@/providers/progress";
import { Provider as Query } from "@/providers/query";
import { Provider as Redux } from "@/providers/redux";
import { Provider as Socket } from "@/providers/socket";
import { Toaster } from "@/registry/new-york-v4/ui/sonner";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: `${SITE_NAME} | Psicologia em comunidade`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: SITE_NAME,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/pwa/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/pwa/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/pwa/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  keywords: [
    "psicologia",
    "saúde mental",
    "psicólogos",
    "perguntas sobre psicologia",
    "terapia online",
    "comunidade de saúde mental",
  ],
  alternates: {
    canonical: "/",
    languages: {
      "pt-BR": "/",
    },
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: absoluteUrl("/"),
    siteName: SITE_NAME,
    title: `${SITE_NAME} | Psicologia em comunidade`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: absoluteUrl("/logo-light.png"),
        width: 1280,
        height: 260,
        alt: SITE_NAME,
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} | Psicologia em comunidade`,
    description: SITE_DESCRIPTION,
    images: [absoluteUrl("/logo-light.png")],
  },
  category: "health",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning lang="pt-BR">
      <body
        className={`${manrope.variable} bg-background text-foreground antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          disableTransitionOnChange
          enableSystem={false}
        >
          <Progress />
          <Redux>
            <Query>
              <LocationCapture />
              <ProgressiveConversionBoundary>
                {children}
                <Socket />
                <PwaInstallPrompt />
                <Toaster richColors position="top-right" />
              </ProgressiveConversionBoundary>
            </Query>
          </Redux>
        </ThemeProvider>
      </body>
    </html>
  );
}
