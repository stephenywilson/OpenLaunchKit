export interface LocalPathMatch {
  path: string;
  line: number;
}

// Patterns for local filesystem paths.
// Each regex requires the segment after the prefix to START with a letter so
// that documentation examples like "/Users/..." or "/Users/<name>" don't match.
const LOCAL_PATH_PATTERNS: RegExp[] = [
  /\/Users\/[A-Za-z][A-Za-z0-9._-]*/g,
  /\/home\/[A-Za-z][A-Za-z0-9._-]*/g,
  /C:\\Users\\[A-Za-z][A-Za-z0-9._-]*/g,
  /C:\/Users\/[A-Za-z][A-Za-z0-9._-]*/g,
  /\/root\/[A-Za-z][A-Za-z0-9._-]*/g,
  /\/var\/folders\/[A-Za-z][A-Za-z0-9._-]*/g,
];

export function detectLocalPaths(content: string): LocalPathMatch[] {
  const matches: LocalPathMatch[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const pattern of LOCAL_PATH_PATTERNS) {
      pattern.lastIndex = 0;
      const match = pattern.exec(line);
      if (match) {
        matches.push({
          path: match[0],
          line: i + 1,
        });
        break; // one finding per line
      }
    }
  }

  return matches;
}
