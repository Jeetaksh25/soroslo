import test from "node:test";
import assert from "node:assert/strict";
import { ConfigError, loadConfigText } from "./load.js";

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

void test("reports every validation error with a normalized bracketed path", () => {
  const source = `version: 1
runtime:
  timezone: UTC
  dataDir: ./.soroslo
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
        slo:
          target: 150
          window: 7d
          minEligibleRuns: 20
          maxObserverErrorRate: 5
        steps:
          - id: first
            contract: ${CONTRACT_ID}
            function: value
            args: []
            assertions:
              - path: $
                op: gt
                value: "0"
`;

  const error = (() => {
    try {
      loadConfigText(source, { environment: {} });
      return null;
    } catch (caught) {
      return caught as ConfigError;
    }
  })();

  assert.ok(error, "expected a ConfigError");
  assert.ok(error instanceof ConfigError);
  const paths = error.diagnostics.map((d) => d.path);
  // The index must be bracketed, not dotted: services.0.checks.0 is not a path
  // an operator can paste into a YAML search.
  assert.ok(
    paths.includes("services[0].checks[0].slo.target"),
    `expected a bracketed index path, got ${JSON.stringify(paths)}`
  );
  assert.ok(!paths.some((p) => /\.\d+\./.test(p)), "no dotted indexes should survive");
});

void test("classifies diagnostics by kind for machine consumers", () => {
  const source = `version: 1
runtime:
  timezone: UTC
  dataDir: ./.soroslo
networks:
  testnet:
    preset: testnet
services:
  - id: Payments
    name: Payments
    checks: []
`;

  let error: ConfigError | null = null;
  try {
    loadConfigText(source, { environment: {} });
  } catch (caught) {
    error = caught as ConfigError;
  }

  assert.ok(error instanceof ConfigError);
  const kinds = new Set(error.diagnostics.map((d) => d.kind));
  assert.ok(kinds.has("invalid_id"), `expected an invalid_id, got ${[...kinds]}`);
  assert.ok(error.diagnostics.every((d) => d.code.length > 0), "every diagnostic carries a code");
});

void test("names an unresolved environment variable without echoing a value", () => {
  const source = `version: 1
runtime:
  timezone: UTC
  dataDir: ./.soroslo
networks:
  testnet:
    preset: testnet
services:
  - id: payments
    name: Payments
    checks: []
notifications:
  webhooks:
    - id: ops
      url: https://example.com/hook
      secret: \${MISSING_WEBHOOK_SECRET}
`;

  let error: ConfigError | null = null;
  try {
    loadConfigText(source, { environment: {} });
  } catch (caught) {
    error = caught as ConfigError;
  }

  assert.ok(error instanceof ConfigError);
  assert.equal(error.diagnostics.length, 1);
  const [diagnostic] = error.diagnostics;
  assert.equal(diagnostic?.kind, "unresolved_environment");
  assert.equal(diagnostic?.environmentVariable, "MISSING_WEBHOOK_SECRET");
  assert.match(diagnostic?.message ?? "", /MISSING_WEBHOOK_SECRET/);
  // No secret value can appear because none was resolvable, and the message
  // must not contain a resolved value even when one exists.
  const withSecret = (() => {
    try {
      loadConfigText(source, { environment: { OTHER: "super-secret-value" } });
      return null;
    } catch (caught) {
      return caught as ConfigError;
    }
  })();
  assert.ok(withSecret instanceof ConfigError);
  assert.ok(!withSecret.message.includes("super-secret-value"));
});
