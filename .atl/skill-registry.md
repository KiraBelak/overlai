# Skill Registry — overlai

Generated: 2026-06-20 (updated after Phase 0 scaffold)
Source scans: `~/.claude/skills/` (user-level); no project-level skills found.
Excludes: `sdd-*` phases, `_shared`, `skill-registry` (infrastructure skills).

---

## Skills Index

| Name | Trigger / Description | Scope | Path |
|------|-----------------------|-------|------|
| branch-pr | Create pull requests with issue-first checks. Trigger: creating, opening, or preparing PRs for review. | user | `~/.claude/skills/branch-pr/SKILL.md` |
| chained-pr | Split oversized changes into chained PRs. Trigger: PRs over 400 lines, stacked PRs, review slices. | user | `~/.claude/skills/chained-pr/SKILL.md` |
| work-unit-commits | Plan commits as reviewable work units. Trigger: implementation, commit splitting, chained PRs, keeping tests and docs with code. | user | `~/.claude/skills/work-unit-commits/SKILL.md` |
| comment-writer | Write warm, direct collaboration comments. Trigger: PR feedback, issue replies, reviews, Slack messages, or GitHub comments. | user | `~/.claude/skills/comment-writer/SKILL.md` |
| cognitive-doc-design | Design docs that reduce cognitive load. Trigger: writing guides, READMEs, RFCs, onboarding, architecture, or review-facing docs. | user | `~/.claude/skills/cognitive-doc-design/SKILL.md` |
| issue-creation | Create GitHub issues with issue-first checks. Trigger: creating GitHub issues, bug reports, or feature requests. | user | `~/.claude/skills/issue-creation/SKILL.md` |
| judgment-day | Run blind dual review, fix confirmed issues, then re-judge. Trigger: judgment day, dual review, adversarial review. | user | `~/.claude/skills/judgment-day/SKILL.md` |
| skill-creator | Create LLM-first skills with valid frontmatter. Trigger: new skills, agent instructions, documenting AI usage patterns. | user | `~/.claude/skills/skill-creator/SKILL.md` |
| skill-improver | Audit and upgrade existing LLM-first skills. Trigger: improve skills, audit skills, refactor skills, skill quality. | user | `~/.claude/skills/skill-improver/SKILL.md` |

> `go-testing` is excluded from this registry: it is Go-specific and this project uses TypeScript/React/Next.js.

---

## Convention Files Scanned

| File | Found | Notes |
|------|-------|-------|
| `~/.claude/CLAUDE.md` | Yes | Global persona, rules, Engram protocol |
| `overlai/PLAN.md` | Yes | Product vision, tech stack, architecture, MVP scope, build phases |
| `overlai/backend/AGENTS.md` | Yes | Next.js 16 breaking-changes warning — agents must read node_modules/next/dist/docs/ before writing backend code |
| `overlai/backend/CLAUDE.md` | Yes | References AGENTS.md (same content via @-include) |
| `overlai/AGENTS.md` | No | Not present at repo root |
| `overlai/.cursorrules` | No | Not present |

---

## Skill Matching Notes

- **branch-pr** + **chained-pr**: Both apply to `sdd-apply` phase. Hackathon implementation will likely exceed 400-line budget per phase; stacked PRs recommended.
- **work-unit-commits**: Apply at `sdd-apply` and `sdd-tasks` — each PLAN.md build phase (Phase 1–4) is a natural work unit boundary.
- **cognitive-doc-design**: Apply when writing README with demo GIF (Phase 4).
- **judgment-day**: Available for adversarial review on any critical PR before submission.

## Phase 0 Status

Both workspaces are scaffolded and verified buildable:
- `extension/`: Vite 8 + CRXJS 2.7, React 19, TypeScript 6, Tailwind 4, Framer Motion 12, Zod 4, ESLint 10
- `backend/`: Next.js 16 App Router, TypeScript 5 (strict), Zod 4, ESLint 9 + eslint-config-next

**No test runner installed in either workspace.** Vitest is planned for Phase 1.
