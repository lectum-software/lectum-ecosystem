import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { ThemeProvider } from "next-themes";

import "@/app/globals.css";
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning lang="pt-BR">
      <body className={`${manrope.variable} bg-background text-foreground antialiased`}>
        <ThemeProvider attribute="class">
          <Progress />
          <Redux>
            <Query>
              {children}
              <Socket />
              <Toaster richColors position="top-right" />
            </Query>
          </Redux>
        </ThemeProvider>
      </body>
    </html>
  );
}
