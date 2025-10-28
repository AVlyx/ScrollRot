import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    emptyOutDir: false,
    outDir: "dist",
    rollupOptions: {
      preserveEntrySignatures: "strict",
      input: {
        youtube: resolve(__dirname, "src/content-scripts/youtube.ts"),
        instagram: resolve(__dirname, "src/content-scripts/instagram.ts"),
        tiktok: resolve(__dirname, "src/content-scripts/tiktok.ts"),
      },
      output: {
        format: "es", // Changed from "iife"
        entryFileNames: "content-scripts/[name].js",
        chunkFileNames: "content-scripts/[name].js",
      },
    },
  },
});
