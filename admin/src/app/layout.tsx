import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { AdminAuthProvider } from "@/providers/admin-auth";
import { QueryProvider } from "@/providers/query";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Lectum Admin",
  description: "Painel administrativo separado da plataforma Lectum.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#06133c",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={`${manrope.variable} antialiased`}>
        <QueryProvider>
          <AdminAuthProvider>{children}</AdminAuthProvider>
        </QueryProvider>
        <Toaster closeButton position="top-right" richColors />
      </body>
    </html>
  );
}
