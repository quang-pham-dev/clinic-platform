# Release Process

This repo uses Changesets for versioning and publishing.

## Prerequisites

- You have publish access for the npm scope.
- `NPM_TOKEN` is configured in CI (if publishing from GitHub Actions).

## Steps

1. Add a changeset:

```bash
pnpm changeset
```

2. Version packages:

```bash
pnpm version-packages
```

3. Commit the changeset + version bump.

4. Publish (after build):

```bash
pnpm release
```

## Notes

- Changesets generates CHANGELOG entries per package.
- You can use prerelease mode for canary releases.
