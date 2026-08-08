//@ts-nocheck

import { toSafeErrorLog } from "@/utils/safe-error-log";

export const handleError = (err) => {
  try {
    const objectError = {
      params: {},
      query: {},
      body: {},
    };

    const issues = err.issues;

    issues.forEach((issue) => {
      const path = issue.path.join(".");
      const keys = issue?.keys?.join(".");
      const message = issue.message;

      if (path.includes("params") && objectError.params) {
        if (path === "params") {
          const errors = keys?.split(".");
          errors?.forEach((error) => {
            objectError.query[error] = message;
          });
        } else {
          objectError.params[path.replace("params.", "")] = message;
        }
      } else if (path.includes("query") && objectError.query) {
        if (path === "query") {
          const errors = keys?.split(".");
          errors?.forEach((error) => {
            objectError.query[error] = message;
          });
        } else {
          objectError.query[path.replace("query.", "")] = message;
        }
      } else if (path.includes("body") && objectError.body) {
        if (path === "query") {
          const errors = keys?.split(".");
          errors?.forEach((error) => {
            objectError.query[error] = message;
          });
        } else {
          objectError.body[path.replace("body.", "")] = message;
        }
      }
    });

    !Object.keys(objectError?.params || {}).length && delete objectError?.params;
    !Object.keys(objectError?.query || {}).length && delete objectError?.query;
    !Object.keys(objectError?.body || {}).length && delete objectError?.body;

    return objectError;
  } catch (err) {
    console.error("[VALIDATOR] Falha ao organizar erros.", toSafeErrorLog(err, "ValidatorError"));
  }
};
