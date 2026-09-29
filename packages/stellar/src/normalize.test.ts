import test from "node:test";
import assert from "node:assert/strict";
import { xdr } from "@stellar/stellar-sdk";
import { normalizeScVal } from "./normalize.js";

void test("normalizes primitive values", () => {
  assert.equal(normalizeScVal(xdr.ScVal.scvU32(42)), 42);
  assert.equal(normalizeScVal(xdr.ScVal.scvBool(true)), true);
  assert.equal(normalizeScVal(xdr.ScVal.scvSymbol("healthy")), "healthy");
});

void test("normalizes bytes as lowercase hex", () => {
  assert.equal(normalizeScVal(xdr.ScVal.scvBytes(Uint8Array.from([0xab, 0xcd, 0x01]))), "abcd01");
});

void test("normalizes string-key maps into deterministic objects", () => {
  const map = xdr.ScVal.scvMap([
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol("z"),
      val: xdr.ScVal.scvU32(2)
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol("a"),
      val: xdr.ScVal.scvU32(1)
    })
  ]);

  assert.deepEqual(normalizeScVal(map), { a: 1, z: 2 });
});

void test("keeps non-string map keys lossless", () => {
  const map = xdr.ScVal.scvMap([
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvU32(7),
      val: xdr.ScVal.scvBool(true)
    })
  ]);

  assert.deepEqual(normalizeScVal(map), {
    type: "map",
    entries: [{ key: 7, value: true }]
  });
});
