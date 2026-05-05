# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2024-11-01

### Added
- Initial release
- `audit` command with terminal, JSON, and Markdown reporters
- 7 audit categories: README, Package Readiness, Open Source Hygiene, Security & Privacy, Demo & Visuals, Social Launch, AI Red Flags
- `init-launch-docs` command to scaffold launch post templates
- Secret detection (API keys, tokens, private keys)
- Local path detection (/Users/..., C:\Users\...)
- Hidden Unicode character detection
- AI placeholder detection (TODO, Lorem ipsum, fake badges)
- Fixture projects for testing
- `--json`, `--markdown`, `--output`, `--no-fail`, `--path` flags
