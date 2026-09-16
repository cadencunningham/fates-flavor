# Work Summaries — pivots and course corrections

A dated record of where execution diverged from the plan: what was expected, what
actually happened, what was decided, and why.

Scope note: this is narrower than the plan's Decision Log, which captures
*up-front* architectural choices. This file captures corrections discovered
*during* the build — the things nobody could have written down in advance.

---

## 2026-09-14 — Phase 1 dependency pinning for Node 20.11.1

**Expected:** a stock `npm create vite` scaffold on the CI Node version (22, per `.nvmrc`).

**What happened:** local environment is Node 20.11.1 / npm 10.2.4, where npm's
arborist crashes during install on the default dependency graph.

**Decision:** pin dependency versions to a Node-20-compatible set and add
`.npmrc` with `legacy-peer-deps=true`, with a comment explaining the workaround.
CI still runs Node 22.

**Why it matters:** the `.npmrc` flag is npm-version-agnostic so it is harmless
under Node 22, but `npm ci` has not been executed under Node 22 — CI install is
verified by lockfile consistency only. First green CI run is the real proof.

---

## 2026-09-14 — Phase 1 batch review FAILed on DW-1.2

**Expected:** Phase 1's smoke tests covered "renders the app shell and the
not-found route".

**What happened:** the independent review found the tests only ever rendered
`AppRoutes` (the bare route table), never `<App/>` (the composition root with the
header chrome). Confirmed with coverage tooling — `src/app/App.tsx` line 19 was
never executed. The not-found half was genuinely covered; the shell half was not.

**Decision:** fix forward (the phase was already committed, so the batch-failure
protocol applies). Added `test_DW_1_2_renders_shell_chrome_around_routed_content`
rendering `<App/>` under `MemoryRouter`.

**Wrinkle worth remembering:** the header brand text and the Home route's `<h1>`
are both literally "Fate's Flavor", so the assertion had to be scoped with
`within(screen.getByRole("banner"))` to avoid an ambiguous match.

---

## 2026-09-15 — Raw palette color leaked into the production CSS bundle

**Expected:** `check:vars` guaranteed no raw Tailwind palette utilities reach
production.

**What happened:** the shipped bundle contained a live
`.bg-red-500{background-color:var(--color-red-500)}` rule. Root cause: Tailwind
v4's default content scan is *unscoped* — it swept the whole repo and found the
literal string `bg-red-500` in three non-markup places: the guard's own test
fixtures, a doc comment in the guard script, and the plan prose.

The guard was never wrong; it is scoped to `src/features` and `src/components` by
design. The gap was that its guarantee didn't extend to the bundle as a whole.

**Decision:** add `@source not` exclusions for the test, scripts, and docs
directories in `src/styles/index.css` (verified supported in the installed
tailwindcss 4.3.3). Chose exclusions over a `source(none)` + explicit allowlist,
because an allowlist would silently under-scan `src/components/ui` and
`src/features` once later phases add real files there.

Added `src/test/build-css-vars.test.ts` as a regression test that builds and
inspects the compiled CSS. Bundle went 9.77 kB → 6.27 kB.

---

## 2026-09-15 — Renamed "tokens" to "vars" throughout

**Expected:** the plan's "design token" vocabulary would carry into the code.

**What happened:** the term was ambiguous in practice — "token" collides with
auth tokens and parser tokens, and obscured that these are plain CSS custom
properties.

**Decision (owner):** rename to `vars` across files, scripts, and prose.
`src/styles/vars.css`, `scripts/check-vars.mjs`, `npm run check:vars`, and the
matching tests. The CSS custom properties themselves were already semantic
(`--color-surface`, `--spacing-md`) and needed no change.

**Why it was not just a code change:** the plan's acceptance criteria *name* the
script — DW-1.3, DW-1.4, DW-3.7 and several Test Plan lines. Plan and code had to
land in the same commit, or the review gate would have verified against a stale
criterion.

---

## 2026-09-15 — Per-phase sign-off gate added to the build process

**Expected:** `/code-foundations:build` advances phase to phase automatically on
green gates.

**Decision (owner):** stop after every phase and wait for explicit sign-off after
an owner code review. Automated gates still run first, so each review starts from
a tree that already passed.

---

## Open risk — the `check:vars` current-tree test is vacuously true today

DW-1.4 requires a fixture test proving the guard "passes on the current tree".
`test_DW_1_4_passes_on_current_project_tree` does scan `src/features` and
`src/components` — but both hold only `.gitkeep` right now, so it asserts
"0 violations across 0 files". It passes without proving anything.

The Phase 1 batch reviewer closed the gap by hand: it planted a `bg-red-500`
file under `src/components/ui/`, confirmed the CLI exited 1 with the violation
printed, then removed it and confirmed a clean re-pass. So the guard genuinely
works — but the *checked-in test* won't demonstrate that until real files exist.

**Action:** re-verify this the moment Phase 2 or 3 adds real files under those
directories. DW-3.7 ("`check:vars` passes over the new features") is the natural
place for it to become meaningful.

---

## Open risk — the guard misses Tailwind keyword colors

`TAILWIND_PALETTE_NAMES` in `scripts/check-vars.mjs` lists the 21 chromatic and
gray families, so `bg-red-500` is caught — but Tailwind's static keywords
(`black`, `white`, `transparent`, `current`) are not. `bg-black` and `text-white`
would slip past the guard.

No Phase 1 file uses them, and the DW item's own example is fully covered, so
this is not a defect against anything asked for. But `bg-white` is exactly the
kind of thing that gets typed by reflex when building real components — and it
is precisely the raw-color-in-a-component case the guard exists to prevent,
which would defeat the theming swap.

**Action:** consider adding the keywords to the guard before Phase 3 builds the
first real feature UI.

---

## Open risk — shadcn vocabulary divergence (surfaces at first `shadcn add`)

Not yet a pivot, but it will become one.

This project's semantic names (`surface`, `text`, `accent`) deliberately diverge
from shadcn's built-in vocabulary (`background`, `foreground`, `primary`), which
its registry hard-codes into the source of every component it fetches. Phase 1
added no components, so nothing consumes the divergence yet.

Whichever phase first runs `shadcn add` must either remap the fetched component's
classes onto our names, or add an alias layer in `vars.css`. Phase 3 is the
likely first hit.
