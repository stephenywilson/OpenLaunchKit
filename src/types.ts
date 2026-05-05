export type Severity = "info" | "low" | "medium" | "high" | "critical";
export type Category =
  | "README"
  | "Package Readiness"
  | "Open Source Hygiene"
  | "Security & Privacy"
  | "Demo & Visuals"
  | "Social Launch"
  | "AI Red Flags";

export interface Finding {
  category: Category;
  severity: Severity;
  title: string;
  explanation: string;
  recommendation: string;
  file?: string;
}

export interface CategoryResult {
  category: Category;
  score: number;   // 0-100
  weight: number;  // contribution to overall score
  findings: Finding[];
  passed: string[]; // things that are good
}

export interface AuditReport {
  projectPath: string;
  projectName: string;
  auditedAt: string;
  overallScore: number;
  categories: CategoryResult[];
  topFixes: Finding[];
  launchReady: boolean;
}

export interface AuditContext {
  projectPath: string;
  files: string[];          // all tracked files (from dir listing, not git)
  readmeContent: string | null;
  packageJson: Record<string, unknown> | null;
}
