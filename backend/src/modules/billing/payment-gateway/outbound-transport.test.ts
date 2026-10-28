import assert from "node:assert/strict";
import { channel } from "node:diagnostics_channel";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { type TestContext, test } from "node:test";
import {
  createOutboundTransportObserver,
  type OutboundTransportReport,
} from "./outbound-transport";

type Received = { method: string; path: string; headers: IncomingMessage["headers"]; body: string };
type Reply = (request: Received, response: ServerResponse) => void;
const reference = (value: number) => value.toString(16).padStart(24, "0");
const [undiciMajor, undiciMinor] = (process.versions.undici ?? "0.0").split(".").map(Number);
// Node 22's native Undici 6 has no bodyChunkSent channel. Absence cannot prove wire identity.
const supportsBodyChunks = undiciMajor > 7 || (undiciMajor === 7 && undiciMinor >= 11);

// An actual loopback HTTP receiver: no gateway schema, approval, SDK replacement or fetch patch.
// It only drains bytes and responds 204. These tests do not create subscriptions or charge cards.
const receiver = async (context: TestContext, reply?: Reply) => {
  const requests: Received[] = [];
  const server = createServer({ maxHeaderSize: 128 * 1024 }, (request, response) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      const received = {
        method: request.method ?? "",
        path: request.url ?? "",
        headers: request.headers,
        body: Buffer.concat(chunks).toString("utf8"),
      };
      requests.push(received);
      if (reply) reply(received, response);
      else response.writeHead(204).end();
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  context.after(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
      server.closeAllConnections();
    });
  });
  const address = server.address();
  assert.ok(address && typeof address === "object");
  assert.equal(address.address, "127.0.0.1");
  const origin = `http://127.0.0.1:${address.port}`;
  const send = async (body: string, headers: Record<string, string> = {}, route = "/transport") => {
    const response = await fetch(`${origin}${route}`, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body,
      redirect: "error",
      signal: AbortSignal.timeout(5_000),
    });
    await response.arrayBuffer();
    return response.status;
  };
  return { origin, requests, send };
};

const observe = (
  context: TestContext,
  origin: string,
  sink?: (report: OutboundTransportReport) => void,
) => {
  const reports: OutboundTransportReport[] = [];
  const observer = createOutboundTransportObserver(
    { origin, path: "/transport" },
    sink ?? ((report) => reports.push(report)),
  );
  context.after(() => observer.dispose());
  return { ...observer, reports };
};

const safeKeys = [
  "attempt_ref",
  "operation",
  "stage",
  "observed_at",
  "request_sequence",
  "headers_observed",
  "body_sent",
  "device_session_header_present",
  "device_session_matches_input",
  "payer_email_present",
  "payer_email_matches_authenticated",
  "payload_payer_email_present",
  "payload_payer_email_matches_authenticated",
  "body_observation",
  "transport_result",
  "http_status",
  "observation_limit_reached",
  "observer_failed",
].sort();

test("real HTTP bytes match expected session/email without leaking payload or headers", async (t) => {
  const server = await receiver(t);
  const observer = observe(t, server.origin);
  const session = `${"A".repeat(115)}.${"B".repeat(115)}`;
  const email = "transport-only@example.invalid";
  const token = "transport-only-card-token";
  const authorization = "Bearer transport-only-not-a-credential";
  const body = JSON.stringify({ payer_email: email, card_token_id: token });
  assert.equal(
    await observer.run(
      {
        attemptRef: reference(1),
        deviceSessionId: session,
        authenticatedPayerEmail: email,
        payloadPayerEmail: email,
      },
      () => server.send(body, { "X-Meli-Session-Id": session, authorization }),
    ),
    204,
  );
  assert.equal(server.requests[0].headers["x-meli-session-id"], session);
  assert.equal(server.requests[0].body, body);
  assert.equal(observer.reports.length, 1);
  const report = observer.reports[0];
  assert.deepEqual(Object.keys(report).sort(), safeKeys);
  assert.equal(report.operation, "create_subscription");
  assert.equal(report.stage, "http_transport");
  assert.equal(report.attempt_ref, reference(1));
  assert.equal(report.request_sequence, 1);
  assert.equal(report.headers_observed, true);
  assert.equal(report.body_sent, true);
  assert.equal(report.device_session_header_present, true);
  assert.equal(report.device_session_matches_input, true);
  assert.equal(report.payer_email_present, supportsBodyChunks ? true : null);
  assert.equal(report.payer_email_matches_authenticated, supportsBodyChunks ? true : null);
  assert.equal(report.payload_payer_email_present, true);
  assert.equal(report.payload_payer_email_matches_authenticated, true);
  assert.equal(report.body_observation, supportsBodyChunks ? "complete" : "not_observed");
  assert.equal(report.transport_result, "response");
  assert.equal(report.http_status, 204);
  assert.equal(report.observation_limit_reached, false);
  assert.equal(report.observer_failed, false);
  assert.ok(Number.isFinite(Date.parse(report.observed_at)));
  const serialized = JSON.stringify(observer.reports);
  for (const value of [
    session,
    email,
    token,
    authorization,
    body,
    server.origin,
    "authorization",
    "card_token_id",
  ])
    assert.equal(serialized.includes(value), false);
});

test("missing headers and payer remain distinct from matching values", async (t) => {
  const server = await receiver(t);
  const observer = observe(t, server.origin);
  await observer.run(
    {
      attemptRef: reference(2),
      deviceSessionId: "expected-session",
      authenticatedPayerEmail: "expected@example.invalid",
    },
    () => server.send("{}"),
  );
  const report = observer.reports[0];
  assert.equal(report.device_session_header_present, false);
  assert.equal(report.device_session_matches_input, null);
  assert.equal(report.payer_email_present, supportsBodyChunks ? false : null);
  assert.equal(report.payer_email_matches_authenticated, null);
  assert.equal(report.payload_payer_email_present, false);
  assert.equal(report.payload_payer_email_matches_authenticated, null);
  assert.equal(report.body_observation, supportsBodyChunks ? "complete" : "not_observed");
});

test("actual session and payer mismatches are never reported as matches", async (t) => {
  const server = await receiver(t);
  const observer = observe(t, server.origin);
  await observer.run(
    {
      attemptRef: reference(3),
      deviceSessionId: "expected-session",
      authenticatedPayerEmail: "expected@example.invalid",
      payloadPayerEmail: "different@example.invalid",
    },
    () =>
      server.send(JSON.stringify({ payer_email: "different@example.invalid" }), {
        "x-meli-session-id": "different-session",
      }),
  );
  assert.equal(observer.reports[0].device_session_header_present, true);
  assert.equal(observer.reports[0].device_session_matches_input, false);
  assert.equal(observer.reports[0].payer_email_present, supportsBodyChunks ? true : null);
  assert.equal(
    observer.reports[0].payer_email_matches_authenticated,
    supportsBodyChunks ? false : null,
  );
  assert.equal(observer.reports[0].payload_payer_email_present, true);
  assert.equal(observer.reports[0].payload_payer_email_matches_authenticated, false);
});

test("duplicated session values serialized by native fetch cannot produce a false match", async (t) => {
  const server = await receiver(t);
  const observer = observe(t, server.origin);
  await observer.run({ attemptRef: reference(19), deviceSessionId: "first-session" }, async () => {
    const response = await fetch(`${server.origin}/transport`, {
      method: "POST",
      headers: [
        ["content-type", "application/json"],
        ["x-meli-session-id", "first-session"],
        ["X-Meli-Session-Id", "second-session"],
      ],
      body: "{}",
      redirect: "error",
      signal: AbortSignal.timeout(5_000),
    });
    assert.equal(response.status, 204);
    await response.arrayBuffer();
  });
  assert.equal(server.requests[0].headers["x-meli-session-id"], "first-session, second-session");
  assert.equal(observer.reports[0].device_session_header_present, true);
  assert.equal(observer.reports[0].device_session_matches_input, false);
});

test("invalid correlation cannot leak input or prevent real HTTP requests", async (t) => {
  const server = await receiver(t);
  const observer = observe(t, server.origin);
  const invalid = ["", "A".repeat(24), "a".repeat(23), "a".repeat(25), "identity@example.invalid"];
  for (const attemptRef of invalid) {
    assert.equal(await observer.run({ attemptRef }, () => server.send("{}")), 204);
  }
  assert.equal(server.requests.length, invalid.length);
  assert.equal(observer.reports.length, 0);
});

test("adapter payload comparison cannot substitute for actual HTTP payer evidence", async (t) => {
  const server = await receiver(t);
  const observer = observe(t, server.origin);
  await observer.run(
    {
      attemptRef: reference(18),
      authenticatedPayerEmail: "authenticated@example.invalid",
      payloadPayerEmail: "authenticated@example.invalid",
    },
    () => server.send(JSON.stringify({ payer_email: "wire-only@example.invalid" })),
  );
  const report = observer.reports[0];
  assert.equal(report.payload_payer_email_present, true);
  assert.equal(report.payload_payer_email_matches_authenticated, true);
  assert.equal(report.payer_email_matches_authenticated, supportsBodyChunks ? false : null);
  assert.equal(report.body_observation, supportsBodyChunks ? "complete" : "not_observed");
});

test("concurrent out-of-order responses cannot exchange context or session", async (t) => {
  const server = await receiver(t, (request, response) => {
    setTimeout(
      () => response.writeHead(204).end(),
      request.headers["x-meli-session-id"] === "session-first" ? 70 : 5,
    );
  });
  const observer = observe(t, server.origin);
  const operations = [
    {
      attemptRef: reference(4),
      deviceSessionId: "session-first",
      authenticatedPayerEmail: "first@example.invalid",
      payloadPayerEmail: "first@example.invalid",
    },
    {
      attemptRef: reference(5),
      deviceSessionId: "session-second",
      authenticatedPayerEmail: "second@example.invalid",
      payloadPayerEmail: "second@example.invalid",
    },
    { attemptRef: reference(6) },
  ];
  const statuses = await Promise.all(
    operations.map((expected) =>
      observer.run(expected, () =>
        server.send(
          JSON.stringify({
            payer_email:
              "authenticatedPayerEmail" in expected ? expected.authenticatedPayerEmail : undefined,
          }),
          expected.deviceSessionId ? { "x-meli-session-id": expected.deviceSessionId } : {},
        ),
      ),
    ),
  );
  assert.deepEqual(statuses, [204, 204, 204]);
  assert.equal(observer.reports.length, 3);
  for (const expected of operations) {
    const report = observer.reports.find((item) => item.attempt_ref === expected.attemptRef);
    assert.ok(report);
    assert.equal(report.request_sequence, 1);
    assert.equal(report.device_session_header_present, Boolean(expected.deviceSessionId));
    assert.equal(report.device_session_matches_input, expected.deviceSessionId ? true : null);
    assert.equal(
      report.payer_email_matches_authenticated,
      supportsBodyChunks && expected.deviceSessionId ? true : null,
    );
    assert.equal(
      report.payload_payer_email_matches_authenticated,
      expected.deviceSessionId ? true : null,
    );
  }
});

test("reused observer and keepalive connection do not inherit previous values", async (t) => {
  const server = await receiver(t);
  const observer = observe(t, server.origin);
  await observer.run({ attemptRef: reference(7), deviceSessionId: "first-session" }, () =>
    server.send("{}", { "x-meli-session-id": "first-session" }),
  );
  await observer.run({ attemptRef: reference(8) }, () => server.send("{}"));
  assert.equal(observer.reports.length, 2);
  assert.equal(observer.reports[1].attempt_ref, reference(8));
  assert.equal(observer.reports[1].request_sequence, 1);
  assert.equal(observer.reports[1].device_session_header_present, false);
  assert.equal(observer.reports[1].device_session_matches_input, null);
});

test("multiple actual HTTP attempts are correlated and numbered within one operation", async (t) => {
  const server = await receiver(t);
  const observer = observe(t, server.origin);
  await observer.run({ attemptRef: reference(9) }, async () => {
    await server.send("{}");
    await server.send("{}");
  });
  assert.deepEqual(
    observer.reports.map((report) => report.request_sequence),
    [1, 2],
  );
  assert.ok(observer.reports.every((report) => report.attempt_ref === reference(9)));
});

test("network failure preserves rejection and sanitized transport evidence", async (t) => {
  const server = await receiver(t, (_request, response) => response.destroy());
  const observer = observe(t, server.origin);
  let original: unknown;
  try {
    await observer.run({ attemptRef: reference(10) }, async () => {
      try {
        return await server.send("{}");
      } catch (error) {
        original = error;
        throw error;
      }
    });
    assert.fail("Expected real loopback socket failure");
  } catch (error) {
    assert.equal(error, original);
  }
  assert.equal(observer.reports.length, 1);
  assert.equal(observer.reports[0].transport_result, "error");
  assert.equal(observer.reports[0].http_status, null);
  assert.equal(JSON.stringify(observer.reports).includes("socket"), false);
});

test("throwing diagnostic sink cannot break a successful HTTP operation", async (t) => {
  const server = await receiver(t);
  let calls = 0;
  const observer = observe(t, server.origin, () => {
    calls++;
    throw new Error("local diagnostic sink unavailable");
  });
  assert.equal(await observer.run({ attemptRef: reference(11) }, () => server.send("{}")), 204);
  assert.equal(calls, 1);
  assert.equal(server.requests.length, 1);
});

test("throwing diagnostic sink cannot replace the original network rejection", async (t) => {
  const server = await receiver(t, (_request, response) => response.destroy());
  let calls = 0;
  const observer = observe(t, server.origin, () => {
    calls++;
    throw new Error("local diagnostic sink unavailable");
  });
  let original: unknown;
  await assert.rejects(
    observer.run({ attemptRef: reference(20) }, async () => {
      try {
        return await server.send("{}");
      } catch (error) {
        original = error;
        throw error;
      }
    }),
    (error: unknown) => original !== undefined && error === original,
  );
  assert.equal(calls, 1);
  assert.equal(server.requests.length, 1);
});

test("unit malformed diagnostic event cannot throw or claim a transport observation", async (t) => {
  const observer = observe(t, "http://127.0.0.1:1");
  // Unit fault injection only; deliberately separate from the native-fetch transport evidence.
  // There is no HTTP call, provider response or synthetic approval in this case.
  const malformedRequest = {
    get method() {
      throw new Error("malformed-observer-input@example.invalid");
    },
  };
  assert.equal(
    await observer.run({ attemptRef: reference(21) }, async () => {
      channel("undici:request:create").publish({ request: malformedRequest });
      await new Promise<void>((resolve) => setImmediate(resolve));
      return "unchanged";
    }),
    "unchanged",
  );
  assert.equal(observer.reports.length, 1);
  assert.equal(observer.reports[0].observer_failed, true);
  assert.equal(observer.reports[0].request_sequence, 0);
  assert.equal(observer.reports[0].transport_result, "not_observed");
  assert.equal(observer.reports[0].headers_observed, false);
  assert.equal(JSON.stringify(observer.reports).includes("malformed-observer-input"), false);
});

test("other origin, path, reads, and cancel-like methods are excluded", async (t) => {
  const server = await receiver(t);
  const other = await receiver(t);
  const observer = observe(t, server.origin);
  await observer.run({ attemptRef: reference(12) }, async () => {
    await other.send("{}");
    await server.send("{}", {}, "/other");
    for (const method of ["GET", "PUT", "DELETE"]) {
      const response = await fetch(`${server.origin}/transport`, {
        method,
        signal: AbortSignal.timeout(5_000),
        redirect: "error",
      });
      await response.arrayBuffer();
    }
  });
  assert.equal(observer.reports.length, 1);
  assert.equal(observer.reports[0].request_sequence, 0);
  assert.equal(observer.reports[0].transport_result, "not_observed");
  assert.equal(observer.reports[0].headers_observed, false);
  assert.equal(observer.reports[0].device_session_header_present, null);
  assert.equal(observer.reports[0].payer_email_present, null);
});

test("action without HTTP is unknown rather than a positive observation", async (t) => {
  const server = await receiver(t);
  const observer = observe(t, server.origin);
  assert.equal(
    await observer.run(
      {
        attemptRef: reference(13),
        authenticatedPayerEmail: "input-only@example.invalid",
        payloadPayerEmail: "input-only@example.invalid",
      },
      async () => 42,
    ),
    42,
  );
  assert.equal(observer.reports.length, 1);
  assert.equal(observer.reports[0].request_sequence, 0);
  assert.equal(observer.reports[0].body_observation, "not_observed");
  assert.equal(observer.reports[0].transport_result, "not_observed");
  assert.equal(observer.reports[0].body_sent, false);
  assert.equal(observer.reports[0].http_status, null);
  assert.equal(observer.reports[0].payer_email_matches_authenticated, null);
  assert.equal(observer.reports[0].payload_payer_email_present, true);
  assert.equal(observer.reports[0].payload_payer_email_matches_authenticated, true);
  assert.equal(JSON.stringify(observer.reports).includes("input-only@example.invalid"), false);
});

test("invalid JSON does not leak body or infer payer identity", async (t) => {
  const server = await receiver(t);
  const observer = observe(t, server.origin);
  await observer.run({ attemptRef: reference(14) }, () =>
    server.send('{"payer_email":"incomplete@example.invalid"'),
  );
  assert.equal(
    observer.reports[0].body_observation,
    supportsBodyChunks ? "invalid_json" : "not_observed",
  );
  assert.equal(observer.reports[0].payer_email_present, null);
  assert.equal(observer.reports[0].payer_email_matches_authenticated, null);
  assert.equal(JSON.stringify(observer.reports).includes("incomplete@example.invalid"), false);
});

test("body observation is bounded at 16 KiB without changing actual transport", async (t) => {
  const server = await receiver(t);
  const observer = observe(t, server.origin);
  const body = JSON.stringify({
    payer_email: "large@example.invalid",
    padding: "x".repeat(17 * 1024),
  });
  assert.equal(
    await observer.run(
      { attemptRef: reference(15), authenticatedPayerEmail: "large@example.invalid" },
      () => server.send(body),
    ),
    204,
  );
  assert.equal(server.requests[0].body, body);
  assert.equal(
    observer.reports[0].body_observation,
    supportsBodyChunks ? "over_limit" : "not_observed",
  );
  assert.equal(observer.reports[0].payer_email_present, null);
  assert.equal(observer.reports[0].payer_email_matches_authenticated, null);
  assert.equal(observer.reports[0].observation_limit_reached, supportsBodyChunks);
});

test("serialized headers over 64 KiB are not copied into diagnostic output", async (t) => {
  const server = await receiver(t);
  const observer = observe(t, server.origin);
  const largeHeader = "h".repeat(65 * 1024);
  assert.equal(
    await observer.run({ attemptRef: reference(16) }, () =>
      server.send("{}", { "x-observation-padding": largeHeader }),
    ),
    204,
  );
  assert.equal(server.requests[0].headers["x-observation-padding"], largeHeader);
  assert.equal(observer.reports[0].observation_limit_reached, true);
  assert.equal(observer.reports[0].device_session_header_present, null);
  assert.equal(JSON.stringify(observer.reports).includes(largeHeader), false);
});

test("request cap bounds reports without preventing remaining real requests", async (t) => {
  const server = await receiver(t);
  const observer = observe(t, server.origin);
  await observer.run({ attemptRef: reference(17) }, async () => {
    for (let index = 0; index < 10; index++) assert.equal(await server.send("{}"), 204);
  });
  assert.equal(server.requests.length, 10);
  assert.equal(observer.reports.length, 8);
  assert.ok(observer.reports.some((report) => report.observation_limit_reached));
});

test("unscoped requests are ignored and disposal removes subscribers", async (t) => {
  const server = await receiver(t);
  const observer = observe(t, server.origin);
  await server.send("{}");
  assert.equal(observer.reports.length, 0);
  observer.dispose();
  observer.dispose();
  await server.send("{}");
  assert.equal(observer.reports.length, 0);
});
