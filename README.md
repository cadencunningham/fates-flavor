# fates-flavor

Website that will host recipes which can be randomly selected.

React + TypeScript (strict) + Vite, deployed to GitHub Pages at
`https://cadencunningham.github.io/fates-flavor/`.

## Requirements

Node 22 (see `.nvmrc`); also runs on Node ≥20.11 locally (see
`docs/plans/2026-09-14-fates-flavor.md` Phase 1 for the version-pinning
rationale).

## Dev commands

```sh
npm install       # install dependencies
npm run dev        # start the dev server
npm run build       # typecheck + production build to dist/
npm run preview      # preview the production build locally
npm test          # run the test suite once
npm run test:watch    # run the test suite in watch mode
npm run lint        # lint the project
npm run typecheck     # typecheck without emitting
npm run check:vars    # fail on raw palette colors / hex outside vars.css
npm run verify:build   # assert dist/ asset URLs carry the /fates-flavor/ base
```

## Deployment

`.github/workflows/deploy.yml` runs lint, typecheck, check:vars, test, build,
and verify:build on every push and pull request against `main`. On a push to
`main` where all of those succeed, it deploys `dist/` to GitHub Pages.

The repository's **Settings → Pages → Source** must be set to
**"GitHub Actions"** (one-time manual step) for deploys to take effect.

## Project layout

- `src/app` — composition root: routes, providers, the app shell.
- `src/domain` — pure TypeScript domain logic (no React/DOM imports).
- `src/data` — repository interfaces and storage adapters.
- `src/features/<feature>` — feature UI, one directory per feature.
- `src/components/ui` — shadcn/ui components.
- `src/styles/vars.css` — semantic CSS vars (colors, radius, spacing), read by
  Tailwind v4 via `@theme`.
- `public/data` — static JSON data served at runtime.
