<p align="center">
  <img src="https://avatars.githubusercontent.com/u/95747107" width="100" alt="Vitest Logo" style="border-radius: 20%;" />
</p>

<h1 align="center">⚡ Clinic Platform Vitest Config</h1>

<p align="center">
  <strong>Shared Vitest configuration for the Clinic Platform monorepo</strong>
</p>

<p align="center">
  <a href="#"><img src="https://img.shields.io/badge/Vitest-3.x-6E9F18?logo=vitest&logoColor=white" alt="Vitest" /></a>
  <a href="#"><img src="https://img.shields.io/badge/pnpm-10.x-F69220?logo=pnpm&logoColor=white" alt="pnpm" /></a>
</p>

---

## Overview

Centralized testing setup and configuration for Vitest. Used across all modules to ensure tests run consistently and quickly. Includes configurations for pure Node environments and React testing (jsdom).

## Installation

```bash
pnpm add -D @clinic-platform/vitest-config vitest
```

## Usage

### Node.js Backend or Packages

Create `vitest.config.ts` in the package root:

```typescript
import { defineProject } from 'vitest/config';
import nodeConfig from '@clinic-platform/vitest-config/node';

export default defineProject({
  ...nodeConfig,
  // Add project-specific overrides here
});
```

### React Frontend Apps

Create `vitest.config.ts` in the package root:

```typescript
import { defineProject } from 'vitest/config';
import reactConfig from '@clinic-platform/vitest-config/react';

export default defineProject({
  ...reactConfig,
  // Add project-specific overrides here
});
```

## Best Practices
- Write co-located `.spec.ts` files alongside implementation files.
- Avoid using `jest` globals; Vitest provides native replacements or allows auto-importing.
- Run `pnpm test:coverage` to ensure code coverage meets standards before pushing.
