import test from "node:test";
import assert from "node:assert/strict";
import { loadConfigText } from "./load.js";

const CONTRACT_ID = "CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE";

function configYaml(extraStep = ""): string {
  return `version: 1
runtime:
  timezone: UTC
  dataDir: ./.soroslo
  defaultTimeout: 15s
networks:
  testnet:
    preset: testnet
services:
  - id: payments
    name: Payments
    checks:
      - id: health
        name: Health
        network: testnet
        every: 5m
        steps:
          - id: first
            contract: ${CONTRACT_ID}
            function: value
            args: []
            assertions:
              - path: $
                op: gt
                value: "0"
${extraStep}
notifications:
  webhooks:
    - id: ops
      url: \${WEBHOOK_URL}
      secret: \${WEBHOOK_SECRET}
`;
}

void test("loads versioned YAML, expands environment, and hashes deterministically", () => {
  const environment = {
    WEBHOOK_URL: "https://example.com/hook",
    WEBHOOK_SECRET: "not-a-stellar-secret"
  };

  const first = loadConfigText(configYaml(), { environment });
  const second = loadConfigText(configYaml(), { environment });

  assert.equal(first.config.version, 1);
  assert.equal(first.config.services[0]?.checks[0]?.steps[0]?.id, "first");
  assert.equal(first.hash, second.hash);
  assert.match(first.hash, /^[0-9a-f]{64}$/);
});

void test("rejects unknown top-level fields", () => {
  assert.throws(
    () =>
      loadConfigText(
        `${configYaml()}
unexpected: true
`,
        {
          environment: {
            WEBHOOK_URL: "https://example.com/hook",
            WEBHOOK_SECRET: "secret"
          }
        }
      ),
    /Unrecognized key/
  );
});

void test("rejects inline webhook secrets", () => {
  const source = configYaml().replace("secret: ${WEBHOOK_SECRET}", "secret: literal-secret");

  assert.throws(
    () =>
      loadConfigText(source, {
        environment: { WEBHOOK_URL: "https://example.com/hook" }
      }),
    /direct environment reference/
  );
});

void test("accepts prior-step references only to earlier steps", () => {
  const chained = `          - id: second
            contract: ${CONTRACT_ID}
            function: quote
            args:
              - type: i128
                from: $steps.first.result.value
            assertions: []
`;

  const loaded = loadConfigText(configYaml(chained), {
    environment: {
      WEBHOOK_URL: "https://example.com/hook",
      WEBHOOK_SECRET: "secret"
    }
  });

  assert.equal(loaded.config.services[0]?.checks[0]?.steps.length, 2);
});

void test("rejects forward step references", () => {
  const source = configYaml().replace(
    "args: []",
    `args:
              - type: i128
                from: $steps.second.result.value`
  );

  assert.throws(
    () =>
      loadConfigText(source, {
        environment: {
          WEBHOOK_URL: "https://example.com/hook",
          WEBHOOK_SECRET: "secret"
        }
      }),
    /previously completed step/
  );
});
