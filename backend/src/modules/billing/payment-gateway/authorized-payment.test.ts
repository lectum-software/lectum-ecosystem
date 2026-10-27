import assert from "node:assert/strict";
import { test } from "node:test";
import {
  AuthorizedPaymentReadError,
  authorizedPaymentElapsedMs,
  authorizedPaymentReadFailure,
  isAuthorizedPaymentId,
  projectAuthorizedPayment,
  readAuthorizedPayment,
} from "./authorized-payment";

test("authorized payment projection distinguishes invoice status and strips all other fields", () => {
  assert.deepEqual(
    projectAuthorizedPayment({
      preapproval_id: "subscription-local-test",
      external_reference: "attempt-local-test",
      status: "scheduled",
      payer_email: "not-returned@example.invalid",
      payment: {
        id: 123,
        status: "rejected",
        status_detail: "cc_rejected_high_risk",
        card: { last_four_digits: "not-returned" },
      },
    }),
    {
      gateway_subscription_id: "subscription-local-test",
      gateway_payment_id: "123",
      external_reference: "attempt-local-test",
      status: "rejected",
      status_detail: "cc_rejected_high_risk",
    },
  );
});

test("missing payment does not become invoice scheduled status or an approval", () => {
  const empty = {
    gateway_subscription_id: null,
    gateway_payment_id: null,
    external_reference: null,
    status: null,
    status_detail: null,
  };
  for (const input of [null, undefined, {}, [], { status: "scheduled" }, { payment: [] }]) {
    assert.deepEqual(projectAuthorizedPayment(input), empty);
  }
  assert.deepEqual(
    projectAuthorizedPayment({
      preapproval_id: "unsafe\n",
      external_reference: "https://example.invalid",
      payment: { id: Number.MAX_SAFE_INTEGER + 1, status: "approved\n", status_detail: {} },
    }),
    empty,
  );
});

test("authorized payment identifiers cannot alter fixed API path or carry control characters", () => {
  for (const input of ["123", "abc-def_123", "x".repeat(128)]) {
    assert.equal(isAuthorizedPaymentId(input), true);
  }
  for (const input of ["", "x".repeat(129), "../users/me", "abc?x=1", "abc\n", "á", 123]) {
    assert.equal(isAuthorizedPaymentId(input), false);
  }
});

// Synthetic transport failures verify local behavior, never provider approval or live delivery.
test("diagnostic validation makes no request and exposes only a fixed failure category", async (t) => {
  const request = t.mock.method(globalThis, "fetch", async () => {
    throw new Error("request must not happen");
  });
  for (const id of ["../users/me", "unsafe\r\n", "https://example.invalid", ""]) {
    await assert.rejects(readAuthorizedPayment(id, "not-a-credential"), (error) => {
      assert.deepEqual(authorizedPaymentReadFailure(error), {
        stage: "resource_validation",
        failure_kind: "invalid_resource",
      });
      assert.doesNotMatch(String(error), /users|unsafe|example|credential/);
      return true;
    });
  }
  assert.equal(request.mock.callCount(), 0);
});

test("HTTP diagnostic errors do not consume or carry the provider response body", async (t) => {
  const response = new Response("private provider token payer@example.invalid", { status: 403 });
  const body = t.mock.method(response, "json", async () => {
    throw new Error("body must not be read");
  });
  const request = t.mock.method(globalThis, "fetch", async () => response);
  await assert.rejects(readAuthorizedPayment("invoice-unit", "not-a-credential"), (error) => {
    assert.deepEqual(authorizedPaymentReadFailure(error), {
      stage: "provider_get",
      failure_kind: "http",
      http_status: 403,
    });
    assert.doesNotMatch(JSON.stringify(error), /private|payer|credential|invoice-unit/);
    assert.equal(Object.hasOwn(error as object, "cause"), false);
    return true;
  });
  assert.equal(body.mock.callCount(), 0);
  assert.equal(request.mock.callCount(), 1);
});

test("corrupt JSON is distinguished from a network failure without retaining raw messages", async (t) => {
  const request = t.mock.method(
    globalThis,
    "fetch",
    async () => new Response("private token payer@example.invalid", { status: 200 }),
  );
  await assert.rejects(readAuthorizedPayment("invoice-unit", "not-a-credential"), (error) => {
    assert.deepEqual(authorizedPaymentReadFailure(error), {
      stage: "provider_get",
      failure_kind: "invalid_json",
      http_status: 200,
    });
    assert.doesNotMatch(String(error) + JSON.stringify(error), /payer|token|invoice-unit/);
    return true;
  });
  request.mock.mockImplementation(async () => {
    throw new TypeError("fetch failed: private token payer@example.invalid");
  });
  await assert.rejects(readAuthorizedPayment("invoice-unit", "not-a-credential"), (error) => {
    assert.deepEqual(authorizedPaymentReadFailure(error), {
      stage: "provider_get",
      failure_kind: "network",
    });
    assert.doesNotMatch(String(error) + JSON.stringify(error), /payer|token|invoice-unit/);
    return true;
  });
  assert.equal(request.mock.callCount(), 2);
});

test("the same 3s deadline bounds both headers and JSON without retrying the GET", async (t) => {
  let controller = new AbortController();
  const deadline = t.mock.method(AbortSignal, "timeout", (duration: number) => {
    assert.equal(duration, 3_000);
    return controller.signal;
  });
  const request = t.mock.method(
    globalThis,
    "fetch",
    async (_url: Parameters<typeof fetch>[0], options?: Parameters<typeof fetch>[1]) => {
      assert.equal(options?.signal, controller.signal);
      controller.abort();
      throw new DOMException("private timeout message", "AbortError");
    },
  );
  await assert.rejects(readAuthorizedPayment("invoice-unit", "not-a-credential"), (error) => {
    assert.deepEqual(authorizedPaymentReadFailure(error), {
      stage: "provider_get",
      failure_kind: "timeout",
    });
    return true;
  });
  assert.equal(request.mock.callCount(), 1);
  controller = new AbortController();
  const response = new Response("unused", { status: 200 });
  t.mock.method(response, "json", async () => {
    controller.abort();
    throw new DOMException("private timeout message", "AbortError");
  });
  request.mock.mockImplementation(async () => response);
  await assert.rejects(readAuthorizedPayment("invoice-unit", "not-a-credential"), (error) => {
    assert.deepEqual(authorizedPaymentReadFailure(error), {
      stage: "provider_get",
      failure_kind: "timeout",
      http_status: 200,
    });
    return true;
  });
  assert.equal(request.mock.callCount(), 2);
  assert.equal(deadline.mock.callCount(), 2);
});

test("spoofed or mutated diagnostics cannot introduce arbitrary text, status or elapsed values", (t) => {
  const expected = { stage: "provider_get", failure_kind: "unexpected" };
  assert.deepEqual(
    authorizedPaymentReadFailure({ stage: "provider_get", failureKind: "http", httpStatus: 400 }),
    expected,
  );
  const mutated = new AuthorizedPaymentReadError("provider_get", "http", 400);
  Object.assign(mutated, { failureKind: "private SQL user@example.invalid" });
  assert.deepEqual(authorizedPaymentReadFailure(mutated), expected);
  for (const invalidStatus of [0, 600, 403.5, Infinity, NaN, "403", "private"]) {
    const invalid = new AuthorizedPaymentReadError("provider_get", "http");
    Object.assign(invalid, { httpStatus: invalidStatus });
    assert.deepEqual(authorizedPaymentReadFailure(invalid), {
      stage: "provider_get",
      failure_kind: "http",
    });
  }
  const now = t.mock.method(performance, "now", () => 100.5);
  assert.equal(authorizedPaymentElapsedMs(95), 6);
  assert.equal(authorizedPaymentElapsedMs(200), 0);
  assert.equal(authorizedPaymentElapsedMs(NaN), 0);
  now.mock.mockImplementation(() => Number.MAX_VALUE);
  assert.equal(authorizedPaymentElapsedMs(0), Number.MAX_SAFE_INTEGER);
});
