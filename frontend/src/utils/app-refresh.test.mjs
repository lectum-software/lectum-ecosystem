import assert from "node:assert/strict";
import test from "node:test";

const { LECTUM_APP_REFRESH_EVENT, requestLectumAppRefreshAfterReturningToTop } = await import(
  "./app-refresh.ts"
);

const installSimulatedBrowser = ({ initialScrollY = 0, settleScrollOnCall = true } = {}) => {
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const previousCustomEvent = globalThis.CustomEvent;
  const target = new EventTarget();
  const events = [];
  const scrollCalls = [];

  class SimulatedCustomEvent extends Event {
    constructor(type, init = {}) {
      super(type);
      this.detail = init.detail;
    }
  }

  const documentElement = { scrollTop: initialScrollY };
  const body = { scrollTop: initialScrollY };
  const simulatedWindow = {
    scrollY: initialScrollY,
    addEventListener: (...args) => target.addEventListener(...args),
    removeEventListener: (...args) => target.removeEventListener(...args),
    dispatchEvent: (event) => {
      events.push({ detail: event.detail, scrollY: simulatedWindow.scrollY, type: event.type });
      return target.dispatchEvent(event);
    },
    matchMedia: () => ({ matches: true }),
    requestAnimationFrame: (callback) => setTimeout(() => callback(Date.now()), 0),
    cancelAnimationFrame: (id) => clearTimeout(id),
    setTimeout,
    clearTimeout,
    scrollTo: (options) => {
      scrollCalls.push(options);

      if (!settleScrollOnCall) return;

      setTimeout(() => {
        simulatedWindow.scrollY = 0;
        documentElement.scrollTop = 0;
        body.scrollTop = 0;
        target.dispatchEvent(new Event("scroll"));
      }, 0);
    },
  };

  Object.defineProperty(globalThis, "CustomEvent", {
    configurable: true,
    value: SimulatedCustomEvent,
    writable: true,
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { body, documentElement },
    writable: true,
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: simulatedWindow,
    writable: true,
  });

  return {
    events,
    simulatedWindow,
    restore() {
      if (previousCustomEvent === undefined) {
        delete globalThis.CustomEvent;
      } else {
        Object.defineProperty(globalThis, "CustomEvent", {
          configurable: true,
          value: previousCustomEvent,
          writable: true,
        });
      }

      if (previousDocument === undefined) {
        delete globalThis.document;
      } else {
        Object.defineProperty(globalThis, "document", {
          configurable: true,
          value: previousDocument,
          writable: true,
        });
      }

      if (previousWindow === undefined) {
        delete globalThis.window;
      } else {
        Object.defineProperty(globalThis, "window", {
          configurable: true,
          value: previousWindow,
          writable: true,
        });
      }
    },
    scrollCalls,
  };
};

test("toque na navegacao ativa volta ao topo antes de recarregar", async () => {
  const browser = installSimulatedBrowser({ initialScrollY: 720 });

  try {
    let observedRefreshTop = null;
    browser.simulatedWindow.addEventListener(LECTUM_APP_REFRESH_EVENT, () => {
      observedRefreshTop = browser.simulatedWindow.scrollY;
    });

    const didDispatch = await requestLectumAppRefreshAfterReturningToTop("navigation");

    assert.equal(didDispatch, true);
    assert.equal(browser.scrollCalls.length, 1);
    assert.equal(browser.scrollCalls[0].top, 0);
    assert.equal(observedRefreshTop, 0);
    assert.deepEqual(browser.events.at(-1)?.detail, { source: "navigation" });
  } finally {
    browser.restore();
  }
});

test("toque na navegacao ativa no topo recarrega sem rolagem extra", async () => {
  const browser = installSimulatedBrowser({ initialScrollY: 0 });

  try {
    const didDispatch = await requestLectumAppRefreshAfterReturningToTop("navigation");

    assert.equal(didDispatch, true);
    assert.equal(browser.scrollCalls.length, 0);
    assert.deepEqual(browser.events.at(-1)?.detail, { source: "navigation" });
  } finally {
    browser.restore();
  }
});

test("pull-to-refresh mantem recarregamento imediato e nao forca scroll", async () => {
  const browser = installSimulatedBrowser({ initialScrollY: 640 });

  try {
    const didDispatch = await requestLectumAppRefreshAfterReturningToTop("pull");

    assert.equal(didDispatch, true);
    assert.equal(browser.scrollCalls.length, 0);
    assert.deepEqual(browser.events.at(-1)?.detail, { source: "pull" });
  } finally {
    browser.restore();
  }
});
