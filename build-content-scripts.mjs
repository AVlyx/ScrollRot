// build-content-scripts.mjs
import { build } from "vite";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const contentScripts = [
  { name: "youtube", input: "src/content-scripts/youtube/youtube.ts" },
  { name: "instagram", input: "src/content-scripts/instagram/instagram.ts" },
  { name: "tiktok", input: "src/content-scripts/tiktok/tiktok.ts" },
];

async function buildAll() {
  for (const script of contentScripts) {
    try {
      await build({
        configFile: false,
        resolve: {
          alias: {
            "@": resolve(__dirname, "./src"),
          },
        },
        build: {
          outDir: "dist/content-scripts",
          emptyOutDir: false, // Don't clear the folder between builds
          minify: false, // Keep readable for debugging
          sourcemap: false,
          copyPublicDir: false,

          lib: {
            entry: resolve(__dirname, script.input),
            formats: ["es"], // ES module format
            fileName: () => `${script.name}.js`,
          },
        },
      });
    } catch (error) {
      console.error(`Failed to build ${script.name}:`, error);
      process.exit(1);
    }
  }
}

buildAll().catch((error) => {
  console.error("Build failed:", error);
  process.exit(1);
});
