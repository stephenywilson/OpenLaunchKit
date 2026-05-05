import { AuditContext, CategoryResult, Finding } from "../types.js";
import { fileExists } from "../detectors/fileExists.js";
import { analyzeMarkdown } from "../detectors/markdown.js";
import { computeCategoryScore } from "../scoring/score.js";

const WEIGHT = 5;

export function runSocialAudit(ctx: AuditContext): CategoryResult {
  const findings: Finding[] = [];
  const passed: string[] = [];

  // --- docs/launch/ directory ---
  const hasLaunchDir =
    ctx.files.some((f) => f.startsWith("docs/launch/")) ||
    fileExists(ctx.projectPath, "docs", "launch");
  if (!hasLaunchDir) {
    findings.push({
      category: "Social Launch",
      severity: "medium",
      title: "No docs/launch/ directory",
      explanation: "A docs/launch/ folder with pre-written posts shows launch readiness.",
      recommendation: "Run `openlaunchkit init-launch-docs` to create launch post templates.",
    });
  } else {
    passed.push("docs/launch/ directory present");
  }

  // --- docs/launch/x-post.md ---
  const hasXPost =
    ctx.files.includes("docs/launch/x-post.md") ||
    fileExists(ctx.projectPath, "docs", "launch", "x-post.md");
  if (!hasXPost) {
    findings.push({
      category: "Social Launch",
      severity: "low",
      title: "No X (Twitter) launch post template",
      explanation: "Having a prepared X post template means you can launch faster.",
      recommendation: "Add docs/launch/x-post.md with a pre-written launch tweet.",
    });
  } else {
    passed.push("X / Twitter launch post template present");
  }

  // --- docs/launch/hn-post.md ---
  const hasHnPost =
    ctx.files.includes("docs/launch/hn-post.md") ||
    fileExists(ctx.projectPath, "docs", "launch", "hn-post.md");
  if (!hasHnPost) {
    findings.push({
      category: "Social Launch",
      severity: "low",
      title: "No Hacker News Show HN post template",
      explanation: "A Show HN post can drive significant traffic. Having a template prepared helps.",
      recommendation: "Add docs/launch/hn-post.md with a pre-written Show HN post.",
    });
  } else {
    passed.push("Hacker News post template present");
  }

  // --- Short tagline (< 280 chars) in README ---
  const taglineOk = (() => {
    if (!ctx.readmeContent) return false;
    const md = analyzeMarkdown(ctx.readmeContent);
    // Look for a line near the top that's under 280 chars (suitable as a tweet)
    const lines = ctx.readmeContent.split("\n");
    for (const line of lines.slice(0, 20)) {
      const trimmed = line.trim();
      if (
        trimmed.length > 15 &&
        trimmed.length <= 280 &&
        !trimmed.startsWith("#") &&
        !trimmed.startsWith("!") &&
        !trimmed.startsWith("[") &&
        !trimmed.startsWith("|")
      ) {
        return true;
      }
    }
    return false;
  })();

  if (!taglineOk) {
    findings.push({
      category: "Social Launch",
      severity: "low",
      title: "No short tagline (< 280 chars) near the top of README",
      explanation: "A short, tweet-able tagline makes it easy to share the project on social media.",
      recommendation: "Add a one-sentence tagline right after the H1 heading. Keep it under 280 characters.",
      file: "README.md",
    });
  } else {
    passed.push("README has short shareable tagline");
  }

  // --- Long description (> 100 chars) in README ---
  const hasLongDesc = (() => {
    if (!ctx.readmeContent) return false;
    return ctx.readmeContent.length > 100;
  })();

  if (!hasLongDesc) {
    findings.push({
      category: "Social Launch",
      severity: "medium",
      title: "README description is too short",
      explanation: "A longer, detailed description gives users and search engines more to work with.",
      recommendation: "Expand your README to include detailed descriptions of what the project does.",
      file: "README.md",
    });
  } else {
    passed.push("README has substantial description");
  }

  // --- Numbered value proposition bullets ---
  const hasValueProps = (() => {
    if (!ctx.readmeContent) return false;
    // Look for numbered list or bullet list with multiple items
    const bulletMatches = ctx.readmeContent.match(/^[-*•]\s+.{10,}/gm);
    const numberedMatches = ctx.readmeContent.match(/^\d+\.\s+.{10,}/gm);
    return (bulletMatches && bulletMatches.length >= 3) ||
           (numberedMatches && numberedMatches.length >= 3);
  })();

  if (!hasValueProps) {
    findings.push({
      category: "Social Launch",
      severity: "info",
      title: "No clear value proposition bullet list",
      explanation: "Numbered or bulleted value propositions help readers quickly understand the benefits.",
      recommendation: "Add 3-5 bullet points listing the key benefits of your project.",
      file: "README.md",
    });
  } else {
    passed.push("README has value proposition bullets");
  }

  return {
    category: "Social Launch",
    score: computeCategoryScore(findings),
    weight: WEIGHT,
    findings,
    passed,
  };
}
