import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { findViolations, scanDirs } from "../../scripts/check-vars.mjs";

describe("check:vars raw-color guard", () => {
  it("test_DW_1_4_flags_raw_palette_utility", () => {
    const violations = findViolations([
      { path: "src/components/Card.tsx", content: '<div className="bg-red-500" />' },
    ]);

    expect(violations).toEqual([
      { file: "src/components/Card.tsx", match: "bg-red-500", rule: "raw-palette-utility" },
    ]);
  });

  it("test_DW_1_4_flags_hex_color", () => {
    const violations = findViolations([
      { path: "src/features/foo/Foo.tsx", content: "const style = { color: '#ff0000' };" },
    ]);

    expect(violations).toEqual([
      { file: "src/features/foo/Foo.tsx", match: "#ff0000", rule: "hex-color" },
    ]);
  });

  it("test_DW_1_4_passes_semantic_only_fixture", () => {
    const violations = findViolations([
      {
        path: "src/components/Card.tsx",
        content: '<div className="bg-surface text-text rounded-[var(--radius)] p-md" />',
      },
    ]);

    expect(violations).toEqual([]);
  });

  it("test_DW_1_4_passes_on_current_project_tree", () => {
    const files = scanDirs(["src/features", "src/components"]);
    const violations = findViolations(files);
    expect(violations).toEqual([]);
  });

  describe("scanDirs filesystem walk", () => {
    let dir: string;

    afterEach(() => {
      if (dir) rmSync(dir, { recursive: true, force: true });
    });

    it("recurses into subdirectories and skips non-scannable extensions", () => {
      dir = mkdtempSync(join(tmpdir(), "check-vars-"));
      const nested = join(dir, "nested");
      writeFileSync(join(dir, "top.tsx"), '<div className="bg-red-500" />');
      writeFileSync(join(dir, "notes.md"), "mentions bg-red-500 in prose, not code");
      mkdirSync(nested);
      writeFileSync(join(nested, "deep.css"), ".x { color: #ff0000; }");

      const files = scanDirs([dir]);
      const violations = findViolations(files);

      expect(files.map((f) => f.path).sort()).toEqual(
        [join(dir, "top.tsx"), join(nested, "deep.css")].sort(),
      );
      expect(violations).toHaveLength(2);
    });

    it("returns no files for a directory that does not exist", () => {
      const files = scanDirs([join(tmpdir(), "check-vars-missing-dir-xyz")]);
      expect(files).toEqual([]);
    });
  });
});
