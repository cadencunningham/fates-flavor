// @vitest-environment node
//
// Vite bundles esbuild, whose startup invariant check breaks under jsdom's
// globals (it patches TextEncoder). This file only exercises the build
// pipeline — no DOM needed — so it opts back into the plain Node environment.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { build, createServer } from "vite";
import { describe, expect, it } from "vitest";
import { BASE_PATH, findBadAssetUrls } from "../../scripts/check-build-output.mjs";

describe("DW-1.1 build and dev server", () => {
  it(
    "test_DW_1_1_build_emits_base_prefixed_assets",
    async () => {
      await build({ logLevel: "silent" });

      const html = readFileSync(resolve("dist/index.html"), "utf8");
      const { urls, bad } = findBadAssetUrls(html);

      expect(urls.length).toBeGreaterThan(0);
      expect(bad).toEqual([]);
      for (const url of urls) {
        expect(url.startsWith(BASE_PATH)).toBe(true);
      }
    },
    30_000,
  );

  it(
    "test_DW_1_1_dev_server_serves_shell",
    async () => {
      // Vite treats `port: 0` as falsy and falls back to its default (5173)
      // rather than asking the OS for an ephemeral port, so pick an
      // unlikely-to-collide fixed port instead and fail loudly if it's taken.
      const port = 5199;
      const server = await createServer({
        server: { port, strictPort: true, host: "127.0.0.1" },
      });
      try {
        await server.listen();

        const res = await fetch(`http://127.0.0.1:${port}${BASE_PATH}`);
        const html = await res.text();

        expect(res.status).toBe(200);
        expect(html).toContain('id="root"');
        expect(html).toContain("Fate's Flavor");
      } finally {
        await server.close();
      }
    },
    30_000,
  );
});
