<p align="center">
  <img src="https://ui.shadcn.com/apple-touch-icon.png" width="100" alt="shadcn/ui Logo" style="border-radius: 20%;" />
</p>

<h1 align="center">🧩 Clinic Platform UI Components</h1>

<p align="center">
  <strong>Shared UI component library for the Clinic Platform monorepo</strong>
</p>

<p align="center">
  <a href="#"><img src="https://img.shields.io/badge/React-19.x-61DAFB?logo=react&logoColor=black" alt="React" /></a>
  <a href="#"><img src="https://img.shields.io/badge/TailwindCSS-v4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS" /></a>
  <a href="#"><img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="#"><img src="https://img.shields.io/badge/pnpm-10.x-F69220?logo=pnpm&logoColor=white" alt="pnpm" /></a>
</p>

---

Shared UI component library for the Clinic Platform monorepo.

## Install

```bash
pnpm add @clinic-platform/ui
```

## Usage

```tsx
import { Button } from '@clinic-platform/ui';

export function Example() {
  return <Button size="lg">Get started</Button>;
}
```

### Layout primitives

```tsx
import { Container, Grid, Stack } from '@clinic-platform/ui';

export function LayoutExample() {
  return (
    <Container>
      <Stack gap="lg">
        <Grid className="grid-cols-1" responsive="lg">
          <div>Card A</div>
          <div>Card B</div>
          <div>Card C</div>
        </Grid>
      </Stack>
    </Container>
  );
}
```

## Styles

Import the global design system once in your app:

```css
@import '@clinic-platform/ui/styles.css';
```

## Notes

- Tailwind CSS v4 tokens live in `@clinic-platform/design-system`.
- Components use `class-variance-authority` and `cn` helper.
