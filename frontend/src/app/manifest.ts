import type { MetadataRoute } from "next";

const APP_NAME = process.env.NEXT_PUBLIC_SYSTEM_NAME || "Lectum";
const APP_DESCRIPTION =
  process.env.NEXT_PUBLIC_SYSTEM_DESCRIPTION ||
  "Plataforma responsiva da Lectum para psicólogos e pacientes.";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/app",
    name: APP_NAME,
    short_name: "Lectum",
    description: APP_DESCRIPTION,
    lang: "pt-BR",
    start_url: "/app/psychologists",
    scope: "/app",
    display: "standalone",
    background_color: "#f6f7f8",
    theme_color: "#308ce8",
    categories: ["health", "medical", "social"],
    icons: [
      {
        src: "/pwa/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
