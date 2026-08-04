//Dotenv
import dotenv from "dotenv";

dotenv.config();

const isProductionRuntime = process.env.NODE_ENV?.includes("prod");

export const schema = {
  base: isProductionRuntime ? "dist/modules" : "src/modules",
  modules: [
    {
      options: {
        title: "Project LECTUM",
        description: "Endpoints API",
        outputFile: "api.json",
        version: "1.0.0",
        url: "/api/docs/api",
      },
      module: "api",
      models: ["private", "public"],
      privateModels: ["private"],
    },
  ],
};
