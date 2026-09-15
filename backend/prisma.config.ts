import dotenv from "dotenv";
import { defineConfig, env } from "prisma/config";

// Este arquivo também roda na imagem final, onde `src/` não é copiado.
dotenv.config({ quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
