export interface SecretMatch {
  pattern: string;
  line: number;
  snippet: string;
}

// Common secret patterns
const SECRET_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: "AWS Access Key", regex: /AKIA[0-9A-Z]{16}/g },
  { name: "AWS Secret Key", regex: /aws_secret_access_key\s*=\s*[A-Za-z0-9/+=]{40}/gi },
  { name: "GitHub Token", regex: /gh[ps]_[A-Za-z0-9]{36,}/g },
  { name: "Generic API Key", regex: /api[_-]?key\s*[:=]\s*["']?[A-Za-z0-9_\-]{20,}["']?/gi },
  { name: "Generic Secret", regex: /secret[_-]?key\s*[:=]\s*["']?[A-Za-z0-9_\-]{16,}["']?/gi },
  { name: "Bearer Token", regex: /bearer\s+[A-Za-z0-9\-._~+/]+=*/gi },
  { name: "Private RSA Key", regex: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  { name: "Password in Code", regex: /password\s*[:=]\s*["'][^"']{6,}["']/gi },
  { name: "Database URL", regex: /(postgresql|mysql|mongodb|redis):\/\/[^:]+:[^@]+@/gi },
  { name: "Stripe Key", regex: /sk_(live|test)_[A-Za-z0-9]{24,}/g },
  { name: "Slack Token", regex: /xox[baprs]-[A-Za-z0-9\-]{10,}/g },
  { name: "Sendgrid Key", regex: /SG\.[A-Za-z0-9\-._]{22,}\.[A-Za-z0-9\-._]{43,}/g },
  { name: "OpenAI Key", regex: /sk-[A-Za-z0-9]{48,}/g },
  { name: "Anthropic Key", regex: /sk-ant-[A-Za-z0-9\-]{40,}/g },
  { name: "Google API Key", regex: /AIza[0-9A-Za-z\-_]{35}/g },
  { name: "Hardcoded Token", regex: /token\s*[:=]\s*["'][A-Za-z0-9_\-]{16,}["']/gi },
];

// Returns true if the line is a regex pattern definition rather than code with a real secret.
// Catches lines like: { name: "Foo", regex: /PATTERN/flags }
// These appear in scanner source files and should never be flagged.
function isRegexDefinitionLine(line: string): boolean {
  return /\bregex\s*:\s*\/[^/]/.test(line);
}

// Returns true if the snippet looks like an obvious placeholder or test fixture value.
// The intent is to suppress well-known synthetic examples (e.g., sk-1234..., AKIAIOSFODNN7EXAMPLE)
// while still flagging realistic-looking secrets.
function isObviousPlaceholder(snippet: string): boolean {
  return /sk-1234|AKIA[0-9A-Z]{0,4}\[|ghp_\[|your[_-]?(?:api[_-]?)?key|replace[_-]?(?:with|me)|fake[_\-]?(?:key|token|secret)|test[_\-]?(?:key|token|secret)|dummy[_\-]?(?:key|token)|example[_\-]?(?:key|token)|placeholder/i.test(snippet);
}

export function detectSecrets(content: string): SecretMatch[] {
  const matches: SecretMatch[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip regex pattern definition lines (scanner source code, not real secrets)
    if (isRegexDefinitionLine(line)) continue;

    for (const { name, regex } of SECRET_PATTERNS) {
      regex.lastIndex = 0;
      if (regex.test(line)) {
        const snippet = line.trim().substring(0, 80);
        // Skip obvious placeholder/test-fixture values
        if (!isObviousPlaceholder(snippet)) {
          matches.push({
            pattern: name,
            line: i + 1,
            snippet,
          });
        }
        break; // one finding per line
      }
    }
  }

  return matches;
}

export function hasCurlBashPattern(content: string): boolean {
  return /curl\s+.*\|.*bash/i.test(content) || /curl\s+.*\|\s*sh/i.test(content);
}

export function hasPrivateKey(content: string): boolean {
  return /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(content);
}
