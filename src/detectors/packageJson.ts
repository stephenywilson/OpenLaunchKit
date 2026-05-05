export interface PackageJsonAnalysis {
  name: string | null;
  version: string | null;
  description: string | null;
  license: string | null;
  keywords: string[];
  repository: unknown;
  main: string | null;
  module: string | null;
  exports: unknown;
  bin: unknown;
  files: string[] | null;
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  private: boolean;
  hasBuildScript: boolean;
  hasTestScript: boolean;
  hasPreinstall: boolean;
  hasPostinstall: boolean;
  isCliProject: boolean;
  hasFilesField: boolean;
}

const GENERIC_NAMES = new Set([
  "my-app",
  "vite-project",
  "my-project",
  "my-package",
  "app",
  "project",
  "template",
  "starter",
  "new-project",
  "react-app",
  "my-react-app",
  "next-app",
  "my-next-app",
]);

export function analyzePackageJson(pkg: Record<string, unknown>): PackageJsonAnalysis {
  const scripts = (pkg["scripts"] as Record<string, string>) ?? {};
  const dependencies = (pkg["dependencies"] as Record<string, string>) ?? {};
  const devDependencies = (pkg["devDependencies"] as Record<string, string>) ?? {};

  const name = typeof pkg["name"] === "string" ? pkg["name"] : null;
  const bin = pkg["bin"];
  const files = Array.isArray(pkg["files"])
    ? (pkg["files"] as string[])
    : null;

  return {
    name,
    version: typeof pkg["version"] === "string" ? pkg["version"] : null,
    description: typeof pkg["description"] === "string" ? pkg["description"] : null,
    license: typeof pkg["license"] === "string" ? pkg["license"] : null,
    keywords: Array.isArray(pkg["keywords"]) ? (pkg["keywords"] as string[]) : [],
    repository: pkg["repository"],
    main: typeof pkg["main"] === "string" ? pkg["main"] : null,
    module: typeof pkg["module"] === "string" ? pkg["module"] : null,
    exports: pkg["exports"],
    bin,
    files,
    scripts,
    dependencies,
    devDependencies,
    private: pkg["private"] === true,
    hasBuildScript: "build" in scripts,
    hasTestScript: "test" in scripts,
    hasPreinstall: "preinstall" in scripts,
    hasPostinstall: "postinstall" in scripts,
    isCliProject: !!bin,
    hasFilesField: files !== null,
  };
}

export function isGenericName(name: string): boolean {
  return GENERIC_NAMES.has(name.toLowerCase());
}
