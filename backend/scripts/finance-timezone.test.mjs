import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

// Isolated-process regressions belong to test tooling, never the application runtime.
const backendRoot = fileURLToPath(new URL("../", import.meta.url));
const financeServices = resolve(
  backendRoot,
  "src/modules/api/admin/private/finance/dashboard/use-cases/services",
);

test("produces identical period and bucket results in isolated UTC and BRT processes", () => {
  const modulePath = resolve(financeServices, "periods.ts");
  const script = `
      const { resolveAdminFinancePeriod, buildBuckets } = require(${JSON.stringify(modulePath)});
      const inputs = [
        [{period:'today'}, '2026-11-12T00:00:00Z'],
        [{period:'week'}, '2026-11-16T00:00:00Z'],
        [{period:'year'}, '2027-01-01T00:00:00Z'],
        [{period:'month'}, '2026-12-01T00:00:00Z'],
        [{period:'7d'}, '2026-11-12T00:00:00Z'],
        [{from:'2018-11-03',to:'2018-11-05'}, '2026-11-12T00:00:00Z'],
        [{period:'all'}, '2026-11-12T00:00:00Z']
      ];
      console.log(JSON.stringify(inputs.map(([query,now]) => {
        const result = resolveAdminFinancePeriod(query,new Date('2026-11-01T00:00:00Z'),new Date(now));
        return {result,buckets:result.success?['day','week','month'].map(group=>buildBuckets(result.period.current,group)):[]};
      })));
    `;
  const outputs = ["UTC", "America/Sao_Paulo"].map((TZ) => {
    const result = spawnSync(process.execPath, ["--import", "tsx", "--eval", script], {
      encoding: "utf8",
      cwd: backendRoot,
      env: { ...process.env, TZ },
      timeout: 15_000,
    });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout;
  });
  assert.equal(outputs[0], outputs[1]);
});

test("general dashboard financial daily cutoff includes 21h BRT payment regardless server TZ", () => {
  const fixtures = resolve(financeServices, "stripe-ledger-fixtures.ts");
  const projection = resolve(financeServices, "stripe-ledger-projection.ts");
  const periods = resolve(financeServices, "periods.ts");
  const conversion = resolve(
    backendRoot,
    "src/modules/api/admin/private/dashboard/summary/use-cases/services/conversion-finance.ts",
  );
  const script = `
    const {financeSnapshot,financeReceipt,financeHistory}=require(${JSON.stringify(fixtures)});
    const {projectFinanceStripeLedger}=require(${JSON.stringify(projection)});
    const {parseFinanceDateOnly}=require(${JSON.stringify(periods)});
    const {buildFinancial}=require(${JSON.stringify(conversion)});
    const paid=new Date('2026-11-11T00:00:00Z');
    const snapshot=financeSnapshot({receipts:[financeReceipt({paid_at:paid,invoice_paid_at:paid,period_start:paid})],history:[financeHistory({observed_at:paid})]});
    const value=buildFinancial([],['2026-11-09','2026-11-10'],parseFinanceDateOnly('2026-11-10','end'),2,projectFinanceStripeLedger(snapshot));
    console.log(JSON.stringify(value));
  `;
  const outputs = ["UTC", "America/Sao_Paulo"].map((TZ) => {
    const child = spawnSync(process.execPath, ["--import", "tsx", "--eval", script], {
      encoding: "utf8",
      cwd: backendRoot,
      env: { ...process.env, TZ },
      timeout: 15000,
    });
    assert.equal(child.status, 0, child.stderr);
    return child.stdout;
  });
  assert.equal(outputs[0], outputs[1]);
  const value = JSON.parse(outputs[0]);
  assert.equal(value.daily[0].available, false);
  assert.equal(value.daily[1].available, true);
  assert.equal(value.daily[1].value_cents, 2990);
  assert.equal(value.mrr_cents, 2990);
});
