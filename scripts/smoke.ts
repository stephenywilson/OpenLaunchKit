import { execSync } from "child_process";
import path from "path";
import fs from "fs";

const ROOT = path.join(__dirname, "..");
const CLI = path.join(ROOT, "dist", "cli.js");

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

function run(args: string, options: { expectFail?: boolean } = {}): string {
  try {
    return execSync(`node "${CLI}" ${args}`, {
      encoding: "utf-8",
      env: process.env,
    });
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; status?: number };
    if (options.expectFail) {
      return (e.stdout ?? "") + (e.stderr ?? "");
    }
    throw new Error(
      `Command failed (exit ${e.status}): node ${CLI} ${args}\n${e.stderr ?? e.stdout ?? ""}`
    );
  }
}

// ---- Ensure built ----
process.stdout.write("\nBuilding...\n");
try {
  execSync("npm run build", { cwd: ROOT, encoding: "utf-8", stdio: "pipe" });
  process.stdout.write("Build succeeded.\n\n");
} catch (err) {
  process.stderr.write(`Build failed:\n${String(err)}\n`);
  process.exit(1);
}

if (!fs.existsSync(CLI)) {
  process.stderr.write(`CLI not found at ${CLI}\n`);
  process.exit(1);
}

// ---- Smoke tests ----
process.stdout.write("Running smoke tests...\n\n");

const goodProject = path.join(ROOT, "fixtures", "good-project");
const weakProject = path.join(ROOT, "fixtures", "weak-readme-project");

test("version command prints version", () => {
  const out = run("version");
  if (!out.includes("0.1.0")) throw new Error(`Expected version, got: ${out}`);
});

test("help command prints USAGE", () => {
  const out = run("help");
  if (!out.includes("USAGE") && !out.includes("usage")) {
    throw new Error(`Expected USAGE in help output, got: ${out.substring(0, 200)}`);
  }
});

test("audit good-project runs without error", () => {
  const out = run(`audit --path "${goodProject}" --no-fail`);
  if (!out.includes("Overall Launch Score")) {
    throw new Error(`Expected 'Overall Launch Score' in output.\nGot: ${out.substring(0, 500)}`);
  }
});

test("audit good-project contains project name", () => {
  const out = run(`audit --path "${goodProject}" --no-fail`);
  if (!out.includes("quickstat")) {
    throw new Error(`Expected 'quickstat' in output.\nGot: ${out.substring(0, 300)}`);
  }
});

test("audit weak-readme-project exits with code 1", () => {
  try {
    // Run directly with execSync to capture exit code
    const output = execSync(`node "${CLI}" audit --path "${weakProject}"`, {
      encoding: "utf-8",
      env: process.env,
    });
    // If we get here, exit code was 0 — that's unexpected
    if (output.includes("Overall Launch Score")) {
      throw new Error("Expected exit code 1 but command exited 0 with score output");
    }
    throw new Error("Expected exit code 1 but command exited 0");
  } catch (err: unknown) {
    const e = err as { stdout?: string; status?: number; message?: string };
    // Expected: exit code 1 (score < 70)
    if (e.status === 1) return;
    // If it's the "Expected exit code 1" error we threw, re-throw it
    throw err;
  }
});

test("audit --no-fail with weak project exits 0", () => {
  const out = run(`audit --path "${weakProject}" --no-fail`);
  if (!out.includes("Overall Launch Score")) {
    throw new Error(`Expected output, got: ${out.substring(0, 300)}`);
  }
});

test("audit --json produces valid JSON", () => {
  const out = run(`audit --path "${goodProject}" --json --no-fail`);
  let parsed: unknown;
  try {
    parsed = JSON.parse(out);
  } catch (e) {
    throw new Error(`Output is not valid JSON: ${out.substring(0, 300)}`);
  }
  const report = parsed as Record<string, unknown>;
  if (typeof report.overallScore !== "number") {
    throw new Error(`JSON missing overallScore: ${JSON.stringify(report).substring(0, 200)}`);
  }
  if (!Array.isArray(report.categories)) {
    throw new Error(`JSON missing categories array`);
  }
});

test("audit --json contains all 7 categories", () => {
  const out = run(`audit --path "${goodProject}" --json --no-fail`);
  const report = JSON.parse(out) as { categories: Array<{ category: string }> };
  if (report.categories.length !== 7) {
    throw new Error(`Expected 7 categories, got ${report.categories.length}`);
  }
});

test("audit --markdown produces Markdown output", () => {
  const out = run(`audit --path "${goodProject}" --markdown --no-fail`);
  if (!out.includes("# OpenLaunchKit Audit Report")) {
    throw new Error(`Expected markdown header, got: ${out.substring(0, 300)}`);
  }
  if (!out.includes("Overall")) {
    throw new Error(`Expected 'Overall' in markdown output`);
  }
});

test("audit --output saves file", () => {
  const outFile = path.join(ROOT, "tmp-smoke-report.md");
  try {
    run(`audit --path "${goodProject}" --markdown --output "${outFile}" --no-fail`);
    if (!fs.existsSync(outFile)) {
      throw new Error(`Output file was not created at ${outFile}`);
    }
    const content = fs.readFileSync(outFile, "utf-8");
    if (!content.includes("OpenLaunchKit")) {
      throw new Error(`Output file does not contain expected content`);
    }
  } finally {
    if (fs.existsSync(outFile)) fs.unlinkSync(outFile);
  }
});

test("audit good-project score is reported", () => {
  const out = run(`audit --path "${goodProject}" --json --no-fail`);
  const report = JSON.parse(out) as { overallScore: number };
  if (report.overallScore < 1 || report.overallScore > 100) {
    throw new Error(`Score out of range: ${report.overallScore}`);
  }
});

// ---- Summary ----
const passed = results.filter((r) => r.passed).length;
const failed = results.filter((r) => !r.passed).length;

process.stdout.write("\n");
process.stdout.write(`Results: ${passed}/${results.length} passed\n`);

if (failed > 0) {
  process.stdout.write(`\nFailed tests:\n`);
  results
    .filter((r) => !r.passed)
    .forEach((r) => {
      process.stdout.write(`  - ${r.name}: ${r.error}\n`);
    });
  process.exit(1);
} else {
  process.stdout.write("All smoke tests passed!\n");
}
