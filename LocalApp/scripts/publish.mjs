// ビルド済みの dist フォルダを公開先へコピーします（npm run publish から呼ばれる）。
import { cpSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** 公開先フォルダ */
const DEST = "/Volumes/share/www/WebOud/LocalApp/dist";

const src = resolve(dirname(fileURLToPath(import.meta.url)), "..", "dist");
if (!existsSync(src)) {
    console.error(`dist が見つかりません: ${src}`);
    process.exit(1);
}

cpSync(src, DEST, { recursive: true, force: true });
console.log(`コピーしました: ${src} -> ${DEST}`);
