# @clinic-platform/ui

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
