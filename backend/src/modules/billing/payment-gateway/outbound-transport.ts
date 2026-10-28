import { AsyncLocalStorage } from "node:async_hooks";
import { channel } from "node:diagnostics_channel";

export type OutboundTransportReport = {
  attempt_ref: string;
  operation: "create_subscription";
  stage: "http_transport";
  observed_at: string;
  request_sequence: number;
  headers_observed: boolean;
  body_sent: boolean;
  device_session_header_present: boolean | null;
  device_session_matches_input: boolean | null;
  payload_payer_email_present: boolean;
  payload_payer_email_matches_authenticated: boolean | null;
  payer_email_present: boolean | null;
  payer_email_matches_authenticated: boolean | null;
  body_observation: "complete" | "not_observed" | "over_limit" | "invalid_json" | "incomplete";
  transport_result: "response" | "error" | "not_observed" | "incomplete";
  http_status: number | null;
  observation_limit_reached: boolean;
  observer_failed: boolean;
};

type Expected = {
  attemptRef: string;
  deviceSessionId?: string;
  authenticatedPayerEmail?: string;
  payloadPayerEmail?: string;
};
type RequestState = {
  report: OutboundTransportReport;
  buffer?: Buffer;
  bytes: number;
};
type Context = {
  active: boolean;
  expected: Expected;
  requests: Map<object, RequestState>;
  limitReached: boolean;
  failed: boolean;
};
type RecordValue = Record<string, unknown>;

const MAX_REQUESTS = 8;
const MAX_BODY_BYTES = 16 * 1024;
const MAX_HEADER_BYTES = 64 * 1024;
const record = (value: unknown): value is RecordValue =>
  typeof value === "object" && value !== null;
const nonempty = (value: unknown): value is string => typeof value === "string" && value.length > 0;
const matches = (actual: unknown, expected: unknown): boolean | null =>
  nonempty(actual) && nonempty(expected) ? actual === expected : null;
const clearBuffer = (state: RequestState) => {
  state.buffer?.fill(0);
  state.buffer = undefined;
  state.bytes = 0;
};

const initialReport = (expected: Expected, sequence: number): OutboundTransportReport => ({
  attempt_ref: expected.attemptRef,
  operation: "create_subscription",
  stage: "http_transport",
  observed_at: "",
  request_sequence: sequence,
  headers_observed: false,
  body_sent: false,
  device_session_header_present: null,
  device_session_matches_input: null,
  payload_payer_email_present: nonempty(expected.payloadPayerEmail),
  payload_payer_email_matches_authenticated: matches(
    expected.payloadPayerEmail,
    expected.authenticatedPayerEmail,
  ),
  payer_email_present: null,
  payer_email_matches_authenticated: null,
  body_observation: "not_observed",
  transport_result: sequence === 0 ? "not_observed" : "incomplete",
  http_status: null,
  observation_limit_reached: false,
  observer_failed: false,
});

const observeHeaders = (state: RequestState, expected: Expected, headers: unknown) => {
  if (typeof headers !== "string") return;
  if (Buffer.byteLength(headers) > MAX_HEADER_BYTES) {
    state.report.observation_limit_reached = true;
    return;
  }
  const values: string[] = [];
  for (const line of headers.split("\r\n")) {
    const separator = line.indexOf(":");
    if (line.slice(0, separator).toLowerCase() === "x-meli-session-id") {
      values.push(line.slice(separator + 1).trim());
    }
  }
  state.report.headers_observed = true;
  state.report.device_session_header_present = values.length > 0;
  state.report.device_session_matches_input =
    values.length > 1 && nonempty(expected.deviceSessionId)
      ? false
      : matches(values[0], expected.deviceSessionId);
};

const observeChunk = (state: RequestState, chunk: unknown) => {
  if (state.report.body_sent || state.report.body_observation === "over_limit") return;
  if (typeof chunk !== "string" && !(chunk instanceof Uint8Array)) return;
  const length = typeof chunk === "string" ? Buffer.byteLength(chunk) : chunk.byteLength;
  if (state.bytes + length > MAX_BODY_BYTES) {
    clearBuffer(state);
    state.report.body_observation = "over_limit";
    state.report.observation_limit_reached = true;
    return;
  }
  state.buffer ??= Buffer.alloc(MAX_BODY_BYTES);
  if (typeof chunk === "string") state.buffer.write(chunk, state.bytes, length);
  else state.buffer.set(chunk, state.bytes);
  state.bytes += length;
  state.report.body_observation = "incomplete";
};

const observeBodySent = (state: RequestState, expected: Expected) => {
  state.report.body_sent = true;
  // Node 22/Undici 6 has no bodyChunkSent. Never consume request.body as a fallback.
  if (!state.buffer) return;
  try {
    const body: unknown = JSON.parse(state.buffer.toString("utf8", 0, state.bytes));
    const email = record(body) ? body.payer_email : undefined;
    state.report.payer_email_present = nonempty(email);
    state.report.payer_email_matches_authenticated = matches(
      email,
      expected.authenticatedPayerEmail,
    );
    state.report.body_observation = "complete";
  } catch {
    state.report.body_observation = "invalid_json";
  } finally {
    clearBuffer(state);
  }
};

/** Passive, bounded observation; no HTTP client, credentials, response bodies or retries. */
export const createOutboundTransportObserver = (
  target: { origin: string; path: string },
  sink: (report: OutboundTransportReport) => void,
) => {
  const storage = new AsyncLocalStorage<Context>();
  const owners = new WeakMap<object, Context>();
  const subscriptions: Array<() => void> = [];

  const subscribe = (
    name: string,
    observe: (event: RecordValue, context: Context, request: object) => void,
    creating = false,
  ) => {
    const diagnosticChannel = channel(name);
    const listener = (message: unknown) => {
      let context: Context | undefined;
      // diagnostics_channel subscribers must not throw, even for malformed events.
      try {
        if (!record(message) || !record(message.request)) return;
        const request = message.request;
        context = creating ? storage.getStore() : owners.get(request);
        if (!context?.active) return;
        observe(message, context, request);
      } catch {
        if (context) context.failed = true;
      }
    };
    diagnosticChannel.subscribe(listener);
    subscriptions.push(() => diagnosticChannel.unsubscribe(listener));
  };

  subscribe(
    "undici:request:create",
    (_event, context, request) => {
      if (!record(request)) return;
      if (
        request.method !== "POST" ||
        String(request.origin) !== target.origin ||
        request.path !== target.path ||
        context.requests.has(request)
      ) {
        return;
      }
      if (context.requests.size >= MAX_REQUESTS) {
        context.limitReached = true;
        return;
      }
      owners.set(request, context);
      context.requests.set(request, {
        report: initialReport(context.expected, context.requests.size + 1),
        bytes: 0,
      });
    },
    true,
  );
  const observeRequest = (
    name: string,
    observe: (event: RecordValue, state: RequestState, context: Context) => void,
  ) =>
    subscribe(name, (event, context, request) => {
      const state = context.requests.get(request);
      if (state) observe(event, state, context);
    });
  observeRequest("undici:client:sendHeaders", (event, state, context) =>
    observeHeaders(state, context.expected, event.headers),
  );
  observeRequest("undici:request:bodyChunkSent", (event, state) =>
    observeChunk(state, event.chunk),
  );
  observeRequest("undici:request:bodySent", (_event, state, context) =>
    observeBodySent(state, context.expected),
  );
  observeRequest("undici:request:headers", (event, state) => {
    const status = record(event.response) ? event.response.statusCode : undefined;
    if (typeof status === "number" && Number.isInteger(status) && status >= 100 && status <= 599) {
      state.report.http_status = status;
      state.report.transport_result = "response";
    }
  });
  observeRequest("undici:request:error", (_event, state) => {
    state.report.transport_result = "error";
    clearBuffer(state);
  });

  return {
    async run<T>(expected: Expected, action: () => Promise<T>): Promise<T> {
      // Invalid correlation must not leak arbitrary input or prevent the real operation.
      if (!/^[a-f0-9]{24}$/.test(expected.attemptRef)) return action();
      const context: Context = {
        active: true,
        expected: { ...expected },
        requests: new Map(),
        limitReached: false,
        failed: false,
      };
      return storage.run(context, async () => {
        try {
          return await action();
        } finally {
          context.active = false;
          const reports = context.requests.size
            ? Array.from(context.requests.values(), (state) => state.report)
            : [initialReport(context.expected, 0)];
          for (const [request, state] of context.requests) {
            clearBuffer(state);
            owners.delete(request);
          }
          context.requests.clear();
          context.expected = { attemptRef: "" };
          for (const report of reports) {
            try {
              sink({
                ...report,
                observed_at: new Date().toISOString(),
                observation_limit_reached: report.observation_limit_reached || context.limitReached,
                observer_failed: context.failed,
              });
            } catch {
              // Observability must not mask success/error or trigger another payment.
            }
          }
        }
      });
    },
    dispose() {
      for (const unsubscribe of subscriptions) unsubscribe();
      subscriptions.length = 0;
    },
  };
};
