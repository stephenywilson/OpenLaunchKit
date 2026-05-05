import { AuditReport, CategoryResult, Finding, Severity } from "../types.js";

// ANSI color codes
const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  brightGreen: "\x1b[92m",
  brightYellow: "\x1b[93m",
  brightRed: "\x1b[91m",
  brightCyan: "\x1b[96m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgRed: "\x1b[41m",
};

function colorScore(score: number): string {
  if (score >= 80) return `${C.brightGreen}${score}${C.reset}`;
  if (score >= 60) return `${C.brightYellow}${score}${C.reset}`;
  return `${C.brightRed}${score}${C.reset}`;
}

function scoreIcon(score: number): string {
  if (score >= 80) return `${C.brightGreen}✓${C.reset}`;
  if (score >= 60) return `${C.brightYellow}⚠${C.reset}`;
  return `${C.brightRed}✗${C.reset}`;
}

function severityColor(severity: Severity): string {
  switch (severity) {
    case "critical":
      return `${C.bold}${C.brightRed}CRITICAL${C.reset}`;
    case "high":
      return `${C.brightRed}HIGH    ${C.reset}`;
    case "medium":
      return `${C.brightYellow}MEDIUM  ${C.reset}`;
    case "low":
      return `${C.dim}LOW     ${C.reset}`;
    case "info":
      return `${C.dim}INFO    ${C.reset}`;
  }
}

function launchReadyLabel(report: AuditReport): string {
  if (report.launchReady) {
    return `${C.bgGreen}${C.bold} LAUNCH READY ${C.reset}`;
  }
  if (report.overallScore >= 60) {
    return `${C.bgYellow}${C.bold} NEEDS WORK ${C.reset}`;
  }
  return `${C.bgRed}${C.bold} NOT READY ${C.reset}`;
}

export function renderTerminalReport(report: AuditReport): string {
  const lines: string[] = [];
  const W = 62;
  const border = "═".repeat(W);
  const topLine = `╔${border}╗`;
  const botLine = `╚${border}╝`;
  const title = "OpenLaunchKit Audit Report";
  const padded = title.padStart(Math.floor((W + title.length) / 2)).padEnd(W);

  lines.push("");
  lines.push(`${C.cyan}${topLine}${C.reset}`);
  lines.push(`${C.cyan}║${C.reset}${C.bold}${padded}${C.reset}${C.cyan}║${C.reset}`);
  lines.push(`${C.cyan}${botLine}${C.reset}`);
  lines.push("");

  // Project info
  lines.push(`  ${C.dim}Project:${C.reset}  ${C.bold}${report.projectName}${C.reset}`);
  lines.push(`  ${C.dim}Audited:${C.reset}  ${report.auditedAt}`);
  lines.push(`  ${C.dim}Path:${C.reset}     ${report.projectPath}`);
  lines.push("");

  // Overall score
  const scoreStr = colorScore(report.overallScore);
  const statusLabel = launchReadyLabel(report);
  lines.push(
    `  ${C.bold}Overall Launch Score:${C.reset}  ${scoreStr}${C.dim}/100${C.reset}  ${statusLabel}`
  );
  lines.push("");

  // Category scores
  lines.push(`  ${C.bold}Category Scores:${C.reset}`);
  for (let i = 0; i < report.categories.length; i++) {
    const cat = report.categories[i];
    const isLast = i === report.categories.length - 1;
    const prefix = isLast ? "  └─" : "  ├─";
    const name = cat.category.padEnd(26);
    const score = String(cat.score).padStart(3);
    const icon = scoreIcon(cat.score);
    lines.push(`${prefix} ${name} ${colorScore(cat.score)}${C.dim}/100${C.reset}  ${icon}`);
  }
  lines.push("");

  // Top fixes
  if (report.topFixes.length > 0) {
    lines.push(`  ${C.bold}Top Fixes:${C.reset}`);
    report.topFixes.forEach((fix, idx) => {
      lines.push(
        `  ${C.dim}${idx + 1}.${C.reset} [${severityColor(fix.severity)}] ${fix.title}`
      );
      // Wrap recommendation at ~70 chars
      const rec = fix.recommendation;
      const wrapped = wrapText(rec, 70);
      for (const wline of wrapped) {
        lines.push(`     ${C.dim}${wline}${C.reset}`);
      }
    });
    lines.push("");
  }

  // Summary
  const passing = report.categories.filter((c) => c.score >= 80).length;
  const total = report.categories.length;
  lines.push(
    `  ${C.dim}${passing}/${total} categories passing (≥80).${C.reset}`
  );

  if (!report.launchReady) {
    lines.push(
      `  ${C.brightYellow}Fix the top issues above before launching.${C.reset}`
    );
  } else {
    lines.push(
      `  ${C.brightGreen}You're launch ready! Ship it. 🚀${C.reset}`
    );
  }

  lines.push("");
  lines.push(
    `  ${C.dim}Run with --json for full report, --markdown for Markdown output.${C.reset}`
  );
  lines.push("");

  return lines.join("\n");
}

function wrapText(text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (current.length + word.length + 1 > maxWidth && current.length > 0) {
      lines.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}
