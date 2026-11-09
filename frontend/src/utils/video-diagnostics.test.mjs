import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createVideoDiagnosticLog } from "./video-diagnostics.ts";

test("diagnostic timestamps are relative and snapshots are isolated", () => {
  let now = 1000;
  const log = createVideoDiagnosticLog(() => now);
  now += 123.4;
  log.add({ event: "selection", selection: 1 });
  const report = log.report();
  assert.equal(report.entries[0].ms, 123);
  report.entries[0].event = "changed";
  assert.equal(log.report().entries[0].event, "selection");
});

test("diagnostic memory is bounded and reports dropped events", () => {
  const log = createVideoDiagnosticLog(() => 0);
  for (let i = 0; i < 4010; i++) log.add({ event: "waiting" });
  assert.equal(log.report().entries.length, 4000);
  assert.equal(log.report().dropped, 10);
});

test("observer does not control playback or transmit diagnostics", () => {
  const source = readFileSync(new URL("./video-diagnostics.ts", import.meta.url), "utf8");
  assert.doesNotMatch(
    source,
    /\.(play|pause|load)\(|fetch\(|sendBeacon|localStorage|sessionStorage|console\./,
  );
  assert.doesNotMatch(source, /currentTime\s*=|\.src\s*=/);
  const component = readFileSync(
    new URL("../components/video-diagnostics.tsx", import.meta.url),
    "utf8",
  );
  assert.match(component, /get\("videoDiagnostics"\) === "1"/);
  assert.match(component, /session\.current\?\.stop\(\)/);
});
