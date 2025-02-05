import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    emptyOutDir: true,
    outDir: "dist",
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "src/popup/popup.html"),
        content: resolve(__dirname, "src/scripts/content.ts"),
      },
      preserveEntrySignatures: "strict",
      output: {
        entryFileNames: (chunkInfo) => {
          return chunkInfo.name === "content" ? "[name].js" : "src/popup/[name].js";
        },
        chunkFileNames: "scripts/[name].[hash].js",
        assetFileNames: () => {
          return "src/popup/[name][extname]";
        },
      },
    },
  },
});
