type Environment = Record<string, string | undefined>;

export function readMetaConfig(env: Environment = process.env) {
  const datasetId = env.META_DATASET_ID?.trim() ?? "";
  const apiVersion = env.META_GRAPH_API_VERSION?.trim() ?? "";
  const token = env.META_CAPI_ACCESS_TOKEN?.trim() ?? "";
  return {
    enabled: env.META_CAPI_ENABLED === "true",
    datasetId: /^\d{5,25}$/.test(datasetId) ? datasetId : null,
    apiVersion: /^v\d{1,3}\.\d{1,2}$/.test(apiVersion) ? apiVersion : null,
    token: token && !/[\r\n]/.test(token) ? token : null,
  };
}
