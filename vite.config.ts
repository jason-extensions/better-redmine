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
        popup: "./index.html",
        content: "src/scripts/content.ts",
        background: "src/scripts/background.ts",
      },
      output: {
        // 入口檔案命名
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === "content") {
            return "content.js";
          }
          if (chunkInfo.name === "background") {
            return "background.js";
          }
          if (chunkInfo.name === "contentInject") {
            return "inject.js";
          }
          return "popup/[name].js";
        },
        // 非入口 chunk 檔案命名
        chunkFileNames: "scripts/[name].js",
        // 靜態資源檔案命名
        assetFileNames: "popup/[name][extname]",
      },
    },
  },
});
