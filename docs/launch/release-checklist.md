# OpenLaunchKit v0.1.0 — Release Checklist

Run through this list in order before `npm publish`.

---

## 1. npm Authentication

```bash
npm login
npm whoami          # confirm you are logged in as the right user
npm view openlaunchkit 2>&1   # check if the name is already taken
```

---

## 2. Code Quality

```bash
npm run typecheck   # must pass with 0 errors
npm run build       # must succeed, dist/ must be populated
npm test            # all tests must pass
```

---

## 3. Smoke Tests

```bash
npm run smoke              # CLI smoke tests against dist/
npm run release-smoke      # full pack → install → run cycle in a temp dir
```

---

## 4. Pack Verification

```bash
npm pack --dry-run         # review file list and total size
npm pack                   # create the actual .tgz (release-smoke does this too)
```

Check that the pack contains only:
- `dist/`
- `README.md`
- `LICENSE`
- `CHANGELOG.md`

Confirm no source files, test files, fixtures, or scripts are included.

---

## 5. Self-Audit

```bash
node dist/cli.js audit --path .
```

Verify:
- No embarrassing false positives from the scanner source code itself
- Score is reasonable (the project should be Launch Ready or close)
- Output looks clean in a terminal

Also run against fixtures to confirm scoring is stable:

```bash
node dist/cli.js audit --path fixtures/good-project
node dist/cli.js audit --path fixtures/weak-readme-project --no-fail
node dist/cli.js audit --json --path fixtures/good-project
node dist/cli.js audit --markdown --path fixtures/good-project
```

---

## 6. Git Tag

```bash
git add -A
git commit -m "chore: prepare v0.1.0 release"
git tag v0.1.0
git push origin main --tags
```

---

## 7. GitHub Release

- Create a GitHub Release for tag `v0.1.0`
- Title: `v0.1.0 — Initial Release`
- Body: paste from CHANGELOG.md
- Attach nothing (npm handles distribution)

---

## 8. Publish

```bash
npm publish --access public
```

Verify:

```bash
npm view openlaunchkit
npx openlaunchkit version   # confirm it works from the registry
```

---

## 9. Post-Publish

- [ ] Post on X using `docs/launch/x-post.md`
- [ ] Post on Hacker News using `docs/launch/hn-post.md`
- [ ] Update README npm version badge (auto-updates via shields.io)
- [ ] Monitor npm download count in the first 24 hours

---

## Known Limitations at v0.1.0

- Secret detection may have false positives on unusual variable naming
- Does not check GitHub repo settings (topics, website URL) — planned for v0.2.0
- Does not verify that image URLs in README resolve — static analysis only
- npm name availability not checked automatically — verified manually above
