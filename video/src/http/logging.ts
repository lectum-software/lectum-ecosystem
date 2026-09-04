type SafeLogDetails = {
  elapsed_ms?: number | undefined;
  error_code?: string | undefined;
  job_id?: string | undefined;
  operation?: string | undefined;
  status?: string | undefined;
  trace_id?: string | undefined;
};

const write = (level: "error" | "info" | "warn", event: string, details: SafeLogDetails = {}) => {
  const payload = JSON.stringify({ event, ...details });
  if (level === "error") console.error(payload);
  else if (level === "warn") console.warn(payload);
  else console.info(payload);
};

export const logInfo = (event: string, details?: SafeLogDetails) => write("info", event, details);
export const logWarning = (event: string, details?: SafeLogDetails) =>
  write("warn", event, details);
export const logError = (event: string, details?: SafeLogDetails) => write("error", event, details);
