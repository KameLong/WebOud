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
            },
            devOptions: {
                enabled: false,
            },
        }),
    ],
});
