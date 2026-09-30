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
  assert.ok(kinds.has("invalid_id"), `expected an invalid_id, got ${[...kinds].join(", ")}`);
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

void test("reports a top-level field path for an unresolved variable", () => {
  // The indentation-based locator reported this as belonging to the last
  // service or check it had seen, because `notifications` comes after them.
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
        steps:
          - id: read
            contract: ${CONTRACT_ID}
            function: value
            args: []
            assertions: []
notifications:
  webhooks:
    - id: ops
      url: \${WEBHOOK_URL}
      secret: \${WEBHOOK_SECRET}
`;

  let error: ConfigError | null = null;
  try {
    loadConfigText(source, { environment: { CONTRACT_ID: "C".padEnd(56, "A") } });
  } catch (caught) {
    error = caught as ConfigError;
  }

  assert.ok(error instanceof ConfigError);
  const paths = new Map(error.diagnostics.map((d) => [d.environmentVariable, d.path]));

  // Exact paths, not "somewhere near the last check".
  assert.equal(paths.get("WEBHOOK_SECRET"), "notifications.webhooks[0].secret");
  assert.equal(paths.get("WEBHOOK_URL"), "notifications.webhooks[0].url");
});

void test("reports a variable inside a check at its own field path", () => {
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
        steps:
          - id: read
            contract: \${MISSING_CONTRACT}
            function: value
            args: []
            assertions: []
`;

  let error: ConfigError | null = null;
  try {
    loadConfigText(source, { environment: {} });
  } catch (caught) {
    error = caught as ConfigError;
  }

  assert.ok(error instanceof ConfigError);
  assert.equal(
    error.diagnostics[0]?.path,
    "services[0].checks[0].steps[0].contract",
    `expected the contract field path, got ${error.diagnostics[0]?.path}`
  );
});

void test("collects every unresolved variable instead of stopping at the first", () => {
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
      url: \${MISSING_A}
      secret: \${MISSING_B}
`;

  let error: ConfigError | null = null;
  try {
    loadConfigText(source, { environment: {} });
  } catch (caught) {
    error = caught as ConfigError;
  }

  assert.ok(error instanceof ConfigError);
  const named = error.diagnostics.map((d) => d.environmentVariable).sort();
  assert.deepEqual(named, ["MISSING_A", "MISSING_B"]);
  // The human-readable message must name both, not just the first failure.
  assert.match(error.message, /MISSING_A/);
  assert.match(error.message, /MISSING_B/);
});

void test("carries the referenced step and result path as structured data", () => {
  const source = configYaml().replace(
    "args: []",
    `args:
              - type: i128
                from: $steps.nowhere.result.value`
  );

  let error: ConfigError | null = null;
  try {
    loadConfigText(source, {
      environment: {
        WEBHOOK_URL: "https://example.com/hook",
        WEBHOOK_SECRET: "secret"
      }
    });
  } catch (caught) {
    error = caught as ConfigError;
  }

  assert.ok(error instanceof ConfigError);
  const [diagnostic] = error.diagnostics;
  assert.equal(diagnostic?.kind, "invalid_reference");
  // The source field path and the referenced target are separate fields, so a
  // consumer does not have to parse them back out of the message.
  assert.equal(diagnostic?.path, "services[0].checks[0].steps[0].args[0].from");
  assert.equal(diagnostic?.referencedStepId, "nowhere");
  assert.equal(diagnostic?.referencedResultPath, ".value");
});

void test("renders the path once in the human-readable message", () => {
  const source = configYaml().replace("        every: 5m", "        every: nope")
    .replace(/^notifications:[\s\S]*$/m, "");

  let error: ConfigError | null = null;
  try {
    loadConfigText(source, { environment: {} });
  } catch (caught) {
    error = caught as ConfigError;
  }

  assert.ok(error instanceof ConfigError);
  const path = error.diagnostics[0]?.path ?? "";
  assert.ok(path.length > 0);

  // The rendered line must not repeat the path: the loader prefixes it and the
  // message must not carry it too, or readers see `a.b: a.b: ...`.
  const occurrences = error.message.split(path).length - 1;
  assert.equal(occurrences, 1, `path '${path}' appeared ${occurrences} times in the message`);
});

void test("renders the path once for an unresolved environment diagnostic", () => {
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
  const path = error.diagnostics[0]?.path ?? "";
  assert.equal(path, "notifications.webhooks[0].secret");

  // The loader prefixes `diagnostic.path`, so the message must not carry the
  // path too. Counting occurrences catches the duplicated-path regression that
  // a Zod-error-only test missed.
  const occurrences = error.message.split(path).length - 1;
  assert.equal(occurrences, 1, `path '${path}' appeared ${occurrences} times in: ${error.message}`);
  assert.ok(
    !error.diagnostics[0]?.message.includes(path),
    "the diagnostic message itself must be path-free"
  );
});

void test("reports one diagnostic per referencing field for the same variable", () => {
  // The same variable named in two places must produce two diagnostics with
  // distinct paths, or an operator cannot tell which fields to fix.
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
      secret: \${SHARED_SECRET}
    - id: ops2
      url: https://example.com/hook2
      secret: \${SHARED_SECRET}
`;

  let error: ConfigError | null = null;
  try {
    loadConfigText(source, { environment: {} });
  } catch (caught) {
    error = caught as ConfigError;
  }

  assert.ok(error instanceof ConfigError);
  assert.equal(error.diagnostics.length, 2, "one diagnostic per referencing field");
  const paths = error.diagnostics.map((d) => d.path).sort();
  assert.deepEqual(paths, [
    "notifications.webhooks[0].secret",
    "notifications.webhooks[1].secret"
  ]);
  assert.ok(error.diagnostics.every((d) => d.environmentVariable === "SHARED_SECRET"));

  // One variable named twice is one missing variable, not two. The header names
  // variables, so it must count distinct names or the sentence is wrong.
  assert.match(
    error.message,
    /requires 1 environment variable that is not set/,
    `header miscounted the repeated variable: ${error.message.split("\n")[0]}`
  );
});
