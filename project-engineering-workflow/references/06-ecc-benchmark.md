# ECC Benchmark Notes

Use this reference when improving the project workflow skill itself, especially development rules, frontend rules, verification, security review, session learning, or cross-harness packaging.

Source reviewed:

- Repository: `https://github.com/affaan-m/ECC`
- Snapshot analyzed: `4130457d674d2180c5af2c5f634f3cae4cbc6c4f`
- Package: `ecc-universal@2.0.0`
- License: MIT

## Assessment

ECC is useful as a benchmark and rule library, but it should not be installed wholesale into this starter.

It is a broad cross-harness operating system for Claude Code, Codex, Cursor, OpenCode, Copilot, and related tools. This project is intentionally narrower: a project-local engineering workflow starter with one top-level authority (`AGENTS.md` plus constitution), scoped skills, specs, review, and verification.

## What To Borrow

Borrow patterns, not topology:

- Common coding rules:
  - KISS, DRY, YAGNI
  - immutable updates by default
  - descriptive naming
  - explicit error handling
  - input validation at boundaries
  - focused files and functions
- Frontend workflow:
  - privacy/data-boundary reminders
  - accessibility, responsive states, loading states, empty states, and error states
  - React component composition, local state ownership, hook hygiene, and performance checks
- Verification:
  - build, typecheck, lint, tests, security scan, and diff review as a staged closeout
  - adapt commands to the target repository instead of hardcoding npm-only commands
- Security:
  - secrets, input validation, SQL injection, authz/authn, XSS, file upload, and dependency boundaries
- Learning:
  - project-scoped evidence
  - confidence/severity style signals
  - promote repeated friction into the smallest useful skill update

## What Not To Borrow By Default

Do not copy these into generated projects by default:

- ECC global `.codex/config.toml`
- broad MCP defaults
- Claude/OpenCode hook runtimes
- installer-managed multi-harness catalogs
- hundreds of domain skills
- global notification/profile settings

Reasons:

- They increase context and startup cost.
- They may conflict with the generated project's own authority files.
- Codex does not have Claude-style hook parity.
- This starter should remain low-threshold and project-local.

## Integration Rules

When using ECC as inspiration:

1. Keep `AGENTS.md` and `.specify/memory/constitution.md` as the only top-level governance sources.
2. Convert ECC patterns into small project-local skills.
3. Keep default generated skills lean.
4. Put long examples in references only when they are genuinely needed.
5. Prefer opt-in security, verification, MCP, and harness extensions.
6. Never add remote services, hooks, or global config without explicit user approval.

## Recommended Local Skill Mapping

| ECC idea | Local destination |
| --- | --- |
| `coding-standards` / `rules/common/coding-style.md` | `project-dev-core` |
| `frontend-patterns` | `project-frontend-standards`, `project-frontend-js`, `project-frontend-react`, `project-frontend-vue`, `project-frontend-css` |
| `verification-loop` | `project-verification-loop`, `project-test-and-report` |
| `security-review` | `project-security-review` |
| `continuous-learning-v2` | `project-session-summary`, `project-skill-upgrade-advisor` |
| `strategic-compact` | Future optional long-session guidance |

## Adoption Decision

Recommended mode: selective absorption.

Do:

- distill rules into project-local skills
- add security and verification skills
- keep session learning evidence-backed
- keep cross-harness support explicit and opt-in

Do not:

- install ECC as a dependency of this starter
- run ECC installer inside generated projects
- replace this starter's workflow with ECC's global operating model
