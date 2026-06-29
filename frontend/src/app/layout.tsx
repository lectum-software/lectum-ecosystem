import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { ThemeProvider } from "next-themes";

import "@/app/globals.css";
import { LocationCapture } from "@/components/analytics/location-capture";
import { ProgressiveConversionBoundary } from "@/components/conversion/progressive-conversion-provider";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
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
  title: process.env.NEXT_PUBLIC_SYSTEM_NAME || "Lectum",
  description: process.env.NEXT_PUBLIC_SYSTEM_DESCRIPTION || "Frontend Lectum",
  applicationName: "Lectum",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Lectum",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/pwa/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/pwa/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/pwa/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
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
