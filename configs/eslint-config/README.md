<p align="center">
  <img src="https://avatars.githubusercontent.com/u/6019716" width="100" alt="ESLint Logo" style="border-radius: 20%;" />
</p>

<h1 align="center">⚙️ Clinic Platform ESLint Config</h1>

<p align="center">
  <strong>Shared ESLint configuration for the Clinic Platform monorepo</strong>
</p>

<p align="center">
  <a href="#"><img src="https://img.shields.io/badge/ESLint-8.x%2B-4B32C3?logo=eslint&logoColor=white" alt="ESLint" /></a>
  <a href="#"><img src="https://img.shields.io/badge/pnpm-10.x-F69220?logo=pnpm&logoColor=white" alt="pnpm" /></a>
</p>

---

## Overview

Shared ESLint flat configuration designed to keep code quality and styles consistent across all applications and packages within the monorepo. This package leverages ESLint Flat Config (`eslint.config.js`).

## Installation

```bash
pnpm add -D @clinic-platform/eslint-config
```

## Usage

This package exposes multiple specific presets based on the project type.

### NestJS Backend (`apps/api`)

Create `eslint.config.js` in your app root:

```javascript
import nestJsConfig from '@clinic-platform/eslint-config/nestjs';

export default [...nestJsConfig];
```

### Next.js Apps

Create `eslint.config.js` in your app root:

```javascript
import nextConfig from '@clinic-platform/eslint-config/next-internal-library';

export default [...nextConfig];
```

### React/Vite Apps

Create `eslint.config.js` in your app root:

```javascript
import reactConfig from '@clinic-platform/eslint-config/react-internal-library';

export default [...reactConfig];
```

### Generic Node/TS Packages

Create `eslint.config.js` in your package root:

```javascript
import baseConfig from '@clinic-platform/eslint-config/base';

export default [...baseConfig];
```

## Best Practices
- Avoid overriding standard rules locally unless absolutely necessary.
- Fix all warnings before committing (`pnpm lint:fix`).
