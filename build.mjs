// build.mjs - Unified build script for Chrome and Firefox
import { build } from "vite";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { readFileSync, writeFileSync, cpSync, mkdirSync, existsSync, rmSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));

const contentScripts = [
  { name: "youtube", input: "src/content-scripts/youtube/youtube.ts" },
  { name: "instagram", input: "src/content-scripts/instagram/instagram.ts" },
  { name: "tiktok", input: "src/content-scripts/tiktok/tiktok.ts" },
  { name: "badge", input: "src/service-workers/badge.ts" },
];

// Get browser from command line arg or default to chrome
const targetBrowser = process.argv[2] || 'chrome';
const outDir = targetBrowser === 'firefox' ? 'distFirefox' : 'distChrome';

console.log(`\n🔨 Building for ${targetBrowser.toUpperCase()}...\n`);

async function buildUI() {
  console.log("📦 Building UI components (popup, options)...");
  await build({
    configFile: resolve(__dirname, "vite.config.ts"),
    build: {
      outDir,
    },
  });
}

async function buildContentScripts() {
  console.log("📦 Building content scripts...");
  
  for (const script of contentScripts) {
    const folder = script.input.split("/")[1];
    try {
      await build({
        configFile: false,
        resolve: {
          alias: {
            "@": resolve(__dirname, "./src"),
          },
        },
        build: {
          outDir: `${outDir}/${folder}`,
          emptyOutDir: false,
          minify: true,
          sourcemap: false,
          copyPublicDir: false,
          lib: {
            entry: resolve(__dirname, script.input),
            formats: ["es"],
            fileName: () => `${script.name}.js`,
          },
        },
      });
    } catch (error) {
      console.error(`❌ Failed to build ${script.name}:`, error);
      process.exit(1);
    }
  }
}

function mergeManifests() {
  console.log(`📝 Creating ${targetBrowser} manifest...`);
  
  // Read base manifest
  const baseManifest = JSON.parse(
    readFileSync(resolve(__dirname, "manifests/manifest.base.json"), "utf-8")
  );
  
  // Read browser-specific manifest
  const browserManifestPath = resolve(__dirname, `manifests/manifest.${targetBrowser}.json`);
  const browserManifest = JSON.parse(
    readFileSync(browserManifestPath, "utf-8")
  );
  
  // Merge manifests (browser-specific overrides base)
  const finalManifest = { ...baseManifest, ...browserManifest };
  
  // Remove the _comment field if it exists
  delete finalManifest._comment;
  
  // Write final manifest
  writeFileSync(
    resolve(__dirname, outDir, "manifest.json"),
    JSON.stringify(finalManifest, null, 2)
  );
  
  console.log(`✅ Manifest created for ${targetBrowser}`);
}

function copyPublicAssets() {
  console.log("📁 Copying public assets...");
  
  const publicDir = resolve(__dirname, "public");
  const assetsSource = resolve(publicDir, "assets");
  const assetsTarget = resolve(__dirname, outDir, "assets");
  
  if (existsSync(assetsSource)) {
    cpSync(assetsSource, assetsTarget, { recursive: true });
  }
  
  console.log("✅ Assets copied");
}

async function buildAll() {
  try {
    // Clean output directory
    if (existsSync(outDir)) {
      console.log(`🧹 Cleaning ${outDir}...`);
      rmSync(outDir, { recursive: true, force: true });
    }
    mkdirSync(outDir, { recursive: true });
    
    // Build all components
    await buildUI();
    await buildContentScripts();
    copyPublicAssets();
    mergeManifests();
    
    console.log(`\n✨ Build complete for ${targetBrowser.toUpperCase()}! Output: ${outDir}\n`);
  } catch (error) {
    console.error("❌ Build failed:", error);
    process.exit(1);
  }
}

buildAll();
