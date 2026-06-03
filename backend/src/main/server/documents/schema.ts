//Dotenv
import dotenv from "dotenv";

dotenv.config();

export const schema = {
  base: "src/modules",
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
