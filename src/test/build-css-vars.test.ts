// @vitest-environment node
//
// Same rationale as build-output.test.ts: this exercises the real build
// pipeline (Vite + the Tailwind plugin's content scan), not the DOM, so it
// opts back into the plain Node environment.
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { build } from "vite";
import { describe, expect, it } from "vitest";
import { RAW_UTILITY_RE } from "../../scripts/check-vars.mjs";

function readBuiltCss(): string {
  const assetsDir = resolve("dist/assets");
  const cssFile = readdirSync(assetsDir).find((f) => f.endsWith(".css"));
  if (!cssFile) throw new Error(`No CSS file found in ${assetsDir}`);
  return readFileSync(resolve(assetsDir, cssFile), "utf8");
}

describe("DW-1.4 production CSS bundle stays free of raw palette utilities", () => {
  it(
    "test_DW_1_4_build_output_has_no_raw_palette_utility",
    async () => {
      await build({ logLevel: "silent" });
      const css = readBuiltCss();

      // Regression: Tailwind's default (unscoped) content scan used to pick
      // up the literal "bg-red-500" string from test fixtures (e.g.
      // check-vars.test.ts) and scripts/docs comments, emitting a dead
      // `.bg-red-500` rule + `--color-red-500` custom property into the
      // shipped bundle even though no shell component uses it.
      expect([...css.matchAll(RAW_UTILITY_RE)]).toEqual([]);
      expect(css).not.toContain("red-500");
    },
    30_000,
  );
});
