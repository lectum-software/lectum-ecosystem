const SIGNATURE_HEADER = "webhook-signature";
const MAX_PAYLOAD_BYTES = 256 * 1024;
const SIGNATURE_TOLERANCE_SECONDS = 5 * 60;
const TARGET_TIMEOUT_MS = 10_000;

const TARGETS = {
  homolog: "https://homolog-api.lectum.com.br/api/public/video-stream/webhook",
  production: "https://api.lectum.com.br/api/public/video-stream/webhook",
};

const textEncoder = new TextEncoder();

const response = (status, message, headers = {}) =>
  new Response(status === 204 || status === 304 ? null : message, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8", ...headers },
  });

const parseSignature = (header) => {
  if (!header) return null;

  const values = new Map(
    header.split(",").map((part) => {
      const [key, ...rest] = part.trim().split("=");
      return [key, rest.join("=")];
    }),
  );
  const timestamp = Number(values.get("time"));
  const signature = values.get("sig1")?.trim().toLowerCase() ?? "";

  if (!Number.isInteger(timestamp) || !/^[a-f0-9]{64}$/.test(signature)) return null;
  return { signature, timestamp };
};

const hexToBytes = (hex) => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
};

const constantTimeEquals = (left, right) => {
  if (left.length !== right.length) return false;

  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
};

const isTargetUrl = (value, expected) => {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return parsed.href === expected ? parsed.href : null;
  } catch {
    return null;
  }
};

const readConfiguration = (environment) => {
  const secret = environment.STREAM_WEBHOOK_SECRET?.trim();
  const homolog = isTargetUrl(environment.HOMOLOG_WEBHOOK_URL?.trim(), TARGETS.homolog);
  const productionValue = environment.PRODUCTION_WEBHOOK_URL?.trim();
  const production = isTargetUrl(productionValue, TARGETS.production);

  if (!secret || !homolog || (productionValue && !production)) return null;

  return {
    secret,
    targets: [homolog, ...(production ? [production] : [])],
  };
};

const signedPayload = (timestamp, payload) => {
  const prefix = textEncoder.encode(`${timestamp}.`);
  const result = new Uint8Array(prefix.length + payload.length);
  result.set(prefix);
  result.set(payload, prefix.length);
  return result;
};

const signatureIsValid = async ({ header, now, payload, secret }) => {
  const parsed = parseSignature(header);
  if (!parsed) return false;

  const ageSeconds = Math.abs(Math.floor(now / 1000) - parsed.timestamp);
  if (ageSeconds > SIGNATURE_TOLERANCE_SECONDS) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expected = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, signedPayload(parsed.timestamp, payload)),
  );

  return constantTimeEquals(expected, hexToBytes(parsed.signature));
};

const forward = async ({ fetchImpl, payload, signature, target, timeoutMs }) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetchImpl(target, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [SIGNATURE_HEADER]: signature,
      },
      body: payload,
      redirect: "error",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
};

export const createWebhookRouter = ({
  fetchImpl = fetch,
  now = () => Date.now(),
  timeoutMs = TARGET_TIMEOUT_MS,
} = {}) => ({
  async fetch(request, environment) {
    if (request.method !== "POST") return response(405, "Método não permitido.", { allow: "POST" });

    const configuration = readConfiguration(environment);
    if (!configuration) return response(503, "Indisponível.");

    const contentLength = Number(request.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_PAYLOAD_BYTES) {
      return response(413, "Solicitação muito grande.");
    }

    const payload = new Uint8Array(await request.arrayBuffer());
    if (payload.length === 0 || payload.length > MAX_PAYLOAD_BYTES) {
      return response(413, "Solicitação muito grande.");
    }

    const signature = request.headers.get(SIGNATURE_HEADER);
    if (!(await signatureIsValid({ header: signature, now: now(), payload, secret: configuration.secret }))) {
      return response(401, "Não autorizado.");
    }

    const deliveries = await Promise.allSettled(
      configuration.targets.map((target) =>
        forward({ fetchImpl, payload, signature, target, timeoutMs }),
      ),
    );
    if (deliveries.some((delivery) => delivery.status !== "fulfilled" || !delivery.value.ok)) {
      return response(502, "Não foi possível concluir.");
    }

    return response(204, "");
  },
});

export default createWebhookRouter();
