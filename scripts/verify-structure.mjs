import { access } from "node:fs/promises";

const required = [
  "README.md",
  "LICENSE",
  "CONTRIBUTING.md",
  "CODE_OF_CONDUCT.md",
  "SECURITY.md",
  "ROADMAP.md",
  "docs/technical-spec-v0.1.md",
  "docs/architecture/overview.md",
  "docs/architecture/security-boundaries.md",
  "docs/adr/0001-typescript-monorepo.md",
  "docs/adr/0002-simulation-only-v0.1.md",
  "docs/adr/0003-run-based-slo.md",
  "docs/adr/0004-sqlite-first.md",
  "apps/api/package.json",
  "apps/dashboard/package.json",
  "apps/runner/package.json",
  "packages/config/package.json",
  "packages/stellar/package.json",
  "packages/probe-engine/package.json",
  "packages/assertions/package.json",
  "packages/slo-engine/package.json",
  "packages/storage/package.json",
  "packages/alerts/package.json",
  "packages/shared/package.json",
  "cli/package.json"
];

const missing = [];
for (const path of required) {
  try {
    await access(path);
  } catch {
    missing.push(path);
  }
}

if (missing.length > 0) {
  console.error("Missing required M0 paths:\n" + missing.map((path) => `- ${path}`).join("\n"));
  process.exit(1);
}

console.log(`M0 structure verified (${required.length} required paths).`);
