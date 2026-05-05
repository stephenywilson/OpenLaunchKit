import { AuditContext, CategoryResult, Finding } from "../types.js";
import { analyzeMarkdown, hasSection, MarkdownAnalysis } from "../detectors/markdown.js";
import { fileExists } from "../detectors/fileExists.js";
import { computeCategoryScore } from "../scoring/score.js";

const WEIGHT = 25;

export function runReadmeAudit(ctx: AuditContext): CategoryResult {
  const findings: Finding[] = [];
  const passed: string[] = [];

  const readmeContent = ctx.readmeContent;

  // --- README missing ---
  if (!readmeContent) {
    findings.push({
      category: "README",
      severity: "critical",
      title: "README.md is missing",
      explanation: "There is no README.md in the project root. This is the first thing anyone sees when visiting your repository.",
      recommendation: "Create a README.md with at minimum a title, description, installation steps, and usage examples.",
    });
    return {
      category: "README",
      score: 0,
      weight: WEIGHT,
      findings,
      passed,
    };
  }

  // --- Min length ---
  if (readmeContent.length < 200) {
    findings.push({
      category: "README",
      severity: "critical",
      title: "README is too short (< 200 characters)",
      explanation: `Your README is only ${readmeContent.length} characters. It provides no useful information to potential users.`,
      recommendation: "Expand your README with a proper description, installation, and usage sections.",
      file: "README.md",
    });
  } else {
    passed.push("README has sufficient length");
  }

  const md: MarkdownAnalysis = analyzeMarkdown(readmeContent);

  // --- H1 title ---
  if (!md.hasH1) {
    findings.push({
      category: "README",
      severity: "high",
      title: "README has no H1 title",
      explanation: "There is no top-level heading (# Title) in the README.",
      recommendation: "Add an H1 heading at the top of your README with the project name.",
      file: "README.md",
    });
  } else {
    passed.push(`Has H1 title: "${md.h1Text}"`);
  }

  // --- Tagline / first paragraph ---
  const firstParaMatch = readmeContent.match(/^#[^\n]*\n+([^#\n][^\n]*\n?)/m);
  const hasTagline = firstParaMatch && firstParaMatch[1].trim().length > 10;
  if (!hasTagline) {
    findings.push({
      category: "README",
      severity: "medium",
      title: "No tagline or short description near the top",
      explanation: "There is no clear one-line description below the main title.",
      recommendation: "Add a concise one-sentence tagline directly beneath the H1 heading.",
      file: "README.md",
    });
  } else {
    passed.push("Has tagline/description near top");
  }

  // --- Getting Started / Quick Start ---
  const hasQuickStart = hasSection(md, "quick start", "getting started", "installation", "install");
  if (!hasQuickStart) {
    findings.push({
      category: "README",
      severity: "high",
      title: "No Quick Start or Getting Started section",
      explanation: "Users cannot tell how to start using the project.",
      recommendation: "Add a ## Quick Start or ## Getting Started section with the minimal steps to use the project.",
      file: "README.md",
    });
  } else {
    passed.push("Has Quick Start / Getting Started section");
  }

  // --- Installation command ---
  const hasInstallCmd =
    /npm (install|i) /i.test(readmeContent) ||
    /pip install/i.test(readmeContent) ||
    /yarn add/i.test(readmeContent) ||
    /pnpm (add|install)/i.test(readmeContent) ||
    /cargo add/i.test(readmeContent) ||
    /go get/i.test(readmeContent) ||
    /npx /i.test(readmeContent);
  if (!hasInstallCmd) {
    findings.push({
      category: "README",
      severity: "medium",
      title: "No installation command found",
      explanation: "Users cannot tell how to install the package.",
      recommendation: "Add an explicit install command like `npm install your-package` or `npx your-package`.",
      file: "README.md",
    });
  } else {
    passed.push("Has installation command");
  }

  // --- Usage example ---
  const hasUsageSection = hasSection(md, "usage", "example", "examples", "how to use");
  const hasCodeBlock = md.codeBlocks.length > 0;
  if (!hasUsageSection && !hasCodeBlock) {
    findings.push({
      category: "README",
      severity: "high",
      title: "No usage example or code block",
      explanation: "There is no usage example to show how the project works.",
      recommendation: "Add a ## Usage section with at least one code block demonstrating how to use the project.",
      file: "README.md",
    });
  } else {
    passed.push("Has usage example or code block");
  }

  // --- Demo / screenshot ---
  const hasDemoImage =
    md.images.length > 0 ||
    /demo\.(gif|png|svg|jpg|jpeg|webp)/i.test(readmeContent) ||
    /screenshot/i.test(readmeContent) ||
    /\.gif/i.test(readmeContent) ||
    /\.svg/i.test(readmeContent);
  if (!hasDemoImage) {
    findings.push({
      category: "README",
      severity: "high",
      title: "No demo screenshot or image",
      explanation: "There is no visual demo (screenshot, GIF, or image) in the README.",
      recommendation: "Add a screenshot, GIF, or SVG demo to help users understand what your project looks like.",
      file: "README.md",
    });
  } else {
    passed.push("Has demo image or screenshot reference");
  }

  // --- Features section ---
  const hasFeatures = hasSection(md, "feature", "features", "what it does", "capabilities");
  if (!hasFeatures) {
    findings.push({
      category: "README",
      severity: "low",
      title: "No Features section",
      explanation: "There is no clear list of what the project does.",
      recommendation: "Add a ## Features section with a bullet list of key capabilities.",
      file: "README.md",
    });
  } else {
    passed.push("Has Features section");
  }

  // --- Why / problem statement ---
  const hasWhy = hasSection(md, "why", "motivation", "problem", "background", "about");
  if (!hasWhy) {
    findings.push({
      category: "README",
      severity: "low",
      title: "No problem statement or motivation section",
      explanation: "Users cannot tell why this project exists or what problem it solves.",
      recommendation: "Add a short section explaining what problem this project solves.",
      file: "README.md",
    });
  } else {
    passed.push("Has problem statement / motivation");
  }

  // --- Example output ---
  const hasExampleOutput =
    md.codeBlocks.length > 1 ||
    hasSection(md, "output", "example output", "result", "demo");
  if (!hasExampleOutput) {
    findings.push({
      category: "README",
      severity: "low",
      title: "No example output shown",
      explanation: "Showing example output helps users quickly understand what the tool produces.",
      recommendation: "Add a code block or screenshot showing example output from the tool.",
      file: "README.md",
    });
  } else {
    passed.push("Has example output");
  }

  // --- Limitations ---
  const hasLimitations = hasSection(md, "limitation", "limitations", "known issues", "caveats");
  if (!hasLimitations) {
    findings.push({
      category: "README",
      severity: "info",
      title: "No Limitations section",
      explanation: "Being upfront about limitations builds trust.",
      recommendation: "Add a ## Limitations section noting any known constraints or edge cases.",
      file: "README.md",
    });
  } else {
    passed.push("Has Limitations section");
  }

  // --- Roadmap ---
  const hasRoadmap = hasSection(md, "roadmap", "future", "planned", "coming", "todo");
  if (!hasRoadmap) {
    findings.push({
      category: "README",
      severity: "info",
      title: "No Roadmap section",
      explanation: "A roadmap shows the project is actively maintained.",
      recommendation: "Add a ## Roadmap section with planned features.",
      file: "README.md",
    });
  } else {
    passed.push("Has Roadmap section");
  }

  // --- License mention ---
  const hasLicenseMention = /license/i.test(readmeContent);
  if (!hasLicenseMention) {
    findings.push({
      category: "README",
      severity: "medium",
      title: "No license mention in README",
      explanation: "The README does not mention the project license.",
      recommendation: "Add a ## License section referencing your LICENSE file.",
      file: "README.md",
    });
  } else {
    passed.push("Has license mention");
  }

  // --- README file check ---
  if (!fileExists(ctx.projectPath, "README.md")) {
    // Already handled above
  } else {
    passed.push("README.md exists");
  }

  return {
    category: "README",
    score: computeCategoryScore(findings),
    weight: WEIGHT,
    findings,
    passed,
  };
}
