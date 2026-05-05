import { AuditContext, CategoryResult, Finding } from "../types.js";
import { analyzePackageJson, isGenericName } from "../detectors/packageJson.js";
import { fileExists } from "../detectors/fileExists.js";
import { computeCategoryScore } from "../scoring/score.js";

const WEIGHT = 20;

export function runPackageAudit(ctx: AuditContext): CategoryResult {
  const findings: Finding[] = [];
  const passed: string[] = [];

  // --- package.json exists ---
  if (!ctx.packageJson) {
    findings.push({
      category: "Package Readiness",
      severity: "critical",
      title: "package.json is missing",
      explanation: "There is no package.json in the project root. Without it, the package cannot be published to npm.",
      recommendation: "Run `npm init` to create a package.json.",
    });
    return {
      category: "Package Readiness",
      score: 0,
      weight: WEIGHT,
      findings,
      passed,
    };
  }

  const pkg = analyzePackageJson(ctx.packageJson);

  // --- name ---
  if (!pkg.name) {
    findings.push({
      category: "Package Readiness",
      severity: "critical",
      title: "package.json is missing the name field",
      explanation: "The package has no name, which makes it unpublishable.",
      recommendation: "Add a unique, descriptive name to your package.json.",
      file: "package.json",
    });
  } else if (isGenericName(pkg.name)) {
    findings.push({
      category: "Package Readiness",
      severity: "high",
      title: `Generic package name: "${pkg.name}"`,
      explanation: `The name "${pkg.name}" is a placeholder name. It won't be unique on npm and signals an unfinished project.`,
      recommendation: "Choose a unique, descriptive package name.",
      file: "package.json",
    });
  } else {
    passed.push(`Package name: ${pkg.name}`);
  }

  // --- version ---
  if (!pkg.version) {
    findings.push({
      category: "Package Readiness",
      severity: "high",
      title: "Missing version field",
      explanation: "The package has no version number.",
      recommendation: "Add a version field (e.g., \"0.1.0\") to your package.json.",
      file: "package.json",
    });
  } else {
    passed.push(`Version: ${pkg.version}`);
  }

  // --- description ---
  if (!pkg.description || pkg.description.trim().length < 10) {
    findings.push({
      category: "Package Readiness",
      severity: "medium",
      title: "Missing or too-short description",
      explanation: "The package description is absent or fewer than 10 characters. npm search results show the description.",
      recommendation: "Add a clear, concise description (1–2 sentences) of what the package does.",
      file: "package.json",
    });
  } else {
    passed.push("Has description");
  }

  // --- bin field for CLI projects ---
  const looksLikeCli =
    ctx.files.some((f) => f === "src/cli.ts" || f === "src/cli.js" || f.startsWith("bin/")) ||
    pkg.isCliProject;
  if (looksLikeCli && !pkg.bin) {
    findings.push({
      category: "Package Readiness",
      severity: "high",
      title: "CLI project is missing bin field in package.json",
      explanation: "This appears to be a CLI tool but the bin field is missing, so `npx` won't work.",
      recommendation: "Add a bin field pointing to your compiled CLI entry point.",
      file: "package.json",
    });
  } else if (pkg.isCliProject) {
    passed.push("Has bin field for CLI");
  }

  // --- files field or .npmignore ---
  const hasNpmignore = fileExists(ctx.projectPath, ".npmignore");
  if (!pkg.hasFilesField && !hasNpmignore) {
    findings.push({
      category: "Package Readiness",
      severity: "medium",
      title: "No files field or .npmignore",
      explanation: "Without a files field or .npmignore, everything (including source, tests, fixtures) gets published.",
      recommendation: "Add a files field to package.json listing only what to publish (e.g., [\"dist\", \"README.md\", \"LICENSE\"]).",
      file: "package.json",
    });
  } else {
    passed.push("Has files field or .npmignore to control published content");
  }

  // --- main/module/exports ---
  if (!pkg.main && !pkg.module && !pkg.exports) {
    findings.push({
      category: "Package Readiness",
      severity: "medium",
      title: "No main, module, or exports field",
      explanation: "Without an entry point, users cannot require/import your package.",
      recommendation: "Add a main (CommonJS) or exports field pointing to your compiled output.",
      file: "package.json",
    });
  } else {
    passed.push("Has entry point (main/module/exports)");
  }

  // --- repository ---
  if (!pkg.repository) {
    findings.push({
      category: "Package Readiness",
      severity: "low",
      title: "No repository field",
      explanation: "The repository field is missing. npm and tools use this to link to your GitHub page.",
      recommendation: "Add a repository field pointing to your GitHub repository.",
      file: "package.json",
    });
  } else {
    passed.push("Has repository field");
  }

  // --- license ---
  if (!pkg.license) {
    findings.push({
      category: "Package Readiness",
      severity: "medium",
      title: "No license field",
      explanation: "Without a license, users technically cannot use your package legally.",
      recommendation: "Add a license field (e.g., \"MIT\") to your package.json.",
      file: "package.json",
    });
  } else {
    passed.push(`License: ${pkg.license}`);
  }

  // --- keywords ---
  if (pkg.keywords.length < 3) {
    findings.push({
      category: "Package Readiness",
      severity: "low",
      title: `Too few keywords (${pkg.keywords.length})`,
      explanation: "npm search uses keywords. Having fewer than 3 reduces discoverability.",
      recommendation: "Add at least 3–8 relevant keywords to your package.json.",
      file: "package.json",
    });
  } else {
    passed.push(`Has ${pkg.keywords.length} keywords`);
  }

  // --- build script ---
  if (!pkg.hasBuildScript) {
    findings.push({
      category: "Package Readiness",
      severity: "medium",
      title: "No build script",
      explanation: "There is no build script in package.json. TypeScript/compiled projects need a build step.",
      recommendation: "Add a build script (e.g., \"tsc\" or \"vite build\") to your package.json.",
      file: "package.json",
    });
  } else {
    passed.push("Has build script");
  }

  // --- lockfile consistency ---
  const hasPackageLock = fileExists(ctx.projectPath, "package-lock.json");
  const hasYarnLock = fileExists(ctx.projectPath, "yarn.lock");
  const hasPnpmLock = fileExists(ctx.projectPath, "pnpm-lock.yaml");
  const lockfileCount = [hasPackageLock, hasYarnLock, hasPnpmLock].filter(Boolean).length;

  if (lockfileCount === 0) {
    findings.push({
      category: "Package Readiness",
      severity: "low",
      title: "No lockfile found",
      explanation: "No package-lock.json, yarn.lock, or pnpm-lock.yaml found. Lockfiles ensure reproducible installs.",
      recommendation: "Run `npm install` (or your package manager) to generate a lockfile and commit it.",
    });
  } else if (lockfileCount > 1) {
    findings.push({
      category: "Package Readiness",
      severity: "low",
      title: "Multiple lockfiles found",
      explanation: "Multiple lockfiles (npm + yarn/pnpm) suggest inconsistent package manager usage.",
      recommendation: "Remove lockfiles for package managers you're not using.",
    });
  } else {
    passed.push("Has lockfile for reproducible installs");
  }

  // --- dist not in .gitignore ---
  const gitignoreContent = ctx.files.includes(".gitignore")
    ? require("fs").readFileSync(require("path").join(ctx.projectPath, ".gitignore"), "utf-8")
    : "";
  const distIgnored = /^dist\//m.test(gitignoreContent) || /^dist$/m.test(gitignoreContent);
  const distExists = ctx.files.some((f) => f.startsWith("dist/"));

  if (distExists && !distIgnored) {
    findings.push({
      category: "Package Readiness",
      severity: "medium",
      title: "dist/ folder is committed without being in .gitignore",
      explanation: "Committing built dist/ files bloats the repository and causes merge conflicts.",
      recommendation: "Add dist/ to .gitignore and remove it from version control. The dist/ gets generated on publish via prepublishOnly.",
      file: ".gitignore",
    });
  } else {
    passed.push("dist/ is properly gitignored or not committed");
  }

  // --- private:true check ---
  if (pkg.private && pkg.isCliProject) {
    findings.push({
      category: "Package Readiness",
      severity: "medium",
      title: "Package has private: true",
      explanation: "The private flag prevents publishing to npm. Remove it if you intend to publish.",
      recommendation: "Remove `\"private\": true` from package.json before publishing.",
      file: "package.json",
    });
  }

  return {
    category: "Package Readiness",
    score: computeCategoryScore(findings),
    weight: WEIGHT,
    findings,
    passed,
  };
}
