export interface MarkdownHeading {
  level: number;
  text: string;
  lineNumber: number;
}

export interface MarkdownCodeBlock {
  language: string;
  content: string;
  lineNumber: number;
}

export interface MarkdownImage {
  alt: string;
  src: string;
  lineNumber: number;
}

export interface MarkdownAnalysis {
  headings: MarkdownHeading[];
  codeBlocks: MarkdownCodeBlock[];
  images: MarkdownImage[];
  wordCount: number;
  charCount: number;
  hasH1: boolean;
  h1Text: string | null;
  sectionNames: string[];
  hasBadges: boolean;
  badgeCount: number;
}

export function analyzeMarkdown(content: string): MarkdownAnalysis {
  const lines = content.split("\n");
  const headings: MarkdownHeading[] = [];
  const codeBlocks: MarkdownCodeBlock[] = [];
  const images: MarkdownImage[] = [];

  let inCodeBlock = false;
  let codeBlockLang = "";
  let codeBlockStart = 0;
  let codeBlockContent = "";

  let badgeCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code blocks
    if (/^```/.test(line)) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockLang = line.replace(/^```/, "").trim();
        codeBlockStart = i + 1;
        codeBlockContent = "";
      } else {
        inCodeBlock = false;
        codeBlocks.push({
          language: codeBlockLang,
          content: codeBlockContent,
          lineNumber: codeBlockStart,
        });
        codeBlockContent = "";
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent += line + "\n";
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      headings.push({
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
        lineNumber: i + 1,
      });
    }

    // Images (markdown syntax and HTML img tags)
    const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let imgMatch: RegExpExecArray | null;
    while ((imgMatch = imgRegex.exec(line)) !== null) {
      images.push({
        alt: imgMatch[1],
        src: imgMatch[2],
        lineNumber: i + 1,
      });
    }

    // Badges (shields.io, img.shields.io, badge.fury.io, etc.)
    if (
      /img\.shields\.io/i.test(line) ||
      /badge\.fury\.io/i.test(line) ||
      /badgen\.net/i.test(line) ||
      /shields\.io/i.test(line)
    ) {
      badgeCount++;
    }
  }

  const h1 = headings.find((h) => h.level === 1);
  const sectionNames = headings.map((h) => h.text.toLowerCase());

  // Word count (outside code blocks roughly)
  const textContent = content
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]+`/g, "")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[[^\]]*\]\([^)]+\)/g, "");
  const wordCount = textContent
    .split(/\s+/)
    .filter((w) => w.length > 0).length;

  return {
    headings,
    codeBlocks,
    images,
    wordCount,
    charCount: content.length,
    hasH1: !!h1,
    h1Text: h1?.text ?? null,
    sectionNames,
    hasBadges: badgeCount > 0,
    badgeCount,
  };
}

export function hasSection(analysis: MarkdownAnalysis, ...keywords: string[]): boolean {
  return analysis.sectionNames.some((s) =>
    keywords.some((k) => s.includes(k.toLowerCase()))
  );
}

export function hasEmptySections(content: string): boolean {
  // Check if a heading is immediately followed by another heading
  const lines = content.split("\n").filter((l) => l.trim() !== "");
  for (let i = 0; i < lines.length - 1; i++) {
    if (/^#{1,6}\s+/.test(lines[i]) && /^#{1,6}\s+/.test(lines[i + 1])) {
      return true;
    }
  }
  return false;
}
