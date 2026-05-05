import { CategoryResult, Finding, Severity } from "../types.js";

export function severityDeduction(severity: Severity): number {
  switch (severity) {
    case "critical":
      return 20;
    case "high":
      return 10;
    case "medium":
      return 5;
    case "low":
      return 2;
    case "info":
      return 0;
  }
}

export function computeCategoryScore(findings: Finding[], maxDeduction: number = 100): number {
  let deductions = 0;
  for (const f of findings) {
    deductions += severityDeduction(f.severity);
  }
  return Math.max(0, 100 - Math.min(deductions, maxDeduction));
}

export function computeOverallScore(categories: CategoryResult[]): number {
  let total = 0;
  let totalWeight = 0;
  for (const cat of categories) {
    total += cat.score * cat.weight;
    totalWeight += cat.weight;
  }
  if (totalWeight === 0) return 0;
  return Math.round(total / totalWeight);
}

export function getTopFixes(categories: CategoryResult[], limit: number = 5): Finding[] {
  const severityOrder: Record<Severity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
    info: 4,
  };

  const allFindings: Finding[] = categories.flatMap((c) => c.findings);
  allFindings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  return allFindings.slice(0, limit);
}
