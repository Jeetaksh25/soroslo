import test from "node:test";
import assert from "node:assert/strict";
import {
  assertWebhookTargetAllowed,
  isPrivateAddress
} from "./url-policy.js";

void test("recognizes common private, loopback, and link-local addresses", () => {
  for (const address of [
    "127.0.0.1",
    "10.1.2.3",
    "172.16.0.1",
    "192.168.1.1",
    "169.254.1.1",
    "::1",
    "fc00::1",
    "fd00::1",
    "fe80::1"
  ]) {
    assert.equal(isPrivateAddress(address), true, address);
  }

  assert.equal(isPrivateAddress("8.8.8.8"), false);
  assert.equal(isPrivateAddress("2606:4700:4700::1111"), false);
});

void test("requires HTTPS before attempting delivery", async () => {
  await assert.rejects(
    () => assertWebhookTargetAllowed("http://example.com/hook"),
    /must use HTTPS/
  );
});

void test("rejects embedded URL credentials", async () => {
  await assert.rejects(
    () => assertWebhookTargetAllowed("https://user:password@example.com/hook"),
    /must not contain embedded credentials/
  );
});

void test("rejects direct loopback targets by default", async () => {
  await assert.rejects(
    () => assertWebhookTargetAllowed("https://127.0.0.1/hook"),
    /private or loopback/
  );
});

void test("allows explicitly opted-in private targets for trusted deployments", async () => {
  const url = await assertWebhookTargetAllowed("https://127.0.0.1/hook", {
    allowPrivateNetwork: true
  });

  assert.equal(url.hostname, "127.0.0.1");
});
