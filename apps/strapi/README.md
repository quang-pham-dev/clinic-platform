<p align="center">
  <img src="https://strapi.io/assets/strapi-logo-dark.svg" width="150" alt="Strapi Logo" />
</p>

<h1 align="center">🏥 Clinic Platform Headless CMS</h1>

<p align="center">
  <strong>Strapi v5 Headless CMS for the Clinic Platform</strong>
</p>

<p align="center">
  <a href="#"><img src="https://img.shields.io/badge/Strapi-5.x-2F2E8B?logo=strapi&logoColor=white" alt="Strapi" /></a>
  <a href="#"><img src="https://img.shields.io/badge/Node.js-20+-339933?logo=nodedotjs&logoColor=white" alt="Node.js" /></a>
  <a href="#"><img src="https://img.shields.io/badge/SQLite-003B57?logo=sqlite&logoColor=white" alt="SQLite" /></a>
  <a href="#"><img src="https://img.shields.io/badge/React-18.x-61DAFB?logo=react&logoColor=black" alt="React" /></a>
  <a href="#"><img src="https://img.shields.io/badge/pnpm-10.x-F69220?logo=pnpm&logoColor=white" alt="pnpm" /></a>
</p>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Scripts](#-scripts)
- [Environment Variables](#-environment-variables)
- [Contributing](#-contributing)

---

## 🏗️ Overview

This is the **Headless CMS** for the **Clinic Platform** — part of a Turborepo monorepo (`strapi`). It is built with **Strapi v5** and manages the static content, settings, and other CMS-related data required by the frontend applications.

- 🛠️ **Content Types Builder:** Allows managing custom models for clinic announcements, landing page content, and policy documents.
- 🔑 **Users & Permissions:** Default Strapi role-based access control for content editors.
- 🚀 **REST / GraphQL APIs:** Provides out-of-the-box headless APIs consumed by the member and dashboard apps.

---

## 🛠️ Tech Stack

| Category            | Technology                              |
| ------------------- | --------------------------------------- |
| **Runtime**         | Node.js 20+                             |
| **Framework**       | Strapi 5                                |
| **Database**        | SQLite (via `better-sqlite3`)           |
| **Admin UI**        | React 18                                |
| **Package Manager** | pnpm 10 (workspace)                     |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 20
- **pnpm** ≥ 10

### Installation

```bash
# From monorepo root
pnpm install

# Build the admin panel (required for first run or when UI changes)
pnpm --filter strapi build
```

### Run Development Server

```bash
# From monorepo root
pnpm --filter strapi dev

# Or from this directory
pnpm dev
```

The Admin Panel will be available at:
`http://localhost:1337/admin`

The API endpoints will be accessible at:
`http://localhost:1337/api`

---

## 📜 Scripts

| Script             | Description                            |
| ------------------ | -------------------------------------- |
| `pnpm dev`         | Start Strapi in development mode (auto-reload) |
| `pnpm build`       | Build the Strapi admin UI              |
| `pnpm start`       | Start Strapi in production mode        |

---

## 🔐 Environment Variables

Ensure you have a `.env` file configured. Example default variables for Strapi:

| Variable                 | Default                 | Description                             |
| ------------------------ | ----------------------- | --------------------------------------- |
| `HOST`                   | `0.0.0.0`               | Server host                             |
| `PORT`                   | `1337`                  | Server port                             |
| `APP_KEYS`               | `toBeModified1,toBeModified2`| Keys for signing sessions          |
| `API_TOKEN_SALT`         | `toBeModified`          | Salt for API tokens                     |
| `ADMIN_JWT_SECRET`       | `toBeModified`          | Secret for Admin JWT                    |
| `TRANSFER_TOKEN_SALT`    | `toBeModified`          | Salt for transfer tokens                |
| `JWT_SECRET`             | `toBeModified`          | Secret for User JWT                     |

*(Note: Never use the default secrets in production!)*

---

## 🤝 Contributing

1. Follow the rules in [`RULES.md`](../../RULES.md) at the repo root
2. Use conventional commits

---

## 📄 License

This project is private and proprietary. All rights reserved.
