import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "src/popupPage/index.html"),
        options: resolve(__dirname, "src/optionsPage/index.html"),
        instagram: resolve(__dirname, "src/content-scripts/instagram.ts"),
        youtube: resolve(__dirname, "src/content-scripts/youtube.ts"),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          const id = chunkInfo.facadeModuleId;
          if (id && id.includes("content-scripts")) {
            return "content-scripts/[name].js";
          }
          if (id && id.includes("background")) {
            return "background/[name].js";
          }
          return "assets/[name].js";
        },
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name].[ext]",
      },
    },
    outDir: "dist",
  },
});
