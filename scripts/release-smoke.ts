/**
 * Release smoke test: pack, install in temp dir, run CLI commands.
 *
 * Run: npm run release-smoke
 *
 * This script is the last gate before `npm publish`. It proves the
 * actual packed artifact works when installed in a clean directory.
 */

import { execSync, execFileSync } from "child_process";
import path from "path";
import fs from "fs";
import os from "os";

const ROOT = path.join(__dirname, "..");

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function test(name: string, fn: () => void): void {
  try {
    fn();
    results.push({ name, passed: true });
    process.stdout.write(`  ✓ ${name}\n`);
  } catch (err) {
    results.push({ name, passed: false, error: String(err) });
    process.stdout.write(`  ✗ ${name}\n    ${String(err)}\n`);
  }
}

function run(cmd: string, cwd: string, options: { expectFail?: boolean } = {}): string {
  try {
    return execSync(cmd, { cwd, encoding: "utf-8", stdio: "pipe" });
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; status?: number };
    if (options.expectFail) return (e.stdout ?? "") + (e.stderr ?? "");
    throw new Error(
      `Command failed (exit ${e.status}): ${cmd}\n${e.stderr ?? e.stdout ?? ""}`
    );
  }
}

// ---- Step 1: Build ----
process.stdout.write("\n[1/5] Building...\n");
try {
  execSync("npm run build", { cwd: ROOT, encoding: "utf-8", stdio: "pipe" });
  process.stdout.write("  ✓ Build succeeded\n");
} catch (err) {
  process.stderr.write(`  ✗ Build failed:\n${String(err)}\n`);
  process.exit(1);
}

// ---- Step 2: Pack ----
process.stdout.write("\n[2/5] Packing...\n");
let tgzPath: string;
try {
  // npm pack outputs the filename to stdout
  const packOutput = execSync("npm pack", { cwd: ROOT, encoding: "utf-8", stdio: "pipe" }).trim();
  // npm pack may output multiple lines; the tgz filename is the last non-empty line
  const tgzName = packOutput.split("\n").filter(Boolean).pop()!;
  tgzPath = path.join(ROOT, tgzName);
  if (!fs.existsSync(tgzPath)) {
    throw new Error(`Pack output file not found: ${tgzPath}`);
  }
  process.stdout.write(`  ✓ Packed: ${tgzName}\n`);
} catch (err) {
  process.stderr.write(`  ✗ npm pack failed:\n${String(err)}\n`);
  process.exit(1);
}

// ---- Step 3: Install in temp dir ----
process.stdout.write("\n[3/5] Installing packed artifact in temp directory...\n");
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "openlaunchkit-smoke-"));
process.stdout.write(`  Temp dir: ${tmpDir}\n`);

try {
  run(`npm install --no-save "${tgzPath}"`, tmpDir);
  process.stdout.write("  ✓ Installed from .tgz\n");
} catch (err) {
  process.stderr.write(`  ✗ Install failed:\n${String(err)}\n`);
  fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.unlinkSync(tgzPath);
  process.exit(1);
}

const bin = path.join(tmpDir, "node_modules", ".bin", "openlaunchkit");

// ---- Step 4: Run CLI smoke tests ----
process.stdout.write("\n[4/5] Running CLI smoke tests against packed install...\n");

test("openlaunchkit version prints version number", () => {
  const out = run(`node "${bin}" version`, tmpDir);
  if (!out.includes("0.1.0")) throw new Error(`Expected 0.1.0 in output, got: ${out}`);
});

test("openlaunchkit help prints USAGE", () => {
  const out = run(`node "${bin}" help`, tmpDir);
  if (!out.toLowerCase().includes("usage")) {
    throw new Error(`Expected USAGE in output, got: ${out.substring(0, 200)}`);
  }
});

test("openlaunchkit audit runs without crashing (self-audit on tmpDir)", () => {
  // tmpDir has only node_modules — score will be low, use --no-fail
  const out = run(`node "${bin}" audit --path "${tmpDir}" --no-fail`, tmpDir);
  if (!out.includes("Overall Launch Score")) {
    throw new Error(`Expected 'Overall Launch Score' in output.\nGot: ${out.substring(0, 500)}`);
  }
});

test("openlaunchkit audit --json produces valid JSON", () => {
  const out = run(`node "${bin}" audit --path "${tmpDir}" --json --no-fail`, tmpDir);
  let parsed: unknown;
  try {
    parsed = JSON.parse(out);
  } catch {
    throw new Error(`Output is not valid JSON: ${out.substring(0, 300)}`);
  }
  const report = parsed as Record<string, unknown>;
  if (typeof report.overallScore !== "number") {
    throw new Error(`JSON missing overallScore`);
  }
  if (!Array.isArray(report.categories)) {
    throw new Error(`JSON missing categories array`);
  }
});

test("openlaunchkit audit --markdown produces Markdown", () => {
  const out = run(`node "${bin}" audit --path "${tmpDir}" --markdown --no-fail`, tmpDir);
  if (!out.includes("# OpenLaunchKit Audit Report")) {
    throw new Error(`Expected markdown header in output`);
  }
});

test("openlaunchkit init-launch-docs creates docs/launch/", () => {
  // Run in a clean subdirectory so we don't pollute tmpDir itself
  const initDir = fs.mkdtempSync(path.join(os.tmpdir(), "openlaunchkit-init-"));
  try {
    run(`node "${bin}" init-launch-docs`, initDir);
    const launchDir = path.join(initDir, "docs", "launch");
    if (!fs.existsSync(launchDir)) {
      throw new Error(`docs/launch/ was not created at ${launchDir}`);
    }
    const files = fs.readdirSync(launchDir);
    const hasXPost = files.some((f) => f.includes("x-post"));
    const hasHnPost = files.some((f) => f.includes("hn-post"));
    if (!hasXPost) throw new Error(`docs/launch/x-post.md not created (files: ${files.join(", ")})`);
    if (!hasHnPost) throw new Error(`docs/launch/hn-post.md not created`);
  } finally {
    fs.rmSync(initDir, { recursive: true, force: true });
  }
});

// ---- Step 5: Cleanup ----
process.stdout.write("\n[5/5] Cleaning up...\n");
fs.rmSync(tmpDir, { recursive: true, force: true });
fs.unlinkSync(tgzPath);
process.stdout.write("  ✓ Removed temp dir and .tgz\n");

// ---- Summary ----
const passed = results.filter((r) => r.passed).length;
const failed = results.filter((r) => !r.passed).length;

process.stdout.write(`\nResults: ${passed}/${results.length} passed\n`);

if (failed > 0) {
  process.stdout.write(`\nFailed tests:\n`);
  results
    .filter((r) => !r.passed)
    .forEach((r) => {
      process.stdout.write(`  - ${r.name}: ${r.error}\n`);
    });
  process.exit(1);
} else {
  process.stdout.write("All release smoke tests passed!\n\n");
  process.stdout.write("Ready to publish:\n");
  process.stdout.write("  npm publish --access public\n\n");
}
