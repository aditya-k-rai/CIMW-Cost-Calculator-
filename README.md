# Cost Calculator

Modern rebuild of the CC calculator suite using Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn-style UI components, Framer Motion, React Hook Form, Zod, and a NestJS backend.

## Structure

```txt
apps/web      Next.js website
apps/api      NestJS API
packages/shared  Shared schemas, data, and calculation logic
```

## Run

```bash
npm install
npm run dev
```

Web: `http://localhost:3000`

API: `http://localhost:4000`

## Features

- Construction calculator with area conversion, quality presets, material split, quantity estimate, and monthly cash-flow.
- Modular kitchen, interior, and wardrobe product selectors with cart totals.
- Quote request form with Zod validation.
- NestJS endpoints for config, catalog, construction estimates, and quote submissions.
