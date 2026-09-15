import assert from "node:assert/strict";
import test from "node:test";
import {
  hasLocationCity,
  isMoreSpecificLocation,
  preferMostSpecificLocation,
} from "./location-resolution";

test("location capture usa provider quando headers de proxy trazem apenas pais", () => {
  const location = preferMostSpecificLocation(
    {
      city: null,
      confidence: null,
      country: "BR",
      provider: "proxy-headers",
      source: "ip",
      state: null,
    },
    {
      city: "São Paulo",
      confidence: 0.8,
      country: "BR",
      provider: "ipapi",
      source: "ip",
      state: "SP",
    },
  );

  assert.deepEqual(location, {
    city: "São Paulo",
    confidence: 0.8,
    country: "BR",
    provider: "ipapi",
    source: "ip",
    state: "SP",
  });
});

test("location capture preserva headers de proxy quando cidade ja veio do edge", () => {
  const proxyLocation = {
    city: "Rio de Janeiro",
    confidence: null,
    country: "BR",
    provider: "proxy-headers",
    source: "ip" as const,
    state: "RJ",
  };

  assert.equal(hasLocationCity(proxyLocation), true);
  assert.equal(
    preferMostSpecificLocation(proxyLocation, {
      city: "Niterói",
      confidence: 0.7,
      country: "BR",
      provider: "ipapi",
      source: "ip",
      state: "RJ",
    }),
    proxyLocation,
  );
});

test("location capture evita duplicar uma captura recente sem ganho de cidade ou estado", () => {
  assert.equal(
    isMoreSpecificLocation(
      { city: null, country: "BR", state: null },
      { city: null, country: "BR", state: null },
    ),
    false,
  );
  assert.equal(
    isMoreSpecificLocation(
      { city: null, country: "BR", state: "SP" },
      { city: null, country: "BR", state: null },
    ),
    true,
  );
  assert.equal(
    isMoreSpecificLocation(
      { city: "São Paulo", country: "BR", state: "SP" },
      { city: null, country: "BR", state: "SP" },
    ),
    true,
  );
});
