<p align="center">
  <img src="https://upload.wikimedia.org/wikipedia/commons/4/4c/Typescript_logo_2020.svg" width="100" alt="TypeScript Logo" />
</p>

<h1 align="center">🛠️ Clinic Platform Utils</h1>

<p align="center">
  <strong>Shared utility functions for the Clinic Platform monorepo</strong>
</p>

<p align="center">
  <a href="#"><img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="#"><img src="https://img.shields.io/badge/pnpm-10.x-F69220?logo=pnpm&logoColor=white" alt="pnpm" /></a>
</p>

---

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
