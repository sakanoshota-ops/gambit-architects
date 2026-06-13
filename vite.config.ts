import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL("./package.json", import.meta.url)), "utf-8"),
) as { version: string };

export default defineConfig({
  define: {
    // M4-B：バージョン番号をビルド時に埋め込み
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    tailwindcss(),
    /**
     * M4-A：PWA 化
     * - registerType: "autoUpdate" でユーザーに更新通知なしで service worker を差し替え
     * - workbox の precache に dist 内の静的ファイルを全部含める
     * - manifest は標準（name、theme_color、icons 各サイズ、display: standalone）
     */
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.svg",
        "icon.svg",
        "maskable-icon.svg",
        "apple-touch-icon.png",
      ],
      manifest: {
        name: "Gambit Architects",
        short_name: "Gambit",
        description:
          "条件→対象→行動のルールを組んで AI 同士に戦わせる、FF12 ガンビット型オートバトル × プログラミング・サンドボックス。",
        theme_color: "#0f172a",
        background_color: "#f8fafc",
        display: "standalone",
        orientation: "any",
        scope: "/",
        start_url: "/",
        lang: "ja",
        categories: ["games", "strategy", "education"],
        icons: [
          {
            src: "icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "maskable-icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        cleanupOutdatedCaches: true,
      },
      // 開発時にも service worker を動かしたい場合は true。デフォルト false で OK
      devOptions: {
        enabled: false,
      },
    }),
  ],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: false,
  },
});
