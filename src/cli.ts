#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { AuditContext, AuditReport } from "./types.js";
import { listFiles, readFile } from "./detectors/fileExists.js";
import { runReadmeAudit } from "./audit/readmeAudit.js";
import { runPackageAudit } from "./audit/packageAudit.js";
import { runHygieneAudit } from "./audit/hygieneAudit.js";
import { runSecurityAudit } from "./audit/securityAudit.js";
import { runDemoAudit } from "./audit/demoAudit.js";
import { runSocialAudit } from "./audit/socialAudit.js";
import { runAiRedFlagsAudit } from "./audit/aiRedFlagsAudit.js";
import { computeOverallScore, getTopFixes } from "./scoring/score.js";
import { renderTerminalReport } from "./reporters/terminalReporter.js";
import { renderJsonReport } from "./reporters/jsonReporter.js";
import { renderMarkdownReport } from "./reporters/markdownReporter.js";

const VERSION = "0.1.0";

// ---- Argument parsing ----
interface CliArgs {
  command: string;
  json: boolean;
  markdown: boolean;
  output: string | null;
  noFail: boolean;
  projectPath: string;
}

function parseArgs(argv: string[]): CliArgs {
  const args = argv.slice(2);
  const result: CliArgs = {
    command: "help",
    json: false,
    markdown: false,
    output: null,
    noFail: false,
    projectPath: process.cwd(),
  };

  if (args.length === 0) {
    result.command = "help";
    return result;
  }

  // First positional arg is the command
  if (!args[0].startsWith("--")) {
    result.command = args[0];
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--json") result.json = true;
    else if (arg === "--markdown") result.markdown = true;
    else if (arg === "--no-fail") result.noFail = true;
    else if (arg === "--output" && args[i + 1]) {
      result.output = args[++i];
    } else if (arg === "--path" && args[i + 1]) {
      result.projectPath = path.resolve(args[++i]);
    } else if (arg.startsWith("--output=")) {
      result.output = arg.split("=")[1];
    } else if (arg.startsWith("--path=")) {
      result.projectPath = path.resolve(arg.split("=")[1]);
    }
  }

  return result;
}

// ---- Help text ----
function printHelp(): void {
  const C = {
    bold: "\x1b[1m",
    cyan: "\x1b[36m",
    dim: "\x1b[2m",
    reset: "\x1b[0m",
  };
  process.stdout.write(`
${C.bold}openlaunchkit${C.reset} — Launch readiness auditor for AI-built GitHub projects

${C.bold}USAGE${C.reset}
  openlaunchkit <command> [options]

${C.bold}COMMANDS${C.reset}
  ${C.cyan}audit${C.reset}               Audit the current directory (or --path)
  ${C.cyan}init-launch-docs${C.reset}    Create docs/launch/ templates
  ${C.cyan}version${C.reset}             Print version
  ${C.cyan}help${C.reset}                Print this help

${C.bold}AUDIT OPTIONS${C.reset}
  ${C.cyan}--json${C.reset}              Output full JSON report
  ${C.cyan}--markdown${C.reset}          Output Markdown report
  ${C.cyan}--output <file>${C.reset}     Save report to file
  ${C.cyan}--path <dir>${C.reset}        Path to project to audit (default: cwd)
  ${C.cyan}--no-fail${C.reset}           Exit 0 even if score < 70

${C.bold}EXAMPLES${C.reset}
  npx openlaunchkit audit
  npx openlaunchkit audit --json
  npx openlaunchkit audit --markdown --output report.md
  npx openlaunchkit audit --path ./my-project
  npx openlaunchkit init-launch-docs

${C.dim}OpenLaunchKit v${VERSION}${C.reset}
`);
}

// ---- Build audit context ----
function buildContext(projectPath: string): AuditContext {
  const files = listFiles(projectPath);
  const readmeContent = readFile(projectPath, "README.md");
  let packageJson: Record<string, unknown> | null = null;

  const pkgRaw = readFile(projectPath, "package.json");
  if (pkgRaw) {
    try {
      packageJson = JSON.parse(pkgRaw) as Record<string, unknown>;
    } catch {
      // ignore parse errors
    }
  }

  return { projectPath, files, readmeContent, packageJson };
}

// ---- Run all audits ----
function runAudit(projectPath: string): AuditReport {
  const ctx = buildContext(projectPath);

  const categories = [
    runReadmeAudit(ctx),
    runPackageAudit(ctx),
    runHygieneAudit(ctx),
    runSecurityAudit(ctx),
    runDemoAudit(ctx),
    runSocialAudit(ctx),
    runAiRedFlagsAudit(ctx),
  ];

  const overallScore = computeOverallScore(categories);
  const topFixes = getTopFixes(categories, 5);

  const pkgName =
    ctx.packageJson && typeof ctx.packageJson["name"] === "string"
      ? ctx.packageJson["name"]
      : path.basename(projectPath);

  return {
    projectPath,
    projectName: pkgName,
    auditedAt: new Date().toISOString().split("T")[0],
    overallScore,
    categories,
    topFixes,
    launchReady: overallScore >= 70,
  };
}

// ---- init-launch-docs — inlined templates ----
const LAUNCH_TEMPLATES: Array<{ name: string; content: string }> = [
  {
    name: "x-post.md",
    content: `# X / Twitter Launch Post Template

Replace the placeholders below with your project details.

---

🚀 Just shipped [PROJECT_NAME] — [ONE_LINE_TAGLINE]

What it does:
→ [BENEFIT_1]
→ [BENEFIT_2]
→ [BENEFIT_3]

Free, open source, and works in 30 seconds:
npx [PACKAGE_NAME]

GitHub: [GITHUB_URL]

[SCREENSHOT_OR_DEMO_LINK]
`,
  },
  {
    name: "hn-post.md",
    content: `# Hacker News – Show HN Post Template

## Post Title

Show HN: [PROJECT_NAME] – [ONE_LINE_TAGLINE_UNDER_80_CHARS]

---

## Post Body (optional first comment)

Hi HN,

I built [PROJECT_NAME] because [PROBLEM_YOU_FACED].

**What it does:**
[BRIEF_2-3_SENTENCE_DESCRIPTION]

**Quick start:**
\`\`\`
npx [PACKAGE_NAME]
\`\`\`

GitHub: [GITHUB_URL]

Happy to answer any questions. Looking forward to your feedback.

---

## Tips for Show HN

- Keep the title under 80 characters
- Post on weekday mornings (US time) for best visibility
- Be in the comments ready to respond quickly
`,
  },
  {
    name: "reddit-post.md",
    content: `# Reddit Launch Post Template

## Recommended Subreddits

- r/programming — general programming projects
- r/opensource — open source tools
- r/node — Node.js/npm packages

---

## Post Title

> I built [PROJECT_NAME] – [ONE_LINE_TAGLINE]

## Post Body

I've been working on **[PROJECT_NAME]** – [ONE_LINE_TAGLINE].

**The problem it solves:**
[2-3 sentences about the pain point]

**Quick start:**
\`\`\`bash
npx [PACKAGE_NAME]
\`\`\`

**Links:**
- GitHub: [GITHUB_URL]
- npm: https://www.npmjs.com/package/[PACKAGE_NAME]

MIT licensed and free. Feedback welcome!
`,
  },
  {
    name: "launch-checklist.md",
    content: `# Pre-Launch Checklist

## README Quality
- [ ] README has a clear H1 title
- [ ] One-line tagline below the title
- [ ] Quick Start / Getting Started section
- [ ] Install command is clear
- [ ] Usage example with code block
- [ ] Screenshot or demo GIF/SVG included
- [ ] Features section
- [ ] Limitations section
- [ ] Roadmap section
- [ ] License section

## Package Readiness
- [ ] Unique, descriptive package name
- [ ] Version set (e.g., 0.1.0)
- [ ] Description under 150 chars
- [ ] bin field set (for CLI tools)
- [ ] files field limits published content
- [ ] repository field points to GitHub
- [ ] build script runs clean
- [ \`npm pack --dry-run\` shows only expected files

## Open Source Hygiene
- [ ] LICENSE file present
- [ ] CHANGELOG.md initialized
- [ ] CONTRIBUTING.md with setup instructions
- [ ] SECURITY.md with vulnerability reporting
- [ ] .gitignore covers node_modules, dist, .env

## Security
- [ ] No .env files in repository
- [ ] No API keys or tokens in any files
- [ ] No local paths (/Users/you/...) in docs
- [ ] .env added to .gitignore

## Final Checks
- [ ] \`npx openlaunchkit audit\` score >= 70
- [ ] \`npm run build\` succeeds
- [ ] \`npm test\` passes
- [ ] GitHub repository is public

When all boxes are checked, you're ready to launch!
`,
  },
];

function initLaunchDocs(projectPath: string): void {
  const launchDir = path.join(projectPath, "docs", "launch");
  fs.mkdirSync(launchDir, { recursive: true });

  let created = 0;
  for (const t of LAUNCH_TEMPLATES) {
    const dest = path.join(launchDir, t.name);
    if (fs.existsSync(dest)) {
      process.stdout.write(`  skipped (exists): ${path.relative(projectPath, dest)}\n`);
      continue;
    }
    fs.writeFileSync(dest, t.content);
    process.stdout.write(`  created: ${path.relative(projectPath, dest)}\n`);
    created++;
  }

  process.stdout.write(`\nCreated ${created} template(s) in docs/launch/\n`);
}

// ---- Main ----
async function main(): Promise<void> {
  const args = parseArgs(process.argv);

  switch (args.command) {
    case "version":
      process.stdout.write(`openlaunchkit v${VERSION}\n`);
      return;

    case "help":
      printHelp();
      return;

    case "init-launch-docs":
      initLaunchDocs(args.projectPath);
      return;

    case "audit": {
      let report: AuditReport;
      try {
        report = runAudit(args.projectPath);
      } catch (err) {
        process.stderr.write(`Error running audit: ${String(err)}\n`);
        process.exit(1);
      }

      let output: string;
      if (args.json) {
        output = renderJsonReport(report);
      } else if (args.markdown) {
        output = renderMarkdownReport(report);
      } else {
        output = renderTerminalReport(report);
      }

      if (args.output) {
        const outPath = path.resolve(args.output);
        fs.writeFileSync(outPath, output);
        process.stdout.write(`Report saved to: ${outPath}\n`);
        if (!args.json && !args.markdown) {
          process.stdout.write(output);
        }
      } else {
        process.stdout.write(output);
      }

      if (!args.noFail && !report.launchReady) {
        process.exit(1);
      }
      return;
    }

    default:
      process.stderr.write(`Unknown command: ${args.command}\n\n`);
      printHelp();
      process.exit(1);
  }
}

main().catch((err) => {
  process.stderr.write(`Unexpected error: ${String(err)}\n`);
  process.exit(1);
});
