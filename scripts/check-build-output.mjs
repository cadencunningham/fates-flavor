/**
 * Verifies `dist/index.html` (produced by `npm run build`) only references
 * local assets under the GitHub Pages base path `/fates-flavor/`.
 * Run as its own CI step after the build (see .github/workflows/deploy.yml).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const BASE_PATH = "/fates-flavor/";

/** @param {string} html */
export function findBadAssetUrls(html) {
  const urls = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((url) => url.startsWith("/"));
  return { urls, bad: urls.filter((url) => !url.startsWith(BASE_PATH)) };
}

function main() {
  const distIndexPath = resolve("dist/index.html");
  let html;
  try {
    html = readFileSync(distIndexPath, "utf8");
  } catch {
    console.error(`Could not read ${distIndexPath} — did "npm run build" run first?`);
    process.exit(1);
    return;
  }

  const { urls, bad } = findBadAssetUrls(html);

  if (urls.length === 0) {
    console.error("No local asset URLs found in dist/index.html — build may have failed.");
    process.exit(1);
    return;
  }
  if (bad.length > 0) {
    console.error(`Asset URL(s) not prefixed with "${BASE_PATH}":`, bad);
    process.exit(1);
    return;
  }

  console.log(`All ${urls.length} local asset URL(s) correctly prefixed with "${BASE_PATH}".`);
}

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  main();
}
