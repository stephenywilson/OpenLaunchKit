import { AuditContext, CategoryResult, Finding } from "../types.js";
import { fileExists } from "../detectors/fileExists.js";
import { analyzeMarkdown } from "../detectors/markdown.js";
import { computeCategoryScore } from "../scoring/score.js";

const WEIGHT = 10;

export function runDemoAudit(ctx: AuditContext): CategoryResult {
  const findings: Finding[] = [];
  const passed: string[] = [];

  // --- Any image referenced in README ---
  const hasReadmeImage = (() => {
    if (!ctx.readmeContent) return false;
    const md = analyzeMarkdown(ctx.readmeContent);
    return md.images.length > 0;
  })();

  if (!hasReadmeImage) {
    findings.push({
      category: "Demo & Visuals",
      severity: "high",
      title: "No image or screenshot in README",
      explanation: "READMEs without visuals get significantly less engagement. A single screenshot or GIF can double click-through rates.",
      recommendation: "Add at least one screenshot, GIF, or SVG demo image to your README.",
      file: "README.md",
    });
  } else {
    passed.push("README has image(s) / screenshot(s)");
  }

  // --- assets/, screenshots/, images/ folder ---
  const hasImageFolder =
    ctx.files.some((f) => f.startsWith("assets/") || f.startsWith("screenshots/") || f.startsWith("images/")) ||
    fileExists(ctx.projectPath, "assets") ||
    fileExists(ctx.projectPath, "screenshots") ||
    fileExists(ctx.projectPath, "images");
  if (!hasImageFolder) {
    findings.push({
      category: "Demo & Visuals",
      severity: "low",
      title: "No assets/, screenshots/, or images/ folder",
      explanation: "Keeping screenshots and images in a dedicated folder makes them easier to maintain.",
      recommendation: "Create an assets/ or screenshots/ folder and add demo visuals.",
    });
  } else {
    passed.push("Has dedicated image/assets folder");
  }

  // --- demo.svg / demo.gif / demo.png ---
  const hasDemoFile =
    ctx.files.some((f) =>
      /^(demo|screenshot|preview|example)\.(svg|gif|png|jpg|jpeg|webp)/i.test(
        f.split("/").pop() ?? ""
      )
    );
  if (!hasDemoFile) {
    findings.push({
      category: "Demo & Visuals",
      severity: "info",
      title: "No top-level demo file (demo.gif, demo.svg, etc.)",
      explanation: "A standard-named demo file makes it easy to reference in the README.",
      recommendation: "Add a demo.gif, demo.svg, or screenshot.png at the repository root or in assets/.",
    });
  } else {
    passed.push("Has dedicated demo file");
  }

  // --- docs/images/ ---
  const hasDocsImages =
    ctx.files.some((f) => f.startsWith("docs/images/")) ||
    fileExists(ctx.projectPath, "docs", "images");
  if (!hasDocsImages) {
    findings.push({
      category: "Demo & Visuals",
      severity: "info",
      title: "No docs/images/ folder",
      explanation: "Storing documentation images in docs/images/ is a common convention.",
      recommendation: "Create docs/images/ and store README and documentation images there.",
    });
  } else {
    passed.push("Has docs/images/ folder");
  }

  // --- Terminal output example in README (code block) ---
  const hasTerminalOutput = (() => {
    if (!ctx.readmeContent) return false;
    const md = analyzeMarkdown(ctx.readmeContent);
    return md.codeBlocks.some(
      (b) =>
        b.language === "" ||
        b.language === "bash" ||
        b.language === "sh" ||
        b.language === "shell" ||
        b.language === "text" ||
        b.language === "console" ||
        b.content.includes("$") ||
        b.content.includes("✓") ||
        b.content.includes("✗")
    );
  })();

  if (!hasTerminalOutput) {
    findings.push({
      category: "Demo & Visuals",
      severity: "medium",
      title: "No terminal output example in README",
      explanation: "Showing what the tool actually prints helps users decide if they need it.",
      recommendation: "Add a code block showing example terminal output from running the tool.",
      file: "README.md",
    });
  } else {
    passed.push("README has terminal/code output example");
  }

  // --- Example report output ---
  const hasExampleReport =
    ctx.files.some((f) => f.startsWith("docs/examples/")) ||
    ctx.files.some((f) => f.includes("sample-report") || f.includes("example-report"));
  if (!hasExampleReport) {
    findings.push({
      category: "Demo & Visuals",
      severity: "info",
      title: "No example report or output file in docs/",
      explanation: "Having an example output in docs/ helps users see the full capabilities of the tool.",
      recommendation: "Add docs/examples/sample-report.md with example output.",
    });
  } else {
    passed.push("Has example report in docs/");
  }

  return {
    category: "Demo & Visuals",
    score: computeCategoryScore(findings),
    weight: WEIGHT,
    findings,
    passed,
  };
}
