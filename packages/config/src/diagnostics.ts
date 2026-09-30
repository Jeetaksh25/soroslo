/**
 * @file diagnostics.ts
 * @description Structured configuration diagnostics with normalized YAML paths.
 * @package @soroslo/config
 * @license Apache-2.0
 */
import { z } from "zod";

/** Stable, machine-readable category for a diagnostic. */
export type DiagnosticKind =
  | "unknown_field"
  | "invalid_type"
  | "invalid_id"
  | "invalid_duration"
  | "invalid_reference"
  | "invalid_contract_id"
  | "invalid_value"
  | "unresolved_environment";

export interface ConfigDiagnostic {
  /** Normalized dotted path with bracketed indexes, e.g. `services[0].checks[1].slo.target`. */
  path: string;
  /** Stable category so a caller can branch without parsing the message. */
  kind: DiagnosticKind;
  /** Human-readable explanation, safe to print. */
  message: string;
  /** The Zod issue code, or a config-specific code, kept for CLI JSON output. */
  code: string;
  /**
   * For an unresolved environment reference, the variable name. Present so the
   * caller can report *which* variable is missing without ever resolving or
   * echoing a secret value.
   */
  environmentVariable?: string;
}

/**
 * Render a path segment list as `a.b[0].c`.
 *
 * Zod reports paths as a mixed array of keys and numeric indexes
 * (`["services", 0, "checks", 1]`). Joining with dots alone produces
 * `services.0.checks.1`, which cannot be pasted into a YAML search and does not
 * distinguish an index from a literal key named "0".
 */
export function formatPath(segments: readonly (string | number | symbol)[]): string {
  let out = "";
  for (const segment of segments) {
    if (typeof segment === "number") {
      out += `[${segment}]`;
      continue;
    }
    const key = String(segment);
    // A key that is a bare identifier reads better as `a.b`; anything else
    // needs brackets so the path stays unambiguous.
    if (/^[A-Za-z_][A-Za-z0-9_-]*$/.test(key)) {
      out += out.length === 0 ? key : `.${key}`;
    } else {
      out += `[${JSON.stringify(key)}]`;
    }
  }
  return out.length === 0 ? "$" : out;
}

/** Map a Zod issue code onto the diagnostic vocabulary. */
function kindFor(code: string): DiagnosticKind {
  switch (code) {
    case "unrecognized_keys":
      return "unknown_field";
    case "invalid_type":
      return "invalid_type";
    case "too_small":
    case "too_big":
    case "invalid_string":
    case "invalid_format":
    case "invalid_enum_value":
    case "invalid_value":
      return "invalid_value";
    default:
      return "invalid_value";
  }
}

/**
 * Attach a diagnostic kind based on the schema the issue came from.
 * IDs, durations, references and contract ids read as generic Zod failures by
 * default, which is exactly the complaint the diagnostics exist to fix.
 */
function refineKind(issue: z.core.$ZodIssue): { kind: DiagnosticKind; message: string } {
  const path = formatPath(issue.path);

  if (issue.code === "unrecognized_keys" && "keys" in issue && Array.isArray(issue.keys)) {
    // Keep the schema's own wording so existing consumers that match on it
    // still work; the path prefix is the addition.
    return {
      kind: "unknown_field",
      message: `Unrecognized key${
        issue.keys.length === 1 ? "" : "s"
      }: ${issue.keys.map((k) => `'${String(k)}'`).join(", ")} at ${path}`
    };
  }

  // Zod carries the custom refine message verbatim, so the message text is the
  // most reliable signal for which schema produced the issue.
  const message = issue.message;
  if (/previous step result|previous step/i.test(message)) {
    return { kind: "invalid_reference", message: `${path} ${message}` };
  }
  if (/contract/i.test(message) || /\.contract$/.test(path)) {
    return {
      kind: "invalid_contract_id",
      message: `${path} must be a Soroban contract address (a C... StrKey)`
    };
  }
  if (/duration/i.test(message)) {
    return { kind: "invalid_duration", message: `${path} ${message}` };
  }
  if (/lowercase|identifier/i.test(message) || /(^|\.)id$/.test(path)) {
    return { kind: "invalid_id", message: `${path} ${message}` };
  }

  return { kind: kindFor(issue.code), message: `${path}: ${message}` };
}

/** Convert a Zod error into the structured diagnostic list. */
export function diagnosticsFromZod(error: z.ZodError): ConfigDiagnostic[] {
  return error.issues.map((issue) => {
    const { kind, message } = refineKind(issue);
    return {
      path: formatPath(issue.path),
      kind,
      message,
      code: String(issue.code)
    };
  });
}

/**
 * Find every `${NAME}` reference in the raw source and report the ones the
 * environment cannot satisfy.
 *
 * Only the variable name and the config path are reported. The resolved value
 * is never read, formatted or returned, so a diagnostic cannot leak a secret
 * even when the variable is a webhook secret or a signing key.
 */
export function unresolvedEnvironmentDiagnostics(
  source: string,
  environment: NodeJS.ProcessEnv
): ConfigDiagnostic[] {
  const found = new Map<string, string>();
  const lines = source.split(/\r?\n/);

  let currentService: number | null = null;
  let currentCheck: number | null = null;

  lines.forEach((line, index) => {
    const serviceMatch = /^\s{2}- id:\s*(\S+)/.exec(line);
    if (serviceMatch) {
      currentService = (currentService ?? -1) + 1;
      currentCheck = null;
    }
    const checkMatch = /^\s{6}- id:\s*(\S+)/.exec(line);
    if (checkMatch) {
      currentCheck = (currentCheck ?? -1) + 1;
    }

    for (const match of line.matchAll(/\$\{([A-Z_][A-Z0-9_]*)\}/g)) {
      const name = match[1];
      if (name === undefined || environment[name] !== undefined) continue;

      const prefix =
        currentService === null
          ? `line ${index + 1}`
          : currentCheck === null
            ? `services[${currentService}]`
            : `services[${currentService}].checks[${currentCheck}]`;
      if (!found.has(name)) found.set(name, prefix);
    }
  });

  return [...found].map(([name, where]) => ({
    path: where,
    kind: "unresolved_environment" as const,
    message: `Environment variable '${name}' referenced at ${where} is required but not set`,
    code: "unresolved_environment",
    environmentVariable: name
  }));
}
