import "@/config/dotenv";
import path from "node:path";
import { isPublishedRuntime } from "@/utils/runtime-config";

const runtimeRoot = path.resolve(__dirname, "../../..");
const isCompiledRuntime = path.basename(runtimeRoot) === "dist";

export const schema = {
  base: isPublishedRuntime() || isCompiledRuntime ? "dist/modules" : "src/modules",
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
