# X (Twitter) Launch Copy — OpenLaunchKit

Three versions for different audiences and formats.

---

## Short Version (under 280 characters)

```
I built OpenLaunchKit — a CLI that audits AI-generated repos before launch.

Checks README, npm readiness, security basics, screenshots, and launch docs.
Local. No AI API. No telemetry.

npx openlaunchkit audit

github.com/[your-handle]/openlaunchkit
```

---

## Standard X Premium Version (long-form thread or single post)

```
I built this because AI makes it easy to generate repos, but hard to know
whether they're actually ready to launch.

Introducing OpenLaunchKit — a local, deterministic launch readiness auditor
for AI-built GitHub projects.

Run one command before you post on Hacker News:

  npx openlaunchkit audit

It checks:
• README quality (title, tagline, Quick Start, code examples)
• npm / package readiness (name, keywords, bin, files, lockfile)
• Open source hygiene (LICENSE, CHANGELOG, CONTRIBUTING, SECURITY, CI)
• Security & privacy basics (no .env committed, no leaked paths, no tokens)
• Demo readiness (screenshots, GIFs, terminal output)
• Social launch prep (X/HN/Reddit drafts in docs/launch/)

No AI API. No telemetry. Runs fully locally.

Scores your repo 0–100. Exit code 1 if it's not ready.

github.com/[your-handle]/openlaunchkit
```

---

## Founder / Developer Personal Account Version

```
I kept shipping AI-generated repos that looked fine to me but had obvious
tells: unfilled README sections, local machine paths in docs,
no LICENSE, no screenshot, no actual launch copy.

So I built OpenLaunchKit.

One command. Runs locally. Scores your project across 7 categories.
Tells you exactly what to fix before you post.

  npx openlaunchkit audit

No AI API required. No external services. Just static analysis on your files.

If you use Cursor, Copilot, or Claude to build things, you probably want this
as your last step before hitting "publish."

github.com/[your-handle]/openlaunchkit

What would you add to the audit? Replies open.
```

---

## Tips

- Post with the SVG preview image (`docs/images/openlaunchkit-report.svg`) for better engagement
- Tag relevant communities: `#buildinpublic`, `#opensource`, `#devtools`, `#ai`
- The founder version works best from a personal account with an existing audience
- For the thread format, split the standard version at each bullet section
- Replace `[your-handle]` with your actual GitHub username before posting
