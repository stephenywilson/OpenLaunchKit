export interface UnicodeMatch {
  character: string;
  codePoint: string;
  description: string;
  line: number;
  column: number;
}

// Hidden / suspicious Unicode characters
const SUSPICIOUS_CHARS: Array<{ codePoint: number; description: string }> = [
  { codePoint: 0x200b, description: "Zero Width Space" },
  { codePoint: 0x200c, description: "Zero Width Non-Joiner" },
  { codePoint: 0x200d, description: "Zero Width Joiner" },
  { codePoint: 0x200e, description: "Left-to-Right Mark" },
  { codePoint: 0x200f, description: "Right-to-Left Mark" },
  { codePoint: 0xfeff, description: "Zero Width No-Break Space (BOM)" },
  { codePoint: 0x00ad, description: "Soft Hyphen" },
  { codePoint: 0x2060, description: "Word Joiner" },
  { codePoint: 0x2061, description: "Function Application" },
  { codePoint: 0x2062, description: "Invisible Times" },
  { codePoint: 0x2063, description: "Invisible Separator" },
  { codePoint: 0x2064, description: "Invisible Plus" },
  { codePoint: 0x202a, description: "Left-to-Right Embedding" },
  { codePoint: 0x202b, description: "Right-to-Left Embedding" },
  { codePoint: 0x202c, description: "Pop Directional Formatting" },
  { codePoint: 0x202d, description: "Left-to-Right Override" },
  { codePoint: 0x202e, description: "Right-to-Left Override" },
  { codePoint: 0x2066, description: "Left-to-Right Isolate" },
  { codePoint: 0x2067, description: "Right-to-Left Isolate" },
  { codePoint: 0x2068, description: "First Strong Isolate" },
  { codePoint: 0x2069, description: "Pop Directional Isolate" },
];

const SUSPICIOUS_SET = new Map(
  SUSPICIOUS_CHARS.map((c) => [c.codePoint, c.description])
);

export function detectHiddenUnicode(content: string): UnicodeMatch[] {
  const matches: UnicodeMatch[] = [];
  const lines = content.split("\n");

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    for (let colIdx = 0; colIdx < line.length; colIdx++) {
      const cp = line.codePointAt(colIdx);
      if (cp !== undefined && SUSPICIOUS_SET.has(cp)) {
        matches.push({
          character: String.fromCodePoint(cp),
          codePoint: `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`,
          description: SUSPICIOUS_SET.get(cp) ?? "Unknown",
          line: lineIdx + 1,
          column: colIdx + 1,
        });
      }
    }
  }

  return matches;
}
