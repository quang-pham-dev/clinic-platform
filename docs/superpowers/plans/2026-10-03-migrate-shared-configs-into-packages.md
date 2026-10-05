# Migrate Shared Configs Into Packages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move every repository-level shared config package from `configs/*` into `packages/*` while preserving the existing `@clinic-platform/*-config` import contracts and keeping the monorepo verifiable.

**Architecture:** Treat ESLint, Prettier, TypeScript, and Vitest configurations as first-class internal packages alongside the existing shared packages. Keep package names and subpath exports stable, move only their physical locations, remove `configs/*` from pnpm workspace discovery, and update repository documentation to make `packages/*` the sole shared-package location. Runtime configuration under `apps/cms/config/**` is not part of this migration.

**Tech Stack:** pnpm 10 workspaces, Turborepo 2.8, Node.js >=20, ESLint 9 flat config, Prettier 3, TypeScript 5.9, Vitest 3, JSON package exports.

**Spec:** User request: move all shared config content currently under `configs/` into `packages/*`; architecture constraints in `docs/00-monorepo-strategy.md`, `docs/CROSS_PHASE_DEPENDENCIES.md`, and `docs/00-config-validation.md`.

## Global Constraints

- Preserve the package names `@clinic-platform/eslint-config`, `@clinic-platform/prettier-config`, `@clinic-platform/typescript-config`, and `@clinic-platform/vitest-config`.
- Preserve every currently consumed subpath export, including `base`, `nestjs`, `react-internal-library`, `base.json`, `vite-app.json`, `nextjs-library.json`, `react-library.json`, `nestjs.json`, `node`, and `react`; remove the pre-existing unresolvable `./nextjs.json` declaration because no such file exists.
- Remove `configs/*` from `pnpm-workspace.yaml`; no shared config package remains discoverable outside `packages/*`.
- Do not change application runtime configuration such as `apps/cms/config/**` or domain behavior.
- Preserve the current formatting, linting, TypeScript strictness, Vitest environment, and coverage threshold behavior unless a migration defect requires a minimal compatibility fix.
- Do not commit generated `dist/`, `.turbo/`, `.next/`, or other build artifacts.

## Review Focus

- Package resolution after relocation: all existing workspace imports and TypeScript `extends` paths still resolve from `packages/*`.
- Export compatibility: JSON and JavaScript/TypeScript subpath exports resolve under Node/ pnpm without relying on the old `configs/` path.
- Workspace graph correctness: pnpm discovers exactly one package for each shared config name and the lockfile has no stale importer path for `configs/*`.
- Vitest source ambiguity: the duplicate `configs/vitest-config/index.js` and `index.ts` must not produce divergent behavior; the exported TypeScript source remains the single source of truth.
- Documentation drift: repository layout, package lists, and config-package instructions no longer tell contributors to create or use `configs/`.

## Current-State Findings

- `configs/` contains four tracked workspace packages and 23 tracked files; `packages/` contains the application/library packages and 142 tracked files.
- Root `package.json` and all current consumers already use the stable `@clinic-platform/*-config` package names, so no import rename is expected.
- `pnpm-workspace.yaml` currently includes both `packages/*` and `configs/*`; this is the workspace-discovery change that must be made after relocation.
- `configs/vitest-config/index.js` duplicates `index.ts` but is not the package export used by current consumers; the migration should retain one canonical implementation.
- Config README examples are partly stale (`react.js`/`react` does not match the actual `react-internal-library` export); documentation cleanup belongs in the migration rather than preserving the stale example.
- Baseline verification on 2026-10-03: `pnpm check-types` passed 14/14 tasks and `pnpm lint` passed 15/15 tasks. Both runs used Turbo cache hits, so the final migration gate must include fresh package-resolution checks and uncached/forced validation where practical.

## File Structure Map

### Create/move into `packages/`

- Move `configs/eslint-config/**` to `packages/eslint-config/**`; preserve `base.js`, `nestjs.js`, `next-internal-library.js`, `react-internal-library.js`, package exports, and dependencies.
- Move `configs/prettier-config/**` to `packages/prettier-config/**`; preserve `base.js`, package exports, plugin dependency, and peer dependency on Prettier.
- Move `configs/typescript-config/**` to `packages/typescript-config/**`; preserve the five actual JSON presets, package exports that resolve to files, and README, excluding generated `dist/**`.
- Move `configs/vitest-config/**` to `packages/vitest-config/**`; preserve `index.ts`, `node.ts`, and `react.ts`, package exports, and testing dependencies; remove the duplicate unused `index.js`.

### Modify consumers and workspace metadata

- Modify: `pnpm-workspace.yaml` to remove `configs/*`.
- Modify: `pnpm-lock.yaml` through the package-manager lockfile update after relocation.
- Inspect/modify only if required: root `package.json`, app/package manifests, and config consumers; package names should remain unchanged.
- Modify: `docs/00-monorepo-strategy.md`, including the workspace tree and shared-config package sections.
- Modify: `AGENTS.md`, `CLAUDE.md`, `RULES.md`, and any directly affected README/package documentation to describe `packages/*` as the location for shared configs.

### Explicitly out of scope

- `apps/cms/config/**`: application runtime configuration, not a shared workspace config package.
- `packages/design-system/**` and app-local `postcss.config.*`, `next.config.*`, `vite.config.*`: remain local unless a later task discovers an actual dependency on `configs/`.
- Business code, API behavior, environment validation semantics, and deployment configuration.

---

### Task 1: Capture migration contracts and clean the config package source set

**Files:**

- Inspect: `configs/eslint-config/package.json`, `configs/prettier-config/package.json`, `configs/typescript-config/package.json`, `configs/vitest-config/package.json`
- Inspect: all config source files and package READMEs

**Interfaces:**

- Consumes: current package names, exports, consumer imports, and baseline commands listed above.
- Produces: an explicit compatibility matrix for the four packages and a canonical Vitest source entry.

- [ ] **Step 1: Enumerate current exports and consumers**

  Record each package's `name`, `type`, `exports`, dependency class, and every import/`extends` consumer found by `rg`. Confirm that the target package name remains unchanged.

- [ ] **Step 2: Decide the Vitest duplicate-file outcome**

  Keep `index.ts` as the canonical exported source because `package.json` already exports `./index.ts`, `./node.ts`, and `./react.ts`. Do not copy `index.js` into the target package.

- [ ] **Step 3: Define smoke assertions**

  Record the exact checks that Task 5 will run: resolve the four package manifests from the root, load ESLint `base`, load Prettier `base`, parse TypeScript `base.json`, and load Vitest `node`/`react`. No new production test harness is needed for this file-only relocation.

- [ ] **Step 4: Commit**

  Do not commit this inventory-only step; carry the contract into the relocation change.

### Task 2: Relocate the four shared config packages into `packages/`

**Files:**

- Move: `configs/eslint-config/**` → `packages/eslint-config/**`
- Move: `configs/prettier-config/**` → `packages/prettier-config/**`
- Move: `configs/typescript-config/**` → `packages/typescript-config/**`
- Move: `configs/vitest-config/index.ts`, `node.ts`, `react.ts`, `package.json`, `README.md` → `packages/vitest-config/**`
- Do not move: generated `configs/typescript-config/dist/**` or duplicate `configs/vitest-config/index.js`

**Interfaces:**

- Consumes: Task 1 compatibility matrix.
- Produces: four packages discoverable under `packages/*` with the same package names and exports.

- [ ] **Step 1: Move tracked source and metadata with history-preserving renames**

  Use `git mv` for each package directory. Before staging, verify that no generated output or duplicate Vitest JavaScript source was introduced.

- [ ] **Step 2: Preserve and validate package metadata**

  Keep package names and export keys unchanged. Ensure relative JSON `extends` values inside `packages/typescript-config/*.json` still point to sibling files and all config package dependencies remain declared in the moved manifest.

- [ ] **Step 3: Correct only migration-relevant README drift**

  Update examples to use the actual exports (`react-internal-library`, not nonexistent `react.js`/`react`) and remove references to configs that are not present. Do not expand the package API as part of this move.

- [ ] **Step 4: Verify the old shared-config tree is empty**

  Run `find configs -type f -not -path '*/dist/*' -print` and expect no shared config source or package manifest to remain. The `configs/` directory may be removed if empty.

- [ ] **Step 5: Commit**

  ```bash
  git add packages/eslint-config packages/prettier-config packages/typescript-config packages/vitest-config configs
  git commit -m "refactor(workspace): move shared configs into packages"
  ```

### Task 3: Update workspace discovery and lockfile without changing public package names

**Files:**

- Modify: `pnpm-workspace.yaml`
- Modify: `pnpm-lock.yaml`
- Inspect/modify if generated metadata requires it: root `package.json`

**Interfaces:**

- Consumes: relocated package manifests from Task 2.
- Produces: a workspace graph where each shared config is found only at `packages/<config-name>`.

- [ ] **Step 1: Remove the obsolete workspace glob**

  Delete only `- configs/*` from `pnpm-workspace.yaml`; retain `apps/*`, `packages/*`, and `tools/*`.

- [ ] **Step 2: Regenerate workspace metadata**

  Run `pnpm install --lockfile-only` and inspect the diff. Expected result: importer paths and package locations reflect `packages/eslint-config`, `packages/prettier-config`, `packages/typescript-config`, and `packages/vitest-config`, with no stale `configs/*` workspace importer.

- [ ] **Step 3: Confirm unique workspace package discovery**

  Run `pnpm list --depth -1 --filter '@clinic-platform/*-config'` (or the repository-equivalent filtered list) and verify exactly four shared config packages are present, each backed by `packages/`.

- [ ] **Step 4: Commit**

  ```bash
  git add pnpm-workspace.yaml pnpm-lock.yaml package.json
  git commit -m "build(workspace): discover shared configs from packages"
  ```

### Task 4: Update repository documentation and contributor guidance

**Files:**

- Modify: `docs/00-monorepo-strategy.md`
- Modify: `AGENTS.md`
- Modify: `CLAUDE.md`
- Modify: `RULES.md`
- Modify: config package READMEs and any directly affected root README text found by `rg`

**Interfaces:**

- Consumes: final directory layout and package exports from Tasks 2–3.
- Produces: documentation that has one authoritative location for shared packages and no stale `configs/` instructions.

- [ ] **Step 1: Update the architecture tree and package sections**

  Replace the shared `configs/` branch in `docs/00-monorepo-strategy.md` with the four config packages under `packages/`; preserve the distinction between runtime app config and reusable workspace packages.

- [ ] **Step 2: Update agent and contributor references**

  Change `AGENTS.md`, `CLAUDE.md`, and `RULES.md` only where they describe shared config location or workspace membership. Keep the existing commands, style rules, and app layout intact.

- [ ] **Step 3: Search for stale paths**

  Run `rg -n --glob '!**/node_modules/**' --glob '!**/dist/**' 'configs/(eslint|prettier|typescript|vitest)|configs/ - Shared|configs/.*Shared' .` and resolve every repository-documentation hit. Do not rewrite `apps/cms/config/**` references.

- [ ] **Step 4: Commit**

  ```bash
  git add AGENTS.md CLAUDE.md RULES.md docs README.md packages/*/README.md
  git commit -m "docs(monorepo): document shared configs under packages"
  ```

### Task 5: Verify package resolution, consumers, and full workspace gates

**Files:**

- Test/inspect: moved config packages, all app/package config consumers, `pnpm-workspace.yaml`, `pnpm-lock.yaml`

**Interfaces:**

- Consumes: completed relocation, workspace graph, and documentation from Tasks 2–4.
- Produces: evidence that the migration is behavior-preserving and that no consumer still depends on the old physical path.

- [ ] **Step 1: Run direct package-resolution smoke checks**

  Resolve package manifests and representative exports from the repository root. Expected: all four package names resolve from `packages/*`; ESLint/Prettier exports load; TypeScript JSON presets are readable; Vitest `node` and `react` modules load without referencing `configs/`.

- [ ] **Step 2: Run fresh type and lint verification**

  ```bash
  pnpm turbo run check-types lint --force
  ```

  Expected: all discovered apps/packages pass, including the four moved config packages where scripts exist; no module-not-found or invalid `extends` errors.

- [ ] **Step 3: Run formatting and relevant tests**

  ```bash
  pnpm format
  pnpm test
  ```

  Expected: formatting check passes and the existing Vitest suites pass. If the full test command is unavailable for a package with no test script, record that as a package-script gap rather than masking it.

- [ ] **Step 4: Verify workspace and stale-path invariants**

  Confirm all of the following:

  ```text
  - no tracked shared config file remains under configs/
  - pnpm-workspace.yaml has no configs/* entry
  - no consumer imports a physical configs/ path
  - package names remain @clinic-platform/*-config
  - apps/cms/config/** remains untouched
  ```

- [ ] **Step 5: Review the final diff and report gates**

  Run `git diff --check`, `git status --short`, and `git diff --stat`. Report passed, failed, and blocked gates separately; do not claim deployment or runtime production readiness from this repository-only migration.

## Final Acceptance Criteria

- All four shared config packages live under `packages/` and are removed from `configs/`.
- Existing consumers continue using the same package names and supported subpath exports.
- pnpm workspace discovery contains no `configs/*` glob and the lockfile has no stale config-package importer location.
- Documentation consistently describes shared configs as packages.
- Direct resolution, forced typecheck/lint, formatting, tests, and stale-path checks pass.
- No runtime application config or business behavior is changed.
