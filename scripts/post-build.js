import { copyFile, mkdir } from "fs/promises";
import { resolve } from "path";

const srcDir = resolve("public");
const distDir = resolve("dist");

async function copyAssets() {
  try {
    // 確保目標目錄存在
    await mkdir(resolve(distDir, "icons"), { recursive: true });

    // 複製 manifest.json
    await copyFile(resolve("manifest.json"), resolve(distDir, "manifest.json"));

    // 複製圖標
    const icons = ["16", "48", "128"];
    for (const size of icons) {
      await copyFile(resolve(srcDir, "icons", `icon${size}.png`), resolve(distDir, "icons", `icon${size}.png`));
    }
  } catch (error) {
    console.error("Error copying assets:", error);
    process.exit(1);
  }
}

copyAssets();
