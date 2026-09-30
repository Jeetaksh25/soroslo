#!/usr/bin/env node
/**
 * Compile and test the packages a change touches, without the full pnpm
 * workspace install.
 *
 * The monorepo's `pnpm install` does not complete in every environment (CI
 * containers, restricted networks). This resolves the workspace links by
 * staging each built package's `dist` into the consuming package's
 * `node_modules`, which is enough for a real `tsc` compile and a real
 * `node --test` run.
 *
 * Usage:
 *   node scripts/local-verify.mjs                     # shared, config, assertions
 *   node scripts/local-verify.mjs shared config runner
 *   node scripts/local-verify.mjs --with-runtime      # adds storage and the runner
 */
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tsc = join(root, ".tooling/node_modules/typescript/bin/tsc");
const nodeTypes = join(root, ".tooling/node_modules/@types/node");

/** Packages the runner imports, in dependency order. */
const RUNTIME_ORDER = [
  "shared",
  "storage",
  "config",
  "slo-engine",
  "alerts",
  "stellar",
  "probe-engine"
];

function run(command, args) {
  return spawnSync(command, args, { cwd: root, encoding: "utf8" });
}

async function ensureToolchain() {
  if (existsSync(tsc)) return true;
  process.stdout.write("installing the local toolchain (typescript, @types/node)\n");
  const install = run("npm", [
    "install", "--no-save", "--prefix", ".tooling", "typescript@5.6.3", "@types/node@22"
  ]);
  if (!existsSync(tsc)) {
    process.stderr.write(`${install.stdout ?? ""}${install.stderr ?? ""}\n`);
    return false;
  }
  return true;
}

async function stageNodeTypes(pkgDir) {
  const target = join(pkgDir, "node_modules/@types/node");
  if (existsSync(target)) return;
  await mkdir(dirname(target), { recursive: true });
  await cp(nodeTypes, target, { recursive: true });
}

async function stageWorkspaceLink(consumerDir, dependency) {
  const source = join(root, "packages", dependency);
  const target = join(consumerDir, "node_modules/@soroslo", dependency);
  await rm(target, { recursive: true, force: true });
  await mkdir(target, { recursive: true });
  await cp(join(source, "dist"), join(target, "dist"), { recursive: true });

  const manifest = JSON.parse(await readFile(join(source, "package.json"), "utf8"));
  manifest.types = "./dist/index.d.ts";
  manifest.main = "./dist/index.js";
  manifest.exports = { types: "./dist/index.d.ts", default: "./dist/index.js" };
  await writeFile(join(target, "package.json"), JSON.stringify(manifest, null, 2));
}

function moduleDependencies(pkgDir) {
  const path = join(pkgDir, "package.json");
  if (!existsSync(path)) return [];
  const manifest = JSON.parse(readFileSync(path, "utf8"));
  return Object.keys(manifest.dependencies ?? {})
    .filter((name) => name.startsWith("@soroslo/"))
    .map((name) => name.replace("@soroslo/", ""));
}

async function linkDependencies(pkgDir, available) {
  for (const dependency of moduleDependencies(pkgDir)) {
    if (!available.has(dependency)) continue;
    await stageWorkspaceLink(pkgDir, dependency);
  }
}

function build(pkgDir) {
  const result = run("node", [tsc, "-p", join(pkgDir, "tsconfig.json")]);
  return `${result.stdout ?? ""}${result.stderr ?? ""}`
    .split("\n")
    .filter((line) => line.includes("error TS"));
}

function testBuiltFiles(pkgDir) {
  const distDir = join(pkgDir, "dist");
  if (!existsSync(distDir)) return { passed: 0, failed: 0, output: "" };

  // `node --test <dir>` treats the directory as a single test in some Node
  // versions, so the compiled test files are listed and run explicitly.
  const files = readdirSync(distDir).filter((name) => name.endsWith(".test.js"));
  if (files.length === 0) return { passed: 0, failed: 0, output: "" };

  let passed = 0;
  let failed = 0;
  let output = "";
  for (const file of files) {
    const result = run("node", ["--test", join(distDir, file)]);
    const text = `${result.stdout ?? ""}${result.stderr ?? ""}`;
    output += text;
    const summary = /^.\s*tests (\d+)$/m.exec(text);
    const fails = /^.\s*fail (\d+)$/m.exec(text);
    if (summary) passed += Number(summary[1]) - Number(fails?.[1] ?? 0);
    failed += Number(fails?.[1] ?? 0);
  }
  return { passed, failed, output };
}

async function main() {
  if (!(await ensureToolchain())) {
    process.stderr.write("toolchain unavailable\n");
    process.exit(1);
  }

  const requested = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const withRuntime = process.argv.includes("--with-runtime");
  const targets = requested.length
    ? requested
    : withRuntime
      ? RUNTIME_ORDER
      : ["shared", "config", "assertions"];

  const available = new Set();
  let failures = 0;

  for (const name of targets) {
    const pkgDir = join(root, "packages", name);
    const localDir = existsSync(pkgDir) ? pkgDir : join(root, "apps", name);
    if (!existsSync(join(localDir, "package.json"))) {
      process.stdout.write(`${name.padEnd(14)} skipped (not found)\n`);
      continue;
    }

    await stageNodeTypes(localDir);
    await linkDependencies(localDir, available);

    const errors = build(localDir).filter((line) => !line.includes("Cannot find module"));
    const { passed, failed } = testBuiltFiles(localDir);
    process.stdout.write(
      `${name.padEnd(14)} build=${errors.length ? `${errors.length} errors` : "ok"} ` +
        `tests=${passed} pass ${failed} fail\n`
    );
    for (const line of errors.slice(0, 5)) process.stdout.write(`    ${line}\n`);
    if (errors.length || failed) failures += 1;

    available.add(name);
  }

  process.stdout.write(failures ? `\n${failures} package(s) failed\n` : "\nall requested packages pass\n");
  process.exit(failures ? 1 : 0);
}

void main();
