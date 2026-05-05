import { AuditContext, CategoryResult, Finding } from "../types.js";
import { fileExists } from "../detectors/fileExists.js";
import { computeCategoryScore } from "../scoring/score.js";

const WEIGHT = 15;

export function runHygieneAudit(ctx: AuditContext): CategoryResult {
  const findings: Finding[] = [];
  const passed: string[] = [];

  // --- LICENSE ---
  const hasLicense =
    fileExists(ctx.projectPath, "LICENSE") ||
    fileExists(ctx.projectPath, "LICENSE.md") ||
    fileExists(ctx.projectPath, "LICENSE.txt");
  if (!hasLicense) {
    findings.push({
      category: "Open Source Hygiene",
      severity: "high",
      title: "No LICENSE file",
      explanation: "Without a license file, contributors and users don't know how they can use your code.",
      recommendation: "Add a LICENSE file. For most open source projects, MIT is a good choice.",
    });
  } else {
    passed.push("LICENSE file present");
  }

  // --- CHANGELOG ---
  const hasChangelog =
    fileExists(ctx.projectPath, "CHANGELOG.md") ||
    fileExists(ctx.projectPath, "CHANGELOG") ||
    fileExists(ctx.projectPath, "HISTORY.md");
  if (!hasChangelog) {
    findings.push({
      category: "Open Source Hygiene",
      severity: "medium",
      title: "No CHANGELOG.md",
      explanation: "A changelog helps users understand what changed between versions.",
      recommendation: "Add a CHANGELOG.md following Keep a Changelog format (https://keepachangelog.com).",
    });
  } else {
    passed.push("CHANGELOG.md present");
  }

  // --- CONTRIBUTING ---
  const hasContributing =
    fileExists(ctx.projectPath, "CONTRIBUTING.md") ||
    fileExists(ctx.projectPath, "CONTRIBUTING");
  if (!hasContributing) {
    findings.push({
      category: "Open Source Hygiene",
      severity: "low",
      title: "No CONTRIBUTING.md",
      explanation: "Without contribution guidelines, potential contributors don't know how to submit changes.",
      recommendation: "Add a CONTRIBUTING.md with development setup, PR process, and coding standards.",
    });
  } else {
    passed.push("CONTRIBUTING.md present");
  }

  // --- SECURITY.md ---
  const hasSecurity =
    fileExists(ctx.projectPath, "SECURITY.md") ||
    fileExists(ctx.projectPath, "SECURITY");
  if (!hasSecurity) {
    findings.push({
      category: "Open Source Hygiene",
      severity: "medium",
      title: "No SECURITY.md",
      explanation: "A security policy tells researchers how to report vulnerabilities responsibly.",
      recommendation: "Add a SECURITY.md with a vulnerability disclosure process. GitHub provides a template.",
    });
  } else {
    passed.push("SECURITY.md present");
  }

  // --- .gitignore ---
  const hasGitignore = fileExists(ctx.projectPath, ".gitignore");
  if (!hasGitignore) {
    findings.push({
      category: "Open Source Hygiene",
      severity: "medium",
      title: "No .gitignore file",
      explanation: "Without .gitignore, secrets, build artifacts, and OS files may be accidentally committed.",
      recommendation: "Add a .gitignore appropriate for your stack. Use gitignore.io to generate one.",
    });
  } else {
    passed.push(".gitignore present");
  }

  // --- GitHub Actions ---
  const hasWorkflows =
    ctx.files.some((f) => f.startsWith(".github/workflows/")) ||
    fileExists(ctx.projectPath, ".github", "workflows");
  if (!hasWorkflows) {
    findings.push({
      category: "Open Source Hygiene",
      severity: "low",
      title: "No GitHub Actions workflows",
      explanation: "Automated CI signals that the project is actively maintained and tests pass.",
      recommendation: "Add a .github/workflows/ci.yml that runs tests on push and pull requests.",
    });
  } else {
    passed.push("GitHub Actions workflows configured");
  }

  // --- Tests ---
  const hasTests =
    ctx.files.some(
      (f) =>
        f.startsWith("tests/") ||
        f.startsWith("test/") ||
        f.startsWith("__tests__/") ||
        f.endsWith(".test.ts") ||
        f.endsWith(".test.js") ||
        f.endsWith(".spec.ts") ||
        f.endsWith(".spec.js")
    );
  if (!hasTests) {
    findings.push({
      category: "Open Source Hygiene",
      severity: "medium",
      title: "No test files found",
      explanation: "Without tests, users cannot trust that your code works or that contributions won't break it.",
      recommendation: "Add tests using Jest, Vitest, Mocha, or another testing framework.",
    });
  } else {
    passed.push("Test files present");
  }

  // --- examples folder ---
  const hasExamples =
    ctx.files.some((f) => f.startsWith("examples/")) ||
    fileExists(ctx.projectPath, "examples");
  if (!hasExamples) {
    findings.push({
      category: "Open Source Hygiene",
      severity: "info",
      title: "No examples folder",
      explanation: "An examples/ folder helps users understand how to use the project with real code.",
      recommendation: "Add an examples/ folder with runnable usage examples.",
    });
  } else {
    passed.push("examples/ folder present");
  }

  return {
    category: "Open Source Hygiene",
    score: computeCategoryScore(findings),
    weight: WEIGHT,
    findings,
    passed,
  };
}
