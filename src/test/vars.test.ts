import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const VARS_CSS_PATH = "src/styles/vars.css";

const EXPECTED_VARS = [
  "--color-surface",
  "--color-surface-raised",
  "--color-text",
  "--color-text-muted",
  "--color-accent",
  "--color-accent-contrast",
  "--color-border",
  "--radius",
  "--spacing-xs",
  "--spacing-sm",
  "--spacing-md",
  "--spacing-lg",
  "--spacing-xl",
];

function readThemeBlock(css: string): string {
  const match = css.match(/@theme\s*\{([\s\S]*?)\}/);
  if (!match) throw new Error("No @theme block found in vars.css");
  return match[1];
}

describe("vars.css", () => {
  const css = readFileSync(VARS_CSS_PATH, "utf8");

  it("test_DW_1_3_theme_block_declares_every_semantic_var", () => {
    const themeBlock = readThemeBlock(css);

    for (const cssVar of EXPECTED_VARS) {
      expect(themeBlock).toMatch(new RegExp(`${cssVar}\\s*:`));
    }
  });

  it("test_DW_1_3_uses_tailwind_theme_directive", () => {
    expect(css).toContain("@theme");
  });

  it("declares light values only (no [data-theme=\"dark\"] block yet)", () => {
    const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(withoutComments).not.toContain("data-theme");
  });
});
