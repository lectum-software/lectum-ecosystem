//Dotenv
import path from "node:path";
import dotenv from "dotenv";

dotenv.config();

const isProductionRuntime = process.env.NODE_ENV?.includes("prod");
const runtimeRoot = path.resolve(__dirname, "../../..");
const isCompiledRuntime = path.basename(runtimeRoot) === "dist";

export const schema = {
  base: isProductionRuntime || isCompiledRuntime ? "dist/modules" : "src/modules",
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
