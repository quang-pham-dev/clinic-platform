<p align="center">
  <img src="https://upload.wikimedia.org/wikipedia/commons/4/4c/Typescript_logo_2020.svg" width="100" alt="TypeScript Logo" style="border-radius: 20%;" />
</p>

<h1 align="center">📐 Clinic Platform TypeScript Config</h1>

<p align="center">
  <strong>Shared tsconfig.json configurations for the Clinic Platform monorepo</strong>
</p>

<p align="center">
  <a href="#"><img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="#"><img src="https://img.shields.io/badge/pnpm-10.x-F69220?logo=pnpm&logoColor=white" alt="pnpm" /></a>
</p>

---

## Overview

Shared `tsconfig.json` bases used by various applications and packages in the monorepo to maintain strict, modern, and consistent type-checking. All configurations enforce strict mode and standard outputs.

## Installation

```bash
pnpm add -D @clinic-platform/typescript-config
```

## Usage

Extend the appropriate configuration in your app or package's `tsconfig.json`.

### Base (Generic Node Packages)
```json
{
  "extends": "@clinic-platform/typescript-config/base.json",
  "compilerOptions": {
    "outDir": "dist"
  },
  "include": ["src"]
}
```

### NestJS
```json
{
  "extends": "@clinic-platform/typescript-config/nestjs.json",
  "compilerOptions": {
    "outDir": "dist"
  },
  "include": ["src"]
}
```

### React (Vite)
```json
{
  "extends": "@clinic-platform/typescript-config/vite-app.json",
  "compilerOptions": {
    "outDir": "dist"
  },
  "include": ["src"]
}
```

### Next.js
```json
{
  "extends": "@clinic-platform/typescript-config/nextjs-library.json",
  "compilerOptions": {
    "outDir": "dist"
  },
  "include": ["src"]
}
```
