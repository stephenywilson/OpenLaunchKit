import fs from "fs";
import path from "path";

export function fileExists(projectPath: string, ...parts: string[]): boolean {
  return fs.existsSync(path.join(projectPath, ...parts));
}

export function readFile(projectPath: string, ...parts: string[]): string | null {
  const fullPath = path.join(projectPath, ...parts);
  try {
    return fs.readFileSync(fullPath, "utf-8");
  } catch {
    return null;
  }
}

export function listFiles(projectPath: string): string[] {
  // Recursively list files, skip node_modules, .git, dist
  const results: string[] = [];
  const skip = new Set([
    "node_modules",
    ".git",
    "dist",
    ".next",
    "build",
    "__pycache__",
    ".venv",
    "venv",
  ]);

  function walk(dir: string, rel: string) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (skip.has(entry.name)) continue;
      const relPath = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walk(path.join(dir, entry.name), relPath);
      } else {
        results.push(relPath);
      }
    }
  }

  try {
    walk(projectPath, "");
  } catch {
    // ignore
  }
  return results;
}
