import path from "path";
import { listFiles, readFile } from "../src/detectors/fileExists";
import { runReadmeAudit } from "../src/audit/readmeAudit";
import { runPackageAudit } from "../src/audit/packageAudit";
import { runHygieneAudit } from "../src/audit/hygieneAudit";
import { runSecurityAudit } from "../src/audit/securityAudit";
import { runDemoAudit } from "../src/audit/demoAudit";
import { runSocialAudit } from "../src/audit/socialAudit";
import { runAiRedFlagsAudit } from "../src/audit/aiRedFlagsAudit";
import { computeOverallScore } from "../src/scoring/score";
import { AuditContext, CategoryResult } from "../src/types";

const FIXTURES = path.join(__dirname, "..", "fixtures");

function buildContext(fixtureName: string): AuditContext {
  const projectPath = path.join(FIXTURES, fixtureName);
  const files = listFiles(projectPath);
  const readmeContent = readFile(projectPath, "README.md");
  let packageJson: Record<string, unknown> | null = null;
  const pkgRaw = readFile(projectPath, "package.json");
  if (pkgRaw) {
    try {
      packageJson = JSON.parse(pkgRaw) as Record<string, unknown>;
    } catch {
      // ignore
    }
  }
  return { projectPath, files, readmeContent, packageJson };
}

function runAllAudits(ctx: AuditContext): CategoryResult[] {
  return [
    runReadmeAudit(ctx),
    runPackageAudit(ctx),
    runHygieneAudit(ctx),
    runSecurityAudit(ctx),
    runDemoAudit(ctx),
    runSocialAudit(ctx),
    runAiRedFlagsAudit(ctx),
  ];
}

// ============================================================
// good-project
// ============================================================
describe("good-project", () => {
  let categories: CategoryResult[];

  beforeAll(() => {
    const ctx = buildContext("good-project");
    categories = runAllAudits(ctx);
  });

  test("overall score is >= 75", () => {
    const score = computeOverallScore(categories);
    expect(score).toBeGreaterThanOrEqual(75);
  });

  test("README category score is high", () => {
    const readme = categories.find((c) => c.category === "README")!;
    expect(readme.score).toBeGreaterThanOrEqual(60);
  });

  test("has LICENSE file (hygiene)", () => {
    const hygiene = categories.find((c) => c.category === "Open Source Hygiene")!;
    const hasLicenseFinding = hygiene.findings.some((f) =>
      f.title.toLowerCase().includes("license")
    );
    expect(hasLicenseFinding).toBe(false);
  });

  test("security audit finds no critical issues", () => {
    const security = categories.find((c) => c.category === "Security & Privacy")!;
    const criticalFindings = security.findings.filter((f) => f.severity === "critical");
    expect(criticalFindings).toHaveLength(0);
  });

  test("no local paths detected", () => {
    const security = categories.find((c) => c.category === "Security & Privacy")!;
    const localPathFinding = security.findings.find((f) =>
      f.title.toLowerCase().includes("local filesystem path")
    );
    expect(localPathFinding).toBeUndefined();
  });
});

// ============================================================
// weak-readme-project
// ============================================================
describe("weak-readme-project", () => {
  let categories: CategoryResult[];

  beforeAll(() => {
    const ctx = buildContext("weak-readme-project");
    categories = runAllAudits(ctx);
  });

  test("README score is < 60", () => {
    const readme = categories.find((c) => c.category === "README")!;
    expect(readme.score).toBeLessThan(60);
  });

  test("README has multiple findings", () => {
    const readme = categories.find((c) => c.category === "README")!;
    expect(readme.findings.length).toBeGreaterThan(3);
  });

  test("overall score is below 70", () => {
    const score = computeOverallScore(categories);
    expect(score).toBeLessThan(70);
  });
});

// ============================================================
// leaked-local-path-project
// ============================================================
describe("leaked-local-path-project", () => {
  let categories: CategoryResult[];

  beforeAll(() => {
    const ctx = buildContext("leaked-local-path-project");
    categories = runAllAudits(ctx);
  });

  test("security audit has critical or high finding for local path", () => {
    const security = categories.find((c) => c.category === "Security & Privacy")!;
    const localPathFinding = security.findings.find(
      (f) =>
        f.title.toLowerCase().includes("local filesystem path") ||
        f.title.toLowerCase().includes("local path")
    );
    expect(localPathFinding).toBeDefined();
    const isHighOrCritical =
      localPathFinding?.severity === "critical" ||
      localPathFinding?.severity === "high";
    expect(isHighOrCritical).toBe(true);
  });

  test("security score is below 95 (deducted for local path leak)", () => {
    const security = categories.find((c) => c.category === "Security & Privacy")!;
    expect(security.score).toBeLessThan(95);
  });
});

// ============================================================
// ai-placeholder-project
// ============================================================
describe("ai-placeholder-project", () => {
  let categories: CategoryResult[];

  beforeAll(() => {
    const ctx = buildContext("ai-placeholder-project");
    categories = runAllAudits(ctx);
  });

  test("AI Red Flags category has findings", () => {
    const aiFlags = categories.find((c) => c.category === "AI Red Flags")!;
    expect(aiFlags.findings.length).toBeGreaterThan(0);
  });

  test("AI Red Flags detects TODO/FIXME", () => {
    const aiFlags = categories.find((c) => c.category === "AI Red Flags")!;
    const todoFinding = aiFlags.findings.find((f) =>
      f.title.toLowerCase().includes("todo")
    );
    expect(todoFinding).toBeDefined();
  });

  test("AI Red Flags detects Lorem ipsum", () => {
    const aiFlags = categories.find((c) => c.category === "AI Red Flags")!;
    const loremFinding = aiFlags.findings.find((f) =>
      f.title.toLowerCase().includes("lorem ipsum")
    );
    expect(loremFinding).toBeDefined();
  });

  test("AI Red Flags detects placeholder", () => {
    const aiFlags = categories.find((c) => c.category === "AI Red Flags")!;
    const placeholderFinding = aiFlags.findings.find((f) =>
      f.title.toLowerCase().includes("placeholder")
    );
    expect(placeholderFinding).toBeDefined();
  });

  test("AI Red Flags detects fake CI badge", () => {
    const aiFlags = categories.find((c) => c.category === "AI Red Flags")!;
    const badgeFinding = aiFlags.findings.find((f) =>
      f.title.toLowerCase().includes("ci status badge") ||
      f.title.toLowerCase().includes("ci badge") ||
      f.title.toLowerCase().includes("badge")
    );
    expect(badgeFinding).toBeDefined();
  });

  test("AI Red Flags score is below 70", () => {
    const aiFlags = categories.find((c) => c.category === "AI Red Flags")!;
    expect(aiFlags.score).toBeLessThan(70);
  });
});

// ============================================================
// missing-license-project
// ============================================================
describe("missing-license-project", () => {
  let categories: CategoryResult[];

  beforeAll(() => {
    const ctx = buildContext("missing-license-project");
    categories = runAllAudits(ctx);
  });

  test("hygiene audit flags missing LICENSE", () => {
    const hygiene = categories.find((c) => c.category === "Open Source Hygiene")!;
    const licenseFinding = hygiene.findings.find((f) =>
      f.title.toLowerCase().includes("license")
    );
    expect(licenseFinding).toBeDefined();
  });

  test("hygiene score is below 90", () => {
    const hygiene = categories.find((c) => c.category === "Open Source Hygiene")!;
    expect(hygiene.score).toBeLessThan(90);
  });
});

// ============================================================
// Self-audit false positive regression tests
// ============================================================
describe("secrets detector – false positive prevention", () => {
  const { detectSecrets } = require("../src/detectors/secrets");

  test("src/detectors/secrets.ts pattern-definition lines do not trigger", () => {
    // Simulate the content of the secrets detector itself (regex definition lines).
    const sourceLines = [
      `  { name: "AWS Access Key", regex: /AKIA[0-9A-Z]{16}/g },`,
      `  { name: "Generic API Key", regex: /api[_-]?key\\s*[:=]\\s*["']?[A-Za-z0-9_\\-]{20,}["']?/gi },`,
      `  { name: "GitHub Token", regex: /gh[ps]_[A-Za-z0-9]{36,}/g },`,
      `  { name: "OpenAI Key", regex: /sk-[A-Za-z0-9]{48,}/g },`,
      `  { name: "Hardcoded Token", regex: /token\\s*[:=]\\s*["'][A-Za-z0-9_\\-]{16,}["']/gi },`,
    ].join("\n");
    const matches = detectSecrets(sourceLines);
    expect(matches).toHaveLength(0);
  });

  test("obvious placeholder/test-fixture value does not trigger", () => {
    const content = `const content = \`const config = { api_key: "sk-1234567890abcdefghijklmnopqrstuvwxyz1234567890" };\`;`;
    const matches = detectSecrets(content);
    expect(matches).toHaveLength(0);
  });

  test("real-looking API key in a normal file still triggers", () => {
    // Realistic key format, not a known placeholder prefix
    const content = `const config = { api_key: "prod_abcdefghijklmnopqrstuvwxyz" };`;
    const matches = detectSecrets(content);
    expect(matches.length).toBeGreaterThan(0);
  });

  test("hardcoded bearer token still triggers", () => {
    // Uses the Hardcoded Token pattern (token = "16+ chars") with a clearly synthetic value
    const content = `const authToken = "PqLwZjYeHtAuCbFsDgOiElJxVrNm";`;
    const matches = detectSecrets(content);
    expect(matches.length).toBeGreaterThan(0);
  });

  test("hardcoded token with long value still triggers", () => {
    // Uses the Hardcoded Token pattern with a different clearly synthetic value
    const content = `const secretToken = "XrT9mK2pNqLwJvYeHbCgFsDaOiEl";`;
    const matches = detectSecrets(content);
    expect(matches.length).toBeGreaterThan(0);
  });
});

// ============================================================
// Unit tests: scoring
// ============================================================
describe("scoring", () => {
  test("100 score with no findings", () => {
    const { computeCategoryScore } = require("../src/scoring/score");
    expect(computeCategoryScore([])).toBe(100);
  });

  test("critical finding deducts 20 points", () => {
    const { computeCategoryScore } = require("../src/scoring/score");
    const findings = [
      {
        category: "README" as const,
        severity: "critical" as const,
        title: "Test",
        explanation: "Test",
        recommendation: "Test",
      },
    ];
    expect(computeCategoryScore(findings)).toBe(80);
  });

  test("score never goes below 0", () => {
    const { computeCategoryScore } = require("../src/scoring/score");
    const findings = Array(10).fill({
      category: "README" as const,
      severity: "critical" as const,
      title: "Test",
      explanation: "Test",
      recommendation: "Test",
    });
    expect(computeCategoryScore(findings)).toBe(0);
  });

  test("computeOverallScore uses weights", () => {
    const { computeOverallScore } = require("../src/scoring/score");
    const cats: CategoryResult[] = [
      { category: "README", score: 100, weight: 50, findings: [], passed: [] },
      { category: "Package Readiness", score: 0, weight: 50, findings: [], passed: [] },
    ];
    expect(computeOverallScore(cats)).toBe(50);
  });
});

// ============================================================
// Unit tests: detectors
// ============================================================
describe("detectors", () => {
  test("detectSecrets finds obvious API key pattern", () => {
    const { detectSecrets } = require("../src/detectors/secrets");
    // Use a realistic-looking key (not a known placeholder prefix like sk-1234...)
    const content = `const config = { api_key: "prod_XkR9mNvQpLwZjYeHtAuCbFsDgOiElJxV" };`;
    const matches = detectSecrets(content);
    expect(matches.length).toBeGreaterThan(0);
  });

  test("detectLocalPaths finds /Users/ paths", () => {
    const { detectLocalPaths } = require("../src/detectors/localPaths");
    const content = `Run: node /Users/john/projects/app/cli.js`;
    const matches = detectLocalPaths(content);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].path).toContain("/Users/");
  });

  test("detectLocalPaths finds Windows paths", () => {
    const { detectLocalPaths } = require("../src/detectors/localPaths");
    const content = `Config: C:\\Users\\dev\\AppData\\config.json`;
    const matches = detectLocalPaths(content);
    expect(matches.length).toBeGreaterThan(0);
  });

  test("detectHiddenUnicode finds zero-width space", () => {
    const { detectHiddenUnicode } = require("../src/detectors/unicode");
    const content = `Hello​World`; // zero-width space
    const matches = detectHiddenUnicode(content);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].codePoint).toBe("U+200B");
  });

  test("analyzeMarkdown parses headings", () => {
    const { analyzeMarkdown } = require("../src/detectors/markdown");
    const content = `# My Project\n\n## Installation\n\n## Usage\n`;
    const result = analyzeMarkdown(content);
    expect(result.hasH1).toBe(true);
    expect(result.h1Text).toBe("My Project");
    expect(result.headings.length).toBe(3);
  });
});
