const PUBLISHED_MARKER =
  /(^|[^a-z])(homolog(?:ation)?|homol|hml|prod|production|prd|stag(?:e|ing)?|stg)([^a-z]|$)/i;
const DISPOSABLE_MARKER = /(^|[^a-z])(dev|development|local|sandbox|test|testing|ci)([^a-z]|$)/i;
const SAFE_PREFIX = /^[a-z0-9][a-z0-9/_=.+-]{1,254}$/i;
const DISPOSABLE_RUNTIME_ENVIRONMENTS = new Set([
  "ci",
  "dev",
  "development",
  "local",
  "test",
  "testing",
]);

export const classifyResetRuntimeEnvironment = (nodeEnv) => {
  const normalized = String(nodeEnv || "")
    .trim()
    .toLowerCase();

  if (PUBLISHED_MARKER.test(normalized)) return "published";
  if (DISPOSABLE_RUNTIME_ENVIRONMENTS.has(normalized)) return "safe";
  return "not_explicitly_disposable";
};

export const classifyR2ResetTarget = ({ bucketName, endpoint, prefix }) => {
  const normalizedBucket = String(bucketName || "").trim();
  const normalizedEndpoint = String(endpoint || "").trim();
  const normalizedPrefix = String(prefix || "").trim();
  const targetLabel = `${normalizedBucket} ${normalizedEndpoint} ${normalizedPrefix}`;

  if (PUBLISHED_MARKER.test(targetLabel)) return "published_marker";

  const disposableBucket = DISPOSABLE_MARKER.test(normalizedBucket);
  const dedicatedPrefix =
    normalizedPrefix.length > 0 &&
    normalizedPrefix.endsWith("/") &&
    SAFE_PREFIX.test(normalizedPrefix) &&
    !normalizedPrefix.includes("..") &&
    DISPOSABLE_MARKER.test(normalizedPrefix);

  if (!disposableBucket && !dedicatedPrefix) return "not_explicitly_disposable";

  return "safe";
};
