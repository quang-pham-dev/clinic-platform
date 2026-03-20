# @clinic-platform/utils

Shared utility functions for the Clinic Platform monorepo.

## Install

```bash
pnpm add @clinic-platform/utils
```

## Usage

```ts
import { assertNever, formatDate, invariant } from '@clinic-platform/utils';

invariant(user, 'User is required');
console.log(formatDate(new Date()));

type Status = 'idle' | 'loading' | 'done';
const status: Status = 'idle';

switch (status) {
  case 'idle':
  case 'loading':
  case 'done':
    break;
  default:
    assertNever(status);
}
```
