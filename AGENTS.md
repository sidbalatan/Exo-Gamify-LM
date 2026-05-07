# AGENTS.md

## Cursor Cloud specific instructions

This is a **Next.js 16** (React 19) frontend application for the XQuest exoplanet detection game. There is no backend yet — the README describes a planned FastAPI + PostgreSQL backend, but only the frontend exists today.

### Running the app

- **Package manager**: pnpm (lockfile: `pnpm-lock.yaml`)
- **Dev server**: `pnpm dev` — starts on `http://localhost:3000`
- **Build**: `pnpm build`
- **Lint**: `pnpm lint` — note: ESLint is referenced in `package.json` scripts but is **not** installed as a dependency. This command will fail until ESLint is added.

### Gotchas

- `next.config.mjs` has `typescript.ignoreBuildErrors: true` and `images.unoptimized: true`, so builds will succeed even with TS errors and image optimization is disabled.
- The `sharp` package build scripts are ignored by pnpm. This is non-blocking since image optimization is disabled.
- There is no test framework configured (no jest, vitest, playwright, etc.).
- There is no ESLint config file (no `.eslintrc`, `eslint.config.*`, etc.) — the lint script will fail.
- No environment variables or secrets are required to run the frontend.
