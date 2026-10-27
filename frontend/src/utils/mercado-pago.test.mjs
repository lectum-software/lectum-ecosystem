import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getMercadoPagoDeviceSessionId } from "./mercado-pago.ts";

const withBrowserWindow = (browserWindow, run) => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: browserWindow,
  });

  try {
    run();
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else delete globalThis.window;
  }
};

test("sessão antifraude é opcional e segura sem browser ou sem valor do SDK", () => {
  assert.equal(typeof window, "undefined");
  assert.equal(getMercadoPagoDeviceSessionId(), undefined);
  assert.equal(getMercadoPagoDeviceSessionId(true), undefined);
  withBrowserWindow({}, () => assert.equal(getMercadoPagoDeviceSessionId(true), undefined));
  withBrowserWindow({ deviceId: "lectum-device", "x-device": "lectum-device" }, () => {
    assert.equal(getMercadoPagoDeviceSessionId(true), undefined);
  });
});

test("backend sem capability true não permite ler nem enviar a sessão", () => {
  let reads = 0;
  const browserWindow = Object.defineProperty({}, "MP_DEVICE_SESSION_ID", {
    get() {
      reads += 1;
      return "session-ready";
    },
  });
  withBrowserWindow(browserWindow, () => {
    assert.equal(getMercadoPagoDeviceSessionId(), undefined);
    for (const capability of [undefined, false, null, 0, 1, "true", {}]) {
      assert.equal(getMercadoPagoDeviceSessionId(capability), undefined);
    }
    assert.equal(reads, 0);
    assert.equal(getMercadoPagoDeviceSessionId(true), "session-ready");
    assert.equal(reads, 1);
    assert.equal(getMercadoPagoDeviceSessionId(false), undefined);
    assert.equal(reads, 1);
  });
});

test("aceita somente identificador ASCII alfanumérico, hífen e underscore de 1 a 256 caracteres", () => {
  for (const value of ["a", "_", "-", "Session_123-ABC", "a".repeat(256)]) {
    withBrowserWindow({ MP_DEVICE_SESSION_ID: value }, () => {
      assert.equal(getMercadoPagoDeviceSessionId(true), value);
    });
  }
});

test("omite valores inválidos sem converter, truncar ou remover whitespace", () => {
  const values = [
    undefined,
    null,
    false,
    123,
    {},
    ["session"],
    "",
    "a".repeat(257),
    " session",
    "session ",
    "session\n",
    "session\r",
    "session\t",
    "session\0",
    "sessão",
    "session/123",
    "session.123",
    "session:123",
    "session+123",
    "session=123",
  ];

  for (const value of values) {
    withBrowserWindow({ MP_DEVICE_SESSION_ID: value }, () => {
      assert.equal(getMercadoPagoDeviceSessionId(true), undefined);
    });
  }
});

test("falha de leitura do SDK degrada para ausência sem bloquear submit", () => {
  const browserWindow = Object.defineProperty({}, "MP_DEVICE_SESSION_ID", {
    get() {
      throw new Error("unavailable");
    },
  });
  withBrowserWindow(browserWindow, () => {
    assert.equal(getMercadoPagoDeviceSessionId(true), undefined);
  });
});

test("lê a sessão corrente em cada chamada, sem guardar valor anterior", () => {
  const browserWindow = { MP_DEVICE_SESSION_ID: "session-first" };
  withBrowserWindow(browserWindow, () => {
    assert.equal(getMercadoPagoDeviceSessionId(true), "session-first");
    browserWindow.MP_DEVICE_SESSION_ID = "session-second";
    assert.equal(getMercadoPagoDeviceSessionId(true), "session-second");
    delete browserWindow.MP_DEVICE_SESSION_ID;
    assert.equal(getMercadoPagoDeviceSessionId(true), undefined);
  });
});

test("checkout e cartão capturam a sessão opcional dentro do submit e preservam o SDK antifraude", () => {
  for (const route of ["checkout", "card"]) {
    const source = readFileSync(
      new URL(`../app/app/professional/billing/${route}/logic.tsx`, import.meta.url),
      "utf8",
    );
    const submit = source.slice(source.indexOf("const handleSubmit = useCallback("));
    assert.match(
      submit,
      /const deviceSessionId = getMercadoPagoDeviceSessionId\(supportsDeviceSessionIdRef.current\);/,
    );
    assert.match(source, /billing.current.data\?\.capabilities\?\.device_session_id === true/);
    assert.match(source, /const supportsDeviceSessionIdRef = useRef\(supportsDeviceSessionId\);/);
    assert.match(source, /supportsDeviceSessionIdRef.current = supportsDeviceSessionId;/);
    assert.match(
      submit,
      /\.\.\.\(deviceSessionId \? \{ device_session_id: deviceSessionId \} : \{\}\)/,
    );
    assert.match(source, /advancedFraudPrevention: true/);
  }
});
