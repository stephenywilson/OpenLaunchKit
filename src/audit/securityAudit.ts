import fs from "fs";
import path from "path";
import { AuditContext, CategoryResult, Finding } from "../types.js";
import { detectSecrets } from "../detectors/secrets.js";
import { detectLocalPaths } from "../detectors/localPaths.js";
import { detectHiddenUnicode } from "../detectors/unicode.js";
import { analyzePackageJson } from "../detectors/packageJson.js";
import { fileExists } from "../detectors/fileExists.js";
import { computeCategoryScore } from "../scoring/score.js";

const WEIGHT = 20;

// Files to scan for secrets (skip binary-ish extensions)
const TEXT_EXTENSIONS = new Set([
  ".ts", ".js", ".tsx", ".jsx", ".py", ".rb", ".go", ".rs", ".java",
  ".sh", ".bash", ".zsh", ".env", ".json", ".yaml", ".yml", ".toml",
  ".md", ".txt", ".html", ".css", ".scss", ".vue", ".svelte", ".cfg",
  ".ini", ".conf", ".config",
]);

// Max file size to scan (1MB)
const MAX_SCAN_SIZE = 1024 * 1024;
const LARGE_FILE_THRESHOLD = 5 * 1024 * 1024; // 5MB

function shouldScanFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return TEXT_EXTENSIONS.has(ext) || ext === "";
}

export function runSecurityAudit(ctx: AuditContext): CategoryResult {
  const findings: Finding[] = [];
  const passed: string[] = [];

  // --- .env files committed ---
  const envFiles = ctx.files.filter(
    (f) => f === ".env" || f.match(/^\.env\.(local|production|development|staging|test)$/)
  );
  if (envFiles.length > 0) {
    findings.push({
      category: "Security & Privacy",
      severity: "critical",
      title: `.env file(s) committed to repository`,
      explanation: `Found committed .env file(s): ${envFiles.join(", ")}. These may contain API keys, passwords, or other secrets.`,
      recommendation: "Remove .env files immediately with `git rm --cached .env`, add .env* to .gitignore, and rotate any exposed credentials.",
      file: envFiles[0],
    });
  } else {
    passed.push("No .env files committed");
  }

  // --- Secret patterns in text files ---
  let secretFound = false;
  const scannedForSecrets: string[] = [];

  for (const relPath of ctx.files) {
    if (!shouldScanFile(relPath)) continue;
    // Skip test/spec files — they contain intentional synthetic data by design
    // and are excluded from npm packages via the `files` field.
    if (
      relPath.match(/(?:^|\/)(?:tests?|__tests?__|spec)\//) ||
      relPath.match(/\.(test|spec)\.[jt]sx?$/)
    ) continue;
    // Skip test fixtures that intentionally have fake keys
    const fullPath = path.join(ctx.projectPath, relPath);
    let content: string;
    try {
      const stat = fs.statSync(fullPath);
      if (stat.size > MAX_SCAN_SIZE) continue;
      content = fs.readFileSync(fullPath, "utf-8");
    } catch {
      continue;
    }

    const secrets = detectSecrets(content);
    if (secrets.length > 0 && !secretFound) {
      secretFound = true;
      findings.push({
        category: "Security & Privacy",
        severity: "critical",
        title: `Possible secret found in ${relPath}`,
        explanation: `Detected pattern "${secrets[0].pattern}" on line ${secrets[0].line}: ${secrets[0].snippet.substring(0, 60)}...`,
        recommendation: "Remove the secret immediately. Rotate any exposed credentials. Use environment variables instead.",
        file: relPath,
      });
    }
    scannedForSecrets.push(relPath);
  }

  if (!secretFound) {
    passed.push("No obvious secrets detected in scanned files");
  }

  // --- Local paths in README and docs ---
  const docsFiles = ctx.files.filter(
    (f) =>
      f === "README.md" ||
      f === "CONTRIBUTING.md" ||
      f.startsWith("docs/") ||
      f.endsWith(".md")
  );

  let localPathFound = false;
  for (const relPath of docsFiles) {
    const fullPath = path.join(ctx.projectPath, relPath);
    let content: string;
    try {
      content = fs.readFileSync(fullPath, "utf-8");
    } catch {
      continue;
    }

    const localPaths = detectLocalPaths(content);
    if (localPaths.length > 0 && !localPathFound) {
      localPathFound = true;
      findings.push({
        category: "Security & Privacy",
        severity: "high",
        title: `Local filesystem path leaked in ${relPath}`,
        explanation: `Found personal path "${localPaths[0].path}" on line ${localPaths[0].line}. This reveals your local directory structure.`,
        recommendation: "Replace local paths with generic examples (e.g., /path/to/project). Search all docs for /Users/, /home/, C:\\\\Users\\\\.",
        file: relPath,
      });
    }
  }

  if (!localPathFound) {
    passed.push("No local filesystem paths found in docs");
  }

  // --- preinstall / postinstall scripts ---
  if (ctx.packageJson) {
    const pkg = analyzePackageJson(ctx.packageJson);
    if (pkg.hasPreinstall || pkg.hasPostinstall) {
      const scriptNames = [
        pkg.hasPreinstall ? "preinstall" : "",
        pkg.hasPostinstall ? "postinstall" : "",
      ].filter(Boolean);
      findings.push({
        category: "Security & Privacy",
        severity: "medium",
        title: `Install lifecycle scripts present: ${scriptNames.join(", ")}`,
        explanation: "preinstall/postinstall scripts run automatically on npm install and can be a security risk. npm security reviews flag these.",
        recommendation: "Remove install lifecycle scripts unless absolutely necessary. Document why they're needed.",
        file: "package.json",
      });
    } else {
      passed.push("No install lifecycle scripts (preinstall/postinstall)");
    }
  }

  // --- curl | bash patterns ---
  const readmeHasCurlBash =
    ctx.readmeContent &&
    (/curl\s+.*\|\s*bash/i.test(ctx.readmeContent) ||
      /curl\s+.*\|\s*sh/i.test(ctx.readmeContent));
  if (readmeHasCurlBash) {
    findings.push({
      category: "Security & Privacy",
      severity: "medium",
      title: "curl | bash installation pattern in README",
      explanation: "Instructing users to pipe curl output to bash is a security anti-pattern.",
      recommendation: "Use signed installation scripts, verify checksums, or prefer package manager installs (npm, brew, apt).",
      file: "README.md",
    });
  } else {
    passed.push("No curl|bash install pattern");
  }

  // --- Hidden Unicode characters ---
  // Exclude test/spec files: they intentionally embed special characters for testing purposes.
  const filesToCheckUnicode = ctx.files.filter(
    (f) =>
      (f.endsWith(".ts") || f.endsWith(".js") || f.endsWith(".md")) &&
      !f.match(/(?:^|\/)(?:tests?|__tests?__|spec)\//) &&
      !f.match(/\.(test|spec)\.[jt]sx?$/)
  );
  let unicodeFound = false;
  for (const relPath of filesToCheckUnicode.slice(0, 20)) {
    const fullPath = path.join(ctx.projectPath, relPath);
    let content: string;
    try {
      content = fs.readFileSync(fullPath, "utf-8");
    } catch {
      continue;
    }
    const unicodeMatches = detectHiddenUnicode(content);
    if (unicodeMatches.length > 0 && !unicodeFound) {
      unicodeFound = true;
      findings.push({
        category: "Security & Privacy",
        severity: "high",
        title: `Hidden Unicode characters in ${relPath}`,
        explanation: `Found ${unicodeMatches[0].description} (${unicodeMatches[0].codePoint}) at line ${unicodeMatches[0].line}. These can hide malicious code.`,
        recommendation: "Remove hidden Unicode characters. They can be used to obfuscate malicious code.",
        file: relPath,
      });
    }
  }

  if (!unicodeFound) {
    passed.push("No hidden Unicode characters detected");
  }

  // --- Oversized files ---
  for (const relPath of ctx.files) {
    const fullPath = path.join(ctx.projectPath, relPath);
    try {
      const stat = fs.statSync(fullPath);
      if (stat.size > LARGE_FILE_THRESHOLD) {
        findings.push({
          category: "Security & Privacy",
          severity: "medium",
          title: `Large file committed: ${relPath} (${Math.round(stat.size / 1024 / 1024)}MB)`,
          explanation: `${relPath} is over 5MB. Large files bloat repository size and slow clones.`,
          recommendation: "Use Git LFS for large files, or exclude them with .gitignore.",
          file: relPath,
        });
        break; // only one finding for this check
      }
    } catch {
      continue;
    }
  }

  // --- Private key files ---
  const keyFiles = ctx.files.filter(
    (f) =>
      f.endsWith(".pem") ||
      f.endsWith(".key") ||
      f.endsWith(".p12") ||
      f.endsWith(".pfx") ||
      f.endsWith(".cer") ||
      f.endsWith(".crt")
  );
  if (keyFiles.length > 0) {
    findings.push({
      category: "Security & Privacy",
      severity: "critical",
      title: `Private key or certificate file committed: ${keyFiles[0]}`,
      explanation: `Found key/certificate file(s): ${keyFiles.slice(0, 3).join(", ")}. These may contain sensitive cryptographic material.`,
      recommendation: "Remove key files immediately from git history using git-filter-repo or BFG. Add *.pem, *.key to .gitignore.",
      file: keyFiles[0],
    });
  } else {
    passed.push("No private key or certificate files committed");
  }

  // Check if .env is gitignored
  const gitignorePath = path.join(ctx.projectPath, ".gitignore");
  let gitignoreIgnoresEnv = false;
  if (fileExists(ctx.projectPath, ".gitignore")) {
    try {
      const gi = fs.readFileSync(gitignorePath, "utf-8");
      gitignoreIgnoresEnv = /^\.env/m.test(gi);
    } catch {
      // ignore
    }
  }

  if (!gitignoreIgnoresEnv && !envFiles.length) {
    findings.push({
      category: "Security & Privacy",
      severity: "low",
      title: ".env is not listed in .gitignore",
      explanation: ".env files are not excluded in .gitignore. This risks accidental secret exposure in the future.",
      recommendation: "Add .env and .env.* to your .gitignore file.",
      file: ".gitignore",
    });
  } else if (gitignoreIgnoresEnv) {
    passed.push(".env files are gitignored");
  }

  return {
    category: "Security & Privacy",
    score: computeCategoryScore(findings),
    weight: WEIGHT,
    findings,
    passed,
  };
}
