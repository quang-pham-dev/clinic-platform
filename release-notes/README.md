# Healthcare Clinic Platform Release Notes

> **Scope:** Human-readable summaries of product, platform, and operational
> changes
> **Audience:** maintainers, QA, product stakeholders, and deployment operators

---

## Purpose

The `release-notes/` directory documents what changed between releases and why
those changes matter. Release notes should help readers understand user impact,
operational risk, migration steps, and verification status without reading every
commit or pull request.

Release notes are not a replacement for commit history. They are a curated
summary of meaningful changes.

---

## Recommended Structure

Use one file per released version:

```text
release-notes/
├── README.md
├── v0.1.0.md
├── v0.2.0.md
└── v1.0.0.md
```

For unreleased work, use a draft file when needed:

```text
release-notes/
└── unreleased.md
```

When the release is cut, rename or copy the final draft to the versioned file and
clear the draft for the next cycle.

---

## File Naming

- Stable releases: `vMAJOR.MINOR.PATCH.md`
- Pre-releases: `vMAJOR.MINOR.PATCH-alpha.N.md`, `vMAJOR.MINOR.PATCH-beta.N.md`,
  or `vMAJOR.MINOR.PATCH-rc.N.md`
- Draft release notes: `unreleased.md`

Examples:

```text
v0.1.0.md
v0.2.0-beta.1.md
v1.0.0-rc.1.md
unreleased.md
```

---

## Release Note Template

```markdown
# v0.1.0 - 2026-05-14

## Summary

Short paragraph describing the release theme and primary outcome.

## Highlights

- Added patient appointment booking workflow.
- Added admin booking management view.
- Improved authentication error handling.

## Changes

### Added

- New user-facing capabilities.

### Changed

- Behavior changes, UX updates, refactors with user or operator impact.

### Fixed

- Bugs and regressions resolved in this release.

### Deprecated

- Features, APIs, or configuration that will be removed later.

### Removed

- Features, APIs, or configuration removed in this release.

### Security

- Security fixes, dependency updates with security impact, and permission changes.

## Migration Notes

- Required database migrations, environment variable changes, data backfills, or
  operational steps.

## Verification

- `pnpm lint`
- `pnpm check-types`
- `pnpm test`
- Relevant E2E or smoke tests

## Known Issues

- Known limitations, temporary workarounds, or follow-up tasks.
```

Use only the sections that apply. If a section has no meaningful content, omit it
from the release note.

---

## What To Include

Include changes that affect users, maintainers, operators, or integrators:

- New features and workflow changes
- Bug fixes with visible behavior change
- Security fixes and permission changes
- API contract changes
- Database migrations and data backfills
- Environment variable changes
- Infrastructure, CI/CD, logging, monitoring, or deployment changes
- Dependency upgrades with compatibility or security impact
- Breaking changes and required migration steps

---

## What To Exclude

Do not include routine implementation details unless they affect behavior or
operations:

- Internal refactors with no external impact
- Formatting-only changes
- Test-only changes that do not document a fixed bug or release risk
- Dependency bumps with no behavior, compatibility, or security impact
- Commit-by-commit summaries

---

## Writing Style

- Write for humans first, not for git history.
- Use past tense for completed releases.
- Use short, specific bullets.
- Start bullets with a verb when possible.
- Explain impact, not just the code change.
- Mention the affected app, package, or workflow when helpful.
- Link to pull requests, issues, ADRs, or documentation when they clarify context.

Good examples:

```markdown
- Added patient appointment rescheduling with slot availability validation.
- Fixed staff users being able to view admin-only billing settings.
- Changed booking confirmation emails to include clinic timezone information.
```

Avoid vague entries:

```markdown
- Updated code.
- Fixed bugs.
- Improved UI.
```

---

## Versioning Guidance

Use semantic versioning once the platform has public or deployment-facing release
contracts:

- `MAJOR`: breaking API, data, deployment, or workflow changes
- `MINOR`: backward-compatible features or substantial enhancements
- `PATCH`: backward-compatible bug fixes, security fixes, and maintenance updates

Before `v1.0.0`, minor versions may still introduce larger changes. Document any
breaking behavior clearly in `Migration Notes`.

---

## Release Workflow

1. During development, add notable changes to `release-notes/unreleased.md` or
   the target version draft.
2. Before release, review merged pull requests and remove entries that are too
   low-level or duplicated.
3. Confirm migration notes, environment changes, and known issues with the
   relevant owner.
4. Run the release verification commands and record the results.
5. Create or update the final `vMAJOR.MINOR.PATCH.md` file.
6. Tag the release and publish the notes with the deployment or GitHub release.

---

## Pull Request Checklist

Add or update release notes when a pull request includes:

- User-facing behavior changes
- API or schema changes
- Auth, RBAC, tenant, billing, or security changes
- Deployment, environment, or migration requirements
- Bug fixes that QA or support should know about
- Known limitations that should be communicated before release

If no release note is needed, the pull request should state why.
