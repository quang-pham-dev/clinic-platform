<p align="center">
  <img src="https://upload.wikimedia.org/wikipedia/commons/d/d5/Tailwind_CSS_Logo.svg" width="100" alt="Tailwind CSS Logo" />
</p>

<h1 align="center">🎨 Clinic Platform Design System</h1>

<p align="center">
  <strong>Shared Tailwind CSS v4 design system for the Clinic Platform</strong>
</p>

<p align="center">
  <a href="#"><img src="https://img.shields.io/badge/TailwindCSS-v4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS" /></a>
  <a href="#"><img src="https://img.shields.io/badge/PostCSS-DD3A0A?logo=postcss&logoColor=white" alt="PostCSS" /></a>
  <a href="#"><img src="https://img.shields.io/badge/pnpm-10.x-F69220?logo=pnpm&logoColor=white" alt="pnpm" /></a>
</p>

---

Shared Tailwind CSS v4 design system for the Clinic Platform monorepo. This package
ships tokens, themes, base styles, and custom utilities as CSS, plus a PostCSS
config that enables `@tailwindcss/postcss`.

## Overview

- CSS-first Tailwind v4 (no `tailwind.config.js` required)
- Design tokens defined in `@theme` using CSS variables
- Theme overrides split into light/dark files
- Custom utilities declared with top-level `@utility`

## Installation

```json
{
  "devDependencies": {
    "@clinic-platform/design-system": "workspace:*"
  }
}
```

## Exports

- `@clinic-platform/design-system` -> `globals.css`
- `@clinic-platform/design-system/globals` -> `globals.css`
- `@clinic-platform/design-system/design-tokens` -> `design-tokens.css`
- `@clinic-platform/design-system/theme-light` -> `theme-light.css`
- `@clinic-platform/design-system/theme-dark` -> `theme-dark.css`
- `@clinic-platform/design-system/postcss-config` -> `postcss-config.js`

## Usage

1. Configure PostCSS in your app or package:

```js
export { default } from '@clinic-platform/design-system/postcss-config';
```

2. Import the globals once in your main CSS entry point:

```css
@import '@clinic-platform/design-system';

/* package-specific styles */
```

3. Theme switching:

- Light theme lives in `:root` (`theme-light.css`)
- Dark theme uses `.dark` (`theme-dark.css`)
- Additional variants can be added via `@custom-variant` in `design-tokens.css`

## What is inside

- `globals.css`: Tailwind base layer and utilities
- `design-tokens.css`: source of truth for tokens (`@theme`)
- `theme-light.css` / `theme-dark.css`: semantic overrides

## Best practices

- Prefer semantic tokens over raw scale values
- Keep `@utility` blocks top-level (Tailwind v4 disallows nesting)
- Avoid custom utility names that collide with Tailwind color utilities (`text-primary`, `bg-primary`, etc.)
- Update both themes when you add new semantic tokens
- Import the globals only once per app/library

## Notes for apps in this monorepo

- Use `@source` in each app CSS entry to include monorepo packages in class scanning.
- Keep the design-system source of truth in CSS (`@theme`, `@utility`, `@custom-variant`).

## Migration (from @clinic-platform/tailwind-config)

- Replace package dependency with `@clinic-platform/design-system`
- Update imports to `@clinic-platform/design-system` and `/postcss-config`

## Contributing

1. Update tokens in `design-tokens.css`
2. Adjust theme overrides as needed
3. Validate in Web and Storybook
