/**
 * Raw-color guard: fails when `src/features/**` or `src/components/**` use
 * a raw Tailwind palette utility (e.g. `bg-red-500`) or a literal hex color
 * instead of a semantic var utility from `src/styles/vars.css`.
 *
 * Exposes `findViolations` (pure) for unit tests and a CLI `main()` for
 * `npm run check:vars`.
 */
import { readFileSync, readdirSync } from "node:fs";
import { extname, join } from "node:path";
import { pathToFileURL } from "node:url";

const HEX_COLOR_RE = /#[0-9a-fA-F]{3,8}\b/g;

const TAILWIND_PALETTE_NAMES = [
  "slate",
  "gray",
  "zinc",
  "neutral",
  "stone",
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
];

const UTILITY_PREFIXES = [
  "bg",
  "text",
  "border",
  "ring",
  "from",
  "via",
  "to",
  "fill",
  "stroke",
  "outline",
  "decoration",
  "accent",
  "caret",
  "shadow",
  "divide",
  "placeholder",
];

export const RAW_UTILITY_RE = new RegExp(
  `\\b(?:${UTILITY_PREFIXES.join("|")})-(?:${TAILWIND_PALETTE_NAMES.join("|")})-\\d{2,3}\\b`,
  "g",
);

const SCAN_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".css"]);

/**
 * @param {{ path: string, content: string }[]} files
 * @returns {{ file: string, match: string, rule: "hex-color" | "raw-palette-utility" }[]}
 */
export function findViolations(files) {
  const violations = [];
  for (const { path, content } of files) {
    for (const match of content.matchAll(HEX_COLOR_RE)) {
      violations.push({ file: path, match: match[0], rule: "hex-color" });
    }
    for (const match of content.matchAll(RAW_UTILITY_RE)) {
      violations.push({ file: path, match: match[0], rule: "raw-palette-utility" });
    }
  }
  return violations;
}

function walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries.flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return SCAN_EXTENSIONS.has(extname(entry.name)) ? [full] : [];
  });
}

/** @param {string[]} dirs */
export function scanDirs(dirs) {
  return dirs.flatMap((dir) =>
    walk(dir).map((path) => ({ path, content: readFileSync(path, "utf8") })),
  );
}

function main() {
  const targets = ["src/features", "src/components"];
  const files = scanDirs(targets);
  const violations = findViolations(files);

  if (violations.length > 0) {
    console.error(`check:vars found ${violations.length} violation(s):`);
    for (const v of violations) {
      console.error(`  ${v.file}: "${v.match}" (${v.rule})`);
    }
    process.exit(1);
  }

  console.log(`check:vars passed (${files.length} file(s) scanned, 0 violations).`);
}

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  main();
}
