import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import "./globals.css";
import { AdminAuthProvider } from "@/providers/admin-auth";
import { QueryProvider } from "@/providers/query";

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
      <body>
        <QueryProvider>
          <AdminAuthProvider>{children}</AdminAuthProvider>
        </QueryProvider>
        <Toaster closeButton position="top-right" richColors />
      </body>
    </html>
  );
}
