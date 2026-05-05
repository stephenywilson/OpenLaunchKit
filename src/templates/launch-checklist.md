# Pre-Launch Checklist

Use this checklist before sharing your project publicly.

---

## README Quality

- [ ] README has a clear H1 title
- [ ] A one-line tagline exists right below the title
- [ ] Quick Start / Getting Started section present
- [ ] Install command is clear (npm install / npx / pip install)
- [ ] At least one usage example with a code block
- [ ] Screenshot or demo GIF/SVG included
- [ ] Features section with bullet points
- [ ] Limitations section (be honest)
- [ ] Roadmap section (show it's alive)
- [ ] License section at the bottom

## Package Readiness

- [ ] package.json has a unique, descriptive name
- [ ] version is set (e.g., 0.1.0)
- [ ] description is clear and under 150 chars
- [ ] bin field set (for CLI tools)
- [ ] files field limits what gets published
- [ ] repository field points to GitHub
- [ ] keywords list has 5+ relevant terms
- [ ] build script exists and runs clean
- [ ] `npm pack --dry-run` shows only expected files

## Open Source Hygiene

- [ ] LICENSE file present (MIT, Apache-2.0, etc.)
- [ ] CHANGELOG.md initialized (even if just v0.1.0)
- [ ] CONTRIBUTING.md with setup instructions
- [ ] SECURITY.md with vulnerability reporting process
- [ ] .gitignore covers node_modules, dist, .env, *.key
- [ ] GitHub Actions CI workflow passes on main
- [ ] Tests exist and pass

## Security

- [ ] No .env files in repository
- [ ] No API keys, tokens, or passwords in any files
- [ ] No local paths (/Users/you/...) in docs
- [ ] No private key files (.pem, .key)
- [ ] .env and .env.* added to .gitignore

## Demo & Visuals

- [ ] Screenshot or GIF shows the tool in action
- [ ] Example output code block in README
- [ ] assets/ or docs/images/ folder organized

## Social Launch

- [ ] docs/launch/x-post.md draft ready
- [ ] docs/launch/hn-post.md draft ready
- [ ] Tagline is under 280 characters (tweet-ready)

## Final Checks

- [ ] `npx openlaunchkit audit` score >= 70
- [ ] `npm run build` succeeds
- [ ] `npm test` passes
- [ ] `npm pack --dry-run` shows correct files
- [ ] GitHub repository is public
- [ ] Repository description and website URL set on GitHub
- [ ] Topics/tags added on GitHub

---

When all boxes are checked, you're ready to launch!
