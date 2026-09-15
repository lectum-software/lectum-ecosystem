import cors from "cors";
import { getPublicWebOrigins } from "@/utils/public-origin";

// Contrato HTTP usado pelo servidor e pelos testes reais de preflight.
// Não refletir headers/origens arbitrários: apenas os clientes configurados.
export const createApiCors = () =>
  cors({
    origin: getPublicWebOrigins(),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Accept-Language",
      "X-Requested-With",
      "Accept",
      "Origin",
      "ngrok-skip-browser-warning",
      "x-device",
      "X-Lectum-Video-Upload-Methods",
    ],
  });
