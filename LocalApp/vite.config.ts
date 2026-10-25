import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
    server: {
        host: '0.0.0.0', // または true でも可
    },
    plugins: [
        react(),
        VitePWA({
            registerType: "autoUpdate",
            includeAssets: ["icons/apple-touch-icon.png", "font/*"],
            manifest: {
                name: "WebOud Local",
                short_name: "WebOud",
                description: "オフラインで使える運行ダイヤ作成ソフト（データは端末内保存）",
                start_url: "/",
                scope: "/",
                display: "standalone",
                background_color: "#0f5b8a",
                theme_color: "#0f5b8a",
                lang: "ja",
                icons: [
                    { src: "/icons/pwa-192x192.png", sizes: "192x192", type: "image/png" },
                    { src: "/icons/pwa-512x512.png", sizes: "512x512", type: "image/png" },
                    { src: "/icons/maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
                ],
            },
            workbox: {
                globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2,ttf,otf}"],
                // PDF出力用の日本語フォント(合計約4MB)は、最初から保存せず、PDFを初めて作ったときに保存する（下のruntimeCaching）
                globIgnores: ["pdf-font/**"],
                runtimeCaching: [
                    {
                        // PDF出力用のフォントと、フォントを必要な文字だけに絞るwasm。一度読み込めば、以後はオフラインでもPDFを作れる
                        urlPattern: ({ url }) => url.pathname.includes("/pdf-font/") || url.pathname.endsWith(".wasm"),
                        handler: "CacheFirst",
                        options: {
                            cacheName: "pdf-assets",
                            expiration: { maxEntries: 8 },
                            cacheableResponse: { statuses: [0, 200] },
                        },
                    },
                    {
                        // サンプルダイヤ（約1.4MB）。最初から保存せず、一度読み込んだあとはオフラインでも使えるようにする
                        urlPattern: ({ url }) => url.pathname.includes("/sample/"),
                        handler: "CacheFirst",
                        options: {
                            cacheName: "sample-data",
                            expiration: { maxEntries: 4 },
                            cacheableResponse: { statuses: [0, 200] },
                        },
                    },
                ],
            },
            devOptions: {
                enabled: false,
            },
        }),
    ],
});
