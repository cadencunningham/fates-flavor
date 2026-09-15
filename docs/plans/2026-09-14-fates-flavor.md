# Plan: Fates Flavor — recipe picker (P0–P2)
**Created:** 2026-09-14
**Status:** draft
**Complexity:** complex
**Review cadence:** 2
---
## Context
**Problem:** There is no site where a customer can browse recipes, pick one manually or let the site choose at random, narrow the pool with filters, and turn several chosen recipes into one grocery list.

**Scope by priority:**
- **P0** — recipe cards (title, description, tags); browse + manual pick; random pick; tag filters that apply to both list and random; deployed to GitHub Pages.
- **P1** — recipe detail view: ingredients, step-by-step instructions, prep/cook time, servings, image; exclude-only ingredient filters.
- **P2** — ingredient measurements; selections with per-recipe servings; grocery list that scales to servings, merges the same ingredient across recipes with compatible-unit conversion (volume↔volume, mass↔mass, never across), and a metric/US display toggle.
- **Out of scope (model leaves room):** users/profiles, theming (dark/light, custom), adding recipes via UI, animated "fun" random view.

**Success criteria:**
- P0 live on GitHub Pages: browse cards, filter by tags, random pick always respects active filters.
- P1 detail view shows every field; excluding an ingredient removes every recipe containing it from browse and random.
- P2: a shared `?sel=` link reproduces the same selections + servings in another browser; grocery list scales, merges compatible units, and toggles metric/US.
- Seed JSON is validated against the model by an automated test.

## Constraints
- React + TypeScript (strict) + Vite, static build, hosted on GitHub Pages (repo `cadencunningham/fates-flavor`, public) at base path `/fates-flavor/`; deployed via GitHub Actions.
- HashRouter for routing (no server fallback on Pages).
- Styling: Tailwind v4 on semantic CSS-variable design tokens; shadcn/ui components added only when a phase needs one. Components use semantic tokens only — never raw palette colors or hex — so future theming is a token swap.
- Data lives in static JSON assets, read only through a `RecipeRepository` interface so an API/DB can replace it without UI changes.
- Normalized model: recipes, tags, ingredients in separate files; recipe lines reference ingredients by ID. Model includes P1/P2 fields from the start (optional where not yet populated).
- Filter criteria persist in localStorage and never appear in the URL.
- Selections (recipe + servings) live only in the URL: `?sel=<id>:<servings>,…`, short stable IDs, soft cap 50. A bare visit starts with no selections.
- Filters never remove an existing selection.
- Browse and random pick consume one shared filtered set.
- No `dangerouslySetInnerHTML`; recipe text is rendered as text.

## Chosen Approach
**Normalized catalog JSON behind a `RecipeRepository` interface + HashRouter** — ID-based references make ingredient exclusion and grocery merging exact and map 1:1 to future DB tables; pure domain modules (filters, units, grocery, selections codec) have no React/browser imports, so business rules are testable and survive a backend swap. HashRouter removes the Pages 404 fallback hack. **Fallback:** if hand-authoring cross-file IDs becomes painful, add a build-time compile step from per-recipe YAML into the same normalized JSON (runtime model unchanged).

## Rejected Approaches
- **Embedded ingredient strings per recipe:** name-string matching makes "tomato"/"tomatoes" distinct, breaking merge and exclusion, and needs extraction to move to a DB.
- **Per-recipe source files compiled at build (now):** best authoring, but adds a compiler to maintain before there is evidence authoring is a pain point.
- **BrowserRouter + 404.html copy:** clean URLs, but first request returns HTTP 404 and hosting is not settled; selection links are ephemeral so URL-format churn later is cheap.
- **CSS Modules / runtime CSS-in-JS / typed zero-runtime CSS:** Modules require hand-building accessible widgets; runtime CSS-in-JS has perf cost and styled-components is in maintenance mode; vanilla-extract/Panda is overkill for a POC.

---
## Implementation Phases

### Phase 1: Scaffold & deploy pipeline
**Model:** sonnet
**Skills:** cc-quality-practices
**Gate:** Standard

**Goal:** Stand up a strict-TS React + Vite app shell with test/lint tooling, Tailwind v4 semantic tokens, and a GitHub Actions workflow that deploys to Pages on green `main`.

**Scope:**
- IN: Vite/React/TS scaffold, Vitest + React Testing Library (jsdom), ESLint, HashRouter shell with placeholder home + not-found routes, Tailwind v4 + `tokens.css`, shadcn init, raw-color guard script, CI/deploy workflow, README dev commands.
- OUT: any recipe data, domain types, feature UI, dark theme values.

**Constraints:** Vite `base: '/fates-flavor/'`. Tokens are semantic names only (surface, surface-raised, text, text-muted, accent, accent-contrast, border, radius, spacing scale); light values only.
**Edge cases:** deep link `#/does-not-exist` renders not-found; deploy job must not run on PRs or on red checks.
**Depends on:** none | **Unlocks:** Phase 2
**File scope:** `package.json, package-lock.json, vite.config.ts, tsconfig*.json, index.html, eslint.config.*, components.json, .nvmrc, .github/workflows/**, scripts/**, src/main.tsx, src/app/**, src/styles/**, src/lib/**, src/test/**, README.md`
**Produces:** runnable app with scripts `dev | build | test | lint | typecheck | check:tokens`; directory layout `src/app` (composition root, routes), `src/domain` (pure TS, no React/DOM), `src/data` (repository + storage adapters), `src/features/<feature>`, `src/components/ui` (shadcn), `src/styles/tokens.css`, `public/data`.
**Rollback:** redeploy the previous green commit (revert + push re-runs the workflow); disable Pages in repo settings as last resort.

**Approach notes:** User confirmed GitHub Actions (public repo → free). Repo Settings → Pages → Source must be set to "GitHub Actions" (one-time manual step by the user).

**Done when:**
- [ ] DW-1.1: `npm run build` emits `dist/` whose asset URLs are prefixed `/fates-flavor/`; `npm run dev` serves the shell.
- [ ] DW-1.2: `npm test`, `npm run lint`, `npm run typecheck` pass; a smoke test renders the app shell and the not-found route.
- [ ] DW-1.3: Tailwind v4 reads `src/styles/tokens.css` via `@theme`; the shell uses only semantic token utilities.
- [ ] DW-1.4: `npm run check:tokens` fails on raw palette utilities (e.g. `bg-red-500`) or hex colors in `src/features/**` and `src/components/**`, and passes on the current tree (verified by a fixture test).
- [ ] DW-1.5: `.github/workflows/deploy.yml` runs lint, typecheck, check:tokens, test, build on push and PR; the deploy job runs only on `main` after all pass.
- [ ] DW-1.6: Shell is reachable at `https://cadencunningham.github.io/fates-flavor/` (manual).

**Difficulty:** LOW
**Uncertainty:** shadcn CLI init details for Tailwind v4 + Vite may shift; build agent verifies against current docs.

### Phase 2: Domain model & recipe repository
**Model:** fable
**Skills:** aposd-designing-deep-modules, ca-architecture-boundaries, cc-defensive-programming
**Gate:** Full

**Goal:** Define the normalized recipe model with runtime validation and a `RecipeRepository` abstraction backed by static JSON, plus P0 seed data — the seam every later phase consumes.

**Scope:**
- IN: domain types, unit ID catalog (IDs + dimension only), runtime schema with cross-reference checks, repository interface, static-JSON + in-memory implementations, React provider/hook, P0 seed data, data-file validation test.
- OUT: conversion factors (Phase 5), filtering, UI beyond the provider.

**Constraints:** `src/domain/model` imports nothing from React, DOM, or `src/data`. JSON is fetched at runtime from `${import.meta.env.BASE_URL}data/{recipes,tags,ingredients}.json` (a static asset, like a future API).
**Edge cases:** duplicate IDs; dangling `tagId`/`ingredientId`; malformed ID; `amount <= 0`; unknown unit; a line with `quantity` on a recipe with no `servings`; fetch 404 / network failure / non-JSON body.
**Depends on:** Phase 1 | **Unlocks:** Phase 3, Phase 5
**File scope:** `src/domain/model/**, src/data/repository/**, public/data/**, src/app/providers/**`
**Produces:**
```ts
type RecipeId = string; type TagId = string; type IngredientId = string; // /^[a-z0-9]{4,12}$/
type TagGroup = 'meal' | 'cuisine' | 'diet' | 'other';
interface Tag { id: TagId; name: string; group: TagGroup }
interface Ingredient { id: IngredientId; name: string; pluralName?: string }
type Dimension = 'volume' | 'mass' | 'count';
type UnitId = /* union, e.g. 'tsp'|'tbsp'|'cup'|'floz'|'ml'|'l'|'oz'|'lb'|'g'|'kg'|'piece'|'clove'|'can'|'pinch' */;
declare const UNIT_DIMENSIONS: Record<UnitId, Dimension>;
interface Quantity { amount: number; unit: UnitId }
interface IngredientLine { ingredientId: IngredientId; quantity?: Quantity; note?: string }
interface Recipe { id: RecipeId; title: string; description: string; tagIds: TagId[];
  ingredients: IngredientLine[]; steps: string[]; prepMinutes?: number; cookMinutes?: number;
  servings?: number; image?: { src: string; alt: string } }
interface RecipeRepository {
  listRecipes(): Promise<Recipe[]>; getRecipe(id: RecipeId): Promise<Recipe | null>;
  listTags(): Promise<Tag[]>; listIngredients(): Promise<Ingredient[]> }
class RepositoryLoadError extends Error { file: string; issuePath?: string }
// StaticJsonRecipeRepository, InMemoryRecipeRepository (tests), <RepositoryProvider>, useRepository()
```

**Done when:**
- [ ] DW-2.1: Types above exported from `src/domain/model`; a test/grep confirms no React/DOM/`src/data` imports there.
- [ ] DW-2.2: Schema rejects every Edge case listed above with a message naming the file and JSON path of the first issue.
- [ ] DW-2.3: `StaticJsonRecipeRepository` fetches and validates each file once (cached); fetch/parse/validation failures reject with `RepositoryLoadError`; `getRecipe` of unknown id resolves `null`.
- [ ] DW-2.4: `InMemoryRecipeRepository` satisfies the same contract, verified by one shared contract test suite run against both implementations.
- [ ] DW-2.5: UI obtains the repository only via `useRepository()`; the static implementation is constructed only in `src/app`.
- [ ] DW-2.6: Seed data: ≥12 recipes with title, description, and tags spanning ≥3 tag groups; a test validates the real `public/data` files in CI.

**Difficulty:** HIGH
**Uncertainty:** exact unit list; tag groups may grow (schema keeps `group` an enum to extend deliberately).

### Phase 3: P0 browse, tag filters & random pick
**Model:** sonnet
**Skills:** aposd-designing-deep-modules, cc-defensive-programming
**Gate:** Standard

**Goal:** Deliver the P0 experience: filterable recipe card grid, manual pick, and a random pick drawn from the same filtered set, with filters persisted locally.

**Scope:**
- IN: pure filter logic (tags and ingredient exclusion), random picker, `FilterStore` + localStorage adapter, `useFilteredRecipes`, browse page, tag filter panel, `RandomPick` component, basic `#/recipe/:id` page (title, description, tags), loading/error/empty states.
- OUT: ingredient exclusion UI and full detail view (Phase 4), selections (Phase 6), animations.

**Approach notes:** Tag semantics: OR within a tag group, AND across groups (e.g. {dinner, lunch} + {italian} = (dinner OR lunch) AND italian). `RandomPick` is a standalone component so an animated variant can replace it.
**Edge cases:** zero matching recipes; one candidate; stored criteria with unknown IDs, wrong shape, corrupt JSON, or localStorage throwing; repository rejects.
**Depends on:** Phase 2 | **Unlocks:** Phase 4
**File scope:** `src/domain/filters/**, src/data/storage/**, src/features/browse/**, src/features/filters/**, src/features/random/**, src/features/recipe-detail/**, src/components/ui/**, src/app/routes/**`
**Produces:**
```ts
interface FilterCriteria { includedTagIds: TagId[]; excludedIngredientIds: IngredientId[] }
applyFilters(recipes: Recipe[], criteria: FilterCriteria, tags: Tag[]): Recipe[]
pickRandom<T>(items: T[], opts?: { exclude?: T; rng?: () => number }): T | null
interface FilterStore { load(): FilterCriteria; save(criteria: FilterCriteria): void } // LocalStorageFilterStore, key versioned
useFilteredRecipes(): { status: 'loading' | 'error' | 'ready'; recipes: Recipe[]; error?: Error;
  criteria: FilterCriteria; setCriteria(c: FilterCriteria): void; retry(): void }
// src/features/browse
<RecipeCard recipe: Recipe; tags: Tag[]; actions?: ReactNode />   // `actions` slot: Phase 6 mounts selection controls here
```

**Done when:**
- [ ] DW-3.1: `applyFilters` implements the tag semantics above, removes any recipe containing an excluded ingredient, returns all recipes for empty criteria, and ignores unknown IDs.
- [ ] DW-3.2: `LocalStorageFilterStore` returns default criteria (and logs a warning) on corrupt/mis-shaped data or a throwing storage, never throws; criteria survive reload.
- [ ] DW-3.3: Browse page shows a responsive card grid (title, description, tags), grouped tag toggles, result count, "clear filters", and an empty state; usable at 400px width.
- [ ] DW-3.4: Random pick selects only from the filtered set; "pick again" never repeats the previous pick when ≥2 candidates; disabled with a message at 0 candidates.
- [ ] DW-3.5: Clicking a card (or the random result) opens `#/recipe/:id` showing title, description, tags; `RecipeCard` renders its `actions` slot when provided.
- [ ] DW-3.6: Repository failure shows an error message with a retry control; changing filters updates browse and random without reload.
- [ ] DW-3.7: `npm run check:tokens` passes over the new features.

**Difficulty:** MEDIUM
**Uncertainty:** None

### Phase 4: P1 recipe detail & ingredient exclusion
**Model:** sonnet
**Skills:** cc-defensive-programming, cc-routine-and-class-design
**Gate:** Standard

**Goal:** Expand the recipe page into the full P1 detail view and add ingredient-exclusion controls to the shared filter panel, with P1 seed data.

**Scope:**
- IN: detail view sections (image, description, tags, prep/cook/total time, servings, ingredient names + notes, numbered steps), not-found view, ingredient exclusion picker, P1 seed data + images.
- OUT: formatted quantities and scaling (Phase 6), selection controls (Phase 6).

**Edge cases:** unknown recipe id; recipe missing any optional field (section hidden, never "undefined"/"NaN"); image fails to load (token-styled placeholder); ingredient exclusion that empties the list; ingredient search with no match.
**Depends on:** Phase 3 | **Unlocks:** Phase 6
**File scope:** `src/features/recipe-detail/**, src/features/filters/**, src/components/ui/**, public/data/**, public/images/**`
**Produces:** complete `#/recipe/:id` detail view built from extension points Phase 6 fills without restructuring; seed data where every recipe has ingredients, steps, times, servings.
```ts
// src/features/recipe-detail
<RecipeDetail recipe: Recipe; tags: Tag[]; ingredients: ReadonlyMap<IngredientId, Ingredient>;
  actions?: ReactNode;                                          // Phase 6: add/remove + servings stepper
  renderAmount?: (line: IngredientLine) => ReactNode />         // Phase 6: formatted, scaled amount; default renders nothing
<IngredientList lines: IngredientLine[]; ingredients: ReadonlyMap<IngredientId, Ingredient>;
  renderAmount?: (line: IngredientLine) => ReactNode />
```

**Approach notes:** Exclusion only (no "must contain"), per user decision.

**Done when:**
- [ ] DW-4.1: Detail view renders all P1 fields; each absent optional field hides its section; image has alt text and a placeholder on missing/failed load; `actions` and `renderAmount` render in place when provided (tested with stub nodes).
- [ ] DW-4.2: Unknown id renders a not-found view with a link back to browse.
- [ ] DW-4.3: Filter panel offers a searchable ingredient list; excluded ingredients show as removable chips, persist via `FilterStore`, and affect both browse and random.
- [ ] DW-4.4: Excluding ingredients until nothing matches shows the empty state and disables random.
- [ ] DW-4.5: Seed data: every recipe has ≥3 ingredient lines, ≥2 steps, prep/cook minutes, servings; ≥3 recipes have images ≤200 KB; data validation test passes.

**Difficulty:** MEDIUM
**Uncertainty:** image sourcing (see Notes).

### Phase 5: Units, scaling & grocery merge engine
**Model:** sonnet
**Skills:** cc-pseudocode-programming, aposd-designing-deep-modules, aposd-verifying-correctness
**Gate:** Full

**Goal:** Implement pure, UI-free unit conversion, servings scaling, cross-recipe grocery merging, and metric/US quantity formatting.

**Scope:**
- IN: conversion factors to base units (ml, g), same-dimension conversion, scaling, merge, display-unit selection, fraction/rounding formatting, pluralization.
- OUT: URL codec, React hooks, UI, ingredient densities (mass↔volume).

**Constraints:** compute in base units; round only when formatting. No React/DOM imports.
**Edge cases:** same ingredient in volume and mass (kept as two quantities on one item); count units merge only with the identical unit; lines without quantity ("as needed"); selection for unknown recipe; tiny amounts (never display "0"); large amounts (ml→l, g→kg, tsp→cup); floating-point sums (1/3 cup ×3).
**Depends on:** Phase 2 | **Unlocks:** Phase 6
**File scope:** `src/domain/units/**, src/domain/grocery/**`
**Produces:**
```ts
type MeasurementSystem = 'metric' | 'us';
interface Selection { recipeId: RecipeId; servings: number } // servings: integer 1–99
convertQuantity(q: Quantity, to: UnitId): Quantity            // throws on cross-dimension (programmer error)
scaleQuantity(q: Quantity, factor: number): Quantity
formatQuantity(q: Quantity, system: MeasurementSystem): string // "1 ½ cups", "490 ml", "3 cloves"
interface GroceryItem { ingredientId: IngredientId; name: string; quantities: Quantity[]; asNeeded: boolean; recipeIds: RecipeId[] }
interface GroceryList { items: GroceryItem[]; skippedRecipeIds: RecipeId[] }
buildGroceryList(selections: Selection[], recipes: Recipe[], ingredients: Ingredient[]): GroceryList
```

**Done when:**
- [ ] DW-5.1: Every `UnitId` has a conversion entry (count units are identity-only); an exhaustiveness test fails if a unit is added without one.
- [ ] DW-5.2: `convertQuantity` is correct for all same-dimension pairs (table test) and throws on cross-dimension.
- [ ] DW-5.3: `buildGroceryList` scales each line by `selection.servings / recipe.servings`, merges by `ingredientId` per Edge-case rules, reports unknown recipes in `skippedRecipeIds`, sorts items by name, and is deterministic.
- [ ] DW-5.4: `formatQuantity` picks readable units (US: tsp/tbsp/cup, oz/lb; metric: ml/l, g/kg), renders US amounts as fractions to the nearest ⅛, never shows zero for a positive amount, and pluralizes units and count nouns.
- [ ] DW-5.5: Worked-example tests with documented expected strings: 1 cup + 250 ml of one ingredient (both systems); a recipe scaled ×2 and ×0.5; volume + mass of the same ingredient; ⅓ cup ×3 = "1 cup".
- [ ] DW-5.6: No React/DOM imports in `src/domain/units` or `src/domain/grocery` (test/grep).

**Difficulty:** HIGH
**Uncertainty:** rounding granularity for metric display (build agent documents the rule in tests).

### Phase 6: P2 selections in URL & grocery list UI
**Model:** fable
**Skills:** cc-defensive-programming, aposd-verifying-correctness, cc-routine-and-class-design
**Gate:** Full
**Security-sensitive:** yes — parses untrusted URL input into application state.

**Goal:** Let customers build a shareable selection of recipes with servings in the URL, view a merged grocery list, and switch metric/US display, completing P2.

**Scope:**
- IN: `sel` codec, `useSelections` hook, sel-preserving navigation, add/remove + servings controls on cards and detail, header selection badge, `#/grocery` page, `PreferencesStore` + metric/US toggle, formatted (and selection-scaled) amounts on the detail view, P2 seed measurements.
- OUT: grocery item check-off, printing/export, filters in URL.

**Constraints:** With HashRouter the query lives inside the hash (`#/grocery?sel=k3f9:4`); every in-app link and navigation must carry the current `sel`. Servings changes replace history entries rather than pushing.
**Edge cases:** malformed entries (`k3f9`, `k3f9:`, `:4`, `k3f9:abc`, `k3f9:0`, `k3f9:100`, `k3f9:2.5`); unknown IDs; duplicate IDs; >50 entries; very long `sel`; recipe hidden by filters while selected; empty selection.
**Depends on:** Phase 4, Phase 5 | **Unlocks:** none
**File scope:** `src/domain/selections/**, src/features/selections/**, src/features/grocery/**, src/features/browse/**, src/features/recipe-detail/**, src/data/storage/**, src/app/**, src/components/ui/**, public/data/**`
**Produces:**
```ts
parseSelections(raw: string | null, knownRecipeIds: ReadonlySet<RecipeId>): { selections: Selection[]; droppedCount: number }
serializeSelections(selections: Selection[]): string   // "k3f9:4,a82m:2"
const MAX_SELECTIONS = 50;
useSelections(): { selections: Selection[]; droppedCount: number; add(id: RecipeId): void;
  remove(id: RecipeId): void; setServings(id: RecipeId, servings: number): void; isFull: boolean }
interface PreferencesStore { load(): { system: MeasurementSystem }; save(p: { system: MeasurementSystem }): void }
```

**Done when:**
- [ ] DW-6.1: `parseSelections` drops every malformed/unknown/out-of-range entry listed in Edge cases, keeps the first of duplicates, truncates past 50, and reports `droppedCount`; `parse(serialize(x))` round-trips for valid input.
- [ ] DW-6.2: Navigating between browse, detail, random result, and grocery preserves `sel`; servings edits do not add history entries.
- [ ] DW-6.3: Cards and detail view offer add/remove and a servings stepper (1–99); adding is disabled with a message at 50; header badge shows count and links to `#/grocery`.
- [ ] DW-6.4: Grocery page lists selected recipes with servings controls and the merged list from `buildGroceryList`; shows an empty state, and a notice when `droppedCount > 0`.
- [ ] DW-6.5: Metric/US toggle persists via `PreferencesStore` (tolerant of corrupt/throwing storage) and applies to grocery list and detail amounts; detail amounts scale to selected servings when the recipe is selected, else the recipe's default.
- [ ] DW-6.6: A recipe hidden by active filters stays in selections and on the grocery list.
- [ ] DW-6.7: Opening a `#/grocery?sel=…` URL in a fresh session renders the same list (RTL test with a fresh router + manual check on Pages).
- [ ] DW-6.8: Every seed ingredient line has a quantity or is intentionally unquantified; no `dangerouslySetInnerHTML` in `src` (grep test).

**Difficulty:** MEDIUM
**Uncertainty:** None

---
## Test Coverage
**Level:** 100%

## Test Plan
**Unit (Vitest)**
- [ ] DW-1.1 build-output test (CI step after `npm run build`): `dist/index.html` asset URLs start with `/fates-flavor/`
- [ ] DW-1.2 app shell + not-found smoke render
- [ ] DW-1.3 `tokens.css` declares every semantic token inside `@theme`; `check:tokens` passes on the shell
- [ ] DW-1.4 `check:tokens` fixture: fails on `bg-red-500` and `#ff0000`, passes on semantic utilities
- [ ] DW-3.7 `check:tokens` passes over `src/features/**` (CI step)
- [ ] DW-2.1 / DW-5.6 import-boundary tests for `src/domain/**`
- [ ] DW-2.5 import-boundary test: `StaticJsonRecipeRepository` imported only under `src/app/**`; `src/features/**` never imports `src/data/repository` implementations
- [ ] DW-2.2 schema: valid fixture passes; dirty — duplicate id, dangling tagId, dangling ingredientId, id `"AB!"`, id length 3 and 13 (boundary; 4 and 12 pass), `amount: 0`, `amount: -1`, unknown unit, quantity without servings, missing title, `tagIds` not an array
- [ ] DW-2.3 static repo: caches (single fetch per file); dirty — 404, network reject, non-JSON body, schema failure → `RepositoryLoadError` with file + path; unknown id → `null`
- [ ] DW-2.4 shared contract suite against static (mocked fetch) and in-memory repos
- [ ] DW-2.6 / DW-4.5 real `public/data` files validate
- [ ] DW-3.1 `applyFilters`: empty criteria; OR within group; AND across groups; exclusion; unknown tag and ingredient IDs ignored; all-filtered → `[]`
- [ ] DW-3.2 filter store: round-trip; dirty — corrupt JSON, wrong shape, old version key, `localStorage` getter throws, `setItem` throws (quota)
- [ ] DW-3.4 `pickRandom`: `[]` → null; one item with `exclude` equal to it → that item; ≥2 never returns `exclude` (seeded rng); uniform-ish distribution over seeded runs
- [ ] DW-5.1 unit catalog exhaustiveness
- [ ] DW-5.2 conversion table for every same-dimension pair; cross-dimension throws
- [ ] DW-5.3 grocery merge: scaling ×2 / ×0.5; volume sum across systems; volume + mass kept separate; `clove` + `clove` merge, `clove` + `piece` separate; unquantified → `asNeeded`; unknown recipe → `skippedRecipeIds`; empty selections → empty list; deterministic order
- [ ] DW-5.4 formatting: ⅛ boundary (1/16 cup shows non-zero), 3 tsp → 1 tbsp, 16 tbsp → 1 cup, 999 ml vs 1000 ml → 1 l, 999 g vs 1000 g → 1 kg, singular/plural
- [ ] DW-5.5 worked examples with documented strings (⅓ cup ×3 = "1 cup")
- [ ] DW-6.1 codec: valid round-trip; dirty — `k3f9`, `k3f9:`, `:4`, `k3f9:abc`, `k3f9:0`, `k3f9:1` (boundary pass), `k3f9:99` (pass), `k3f9:100`, `k3f9:2.5`, unknown id, duplicate, 50 entries (pass) vs 51 (truncate), 10 000-char string, `null`/empty
- [ ] DW-6.5 preferences store: round-trip; corrupt/throwing storage → default
- [ ] DW-6.8 grep test: no `dangerouslySetInnerHTML`

**Integration (React Testing Library, `InMemoryRecipeRepository`)**
- [ ] DW-3.3 browse renders cards, grouped tag toggles, count, clear filters, empty state
- [ ] DW-3.5 card click and random result navigate to `#/recipe/:id`; `RecipeCard` renders a stub `actions` node
- [ ] DW-3.6 repository rejection → error + retry recovers; filter change updates browse and random
- [ ] DW-4.1 detail with all fields; detail with every optional field missing (no "undefined"/"NaN"); image error → placeholder; stub `actions` and `renderAmount` render in place
- [ ] DW-4.2 unknown id → not-found
- [ ] DW-4.3 ingredient search, search with no match shows "no ingredients found", exclude chip, remove chip, persisted across remount
- [ ] DW-4.4 exclusions empty the list → empty state + random disabled
- [ ] DW-6.2 `sel` preserved across browse → detail → random → grocery; servings edit uses replace
- [ ] DW-6.3 add/remove, stepper bounds 1 and 99, add disabled at 50
- [ ] DW-6.4 grocery list from selections; empty state; dropped notice when URL had bad entries
- [ ] DW-6.5 toggle switches grocery + detail units; detail scales to selected servings
- [ ] DW-6.6 filtered-out selected recipe still on grocery list
- [ ] DW-6.7 fresh router at `#/grocery?sel=…` renders expected list

**Manual**
- [ ] DW-1.5 PR run executes checks without deploying; `main` push deploys
- [ ] DW-1.6 / DW-6.7 live site loads; shared grocery link opens identically in a private window
- [ ] DW-3.3 layout at 400px width

---
## Assumptions
| Assumption | Confidence | Verify Before Phase | Fallback If Wrong |
|---|---|---|---|
| Recipes are added by hand-editing JSON | HIGH | 2 | Add YAML → JSON compile step (Chosen Approach fallback) |
| Tag filter semantics: OR within group, AND across groups | MEDIUM | 3 | Switch `applyFilters` rule; UI unchanged |
| Seed recipes are sample content the owner will replace | MEDIUM | 2 | Owner supplies real recipes before Phase 4 |
| Mass↔volume merging is not needed (no density table) | MEDIUM | 5 | Add optional `densityGPerMl` on `Ingredient` later |
| ~50 selections comfortably fits share-safe URL length (~5 chars/entry) | HIGH | 6 | Lower cap; IDs already short |
| Pages source can be switched to "GitHub Actions" by the owner | HIGH | 1 | Use `gh-pages` branch deploy |

## Decision Log
| Decision | Alternatives Considered | Rationale | Phase |
|---|---|---|---|
| React + TS + Vite | Vanilla TS, Svelte | Shared filter state across views; future animated view | 1 |
| GitHub Actions deploy | Manual `gh-pages` push | Free on public repo; automatic, gated on green checks | 1 |
| Tailwind v4 + semantic tokens + shadcn on demand | CSS Modules, CSS-in-JS, vanilla-extract | Tokens as CSS vars make theming a swap; accessible primitives for filters/dialogs | 1 |
| HashRouter | BrowserRouter + 404.html | No Pages fallback hack; hosting not settled | 1 |
| Normalized JSON behind `RecipeRepository` | Embedded strings, compiled per-recipe files | Exact ID-based merge/exclude; DB-shaped | 2 |
| Runtime fetch of `public/data` JSON | Bundle-time JSON import | Mirrors future API; async repository contract from day one | 2 |
| Filters in localStorage, selections in URL | Both in URL; both local | User decision: selections shareable, filters personal | 3, 6 |
| Exclude-only ingredient filters | Exclude + require | User decision | 4 |
| Base-unit math, round only on display | Store display units | Avoids float drift across merges | 5 |
| Mixed-system input with metric/US display toggle | Single system | User decision | 5, 6 |

---
## Notes
- **Phase 2 not marked Security-sensitive:** the fetched JSON is owner-authored and same-origin; it is still schema-validated at the barricade. Revisit (mark Security-sensitive) when the repository reads from an API or user-submitted data.
- **Seam discipline:** `src/domain/**` must stay free of React/DOM so it can be reused server-side if a backend arrives.
- **HashRouter + query gotcha:** `?sel=` sits inside the hash; plain `<Link to="/recipe/x">` drops it. Phase 6 must route every navigation through a sel-preserving helper.
- **Images:** use owner-taken or clearly licensed images; commit optimized files under `public/images/`, referenced relative to `BASE_URL`.
- **Theming readiness:** dark/light later = add dark token values under `[data-theme="dark"]`; no component changes if the token constraint holds.
- **Fun random view:** replace `RandomPick` implementation; `pickRandom` and `useFilteredRecipes` stay.
- **Future DB:** implement `RecipeRepository` against an API; the schema doubles as the API response validator.
- `docs/code-standards.md` was not generated (empty repo); regenerate after Phase 1 to capture the conventions it establishes.

---
## Execution Log
_To be filled during /code-foundations:build_
