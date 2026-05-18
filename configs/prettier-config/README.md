<p align="center">
  <img src="https://avatars.githubusercontent.com/u/25822731" width="100" alt="Prettier Logo" style="border-radius: 20%;" />
</p>

<h1 align="center">💅 Clinic Platform Prettier Config</h1>

<p align="center">
  <strong>Shared Prettier configuration for the Clinic Platform monorepo</strong>
</p>

<p align="center">
  <a href="#"><img src="https://img.shields.io/badge/Prettier-3.x-F7B93E?logo=prettier&logoColor=black" alt="Prettier" /></a>
  <a href="#"><img src="https://img.shields.io/badge/pnpm-10.x-F69220?logo=pnpm&logoColor=white" alt="pnpm" /></a>
</p>

---

## Overview

Centralized code formatting rules for the monorepo to ensure a unified code style without developer arguments. This config automatically formats TS, TSX, JS, JSON, CSS, and Markdown. It also includes plugins for sorting imports.

## Installation

```bash
pnpm add -D @clinic-platform/prettier-config
```

## Usage

You do not need a `.prettierrc` file in every package. Instead, declare the prettier configuration directly in the package's `package.json`.

In any app or package `package.json`, add:

```json
{
  "prettier": "@clinic-platform/prettier-config/base"
}
```

## IDE Setup (VSCode)

Ensure your IDE uses Prettier as the default formatter. Add this to your `.vscode/settings.json` (already configured at monorepo root):

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true
}
```
